// GIST live-gist endpoint (see the GIST project: C:\Users\djhub\Gist).
// The web app at /gist/ posts a rolling Spanish transcript window here; we call
// the Anthropic API with structured outputs and return the gist JSON verbatim.
//
// Runs as a Cloudflare Pages Function (Workers runtime) — deliberately
// dependency-free like the rest of this repo, so it uses raw fetch against the
// Messages API rather than the SDK. The canonical copy of the system prompt
// lives in the GIST repo at server/prompts/gist-system.md — keep them in sync.
//
// Config (Pages project settings / wrangler secrets):
//   ANTHROPIC_API_KEY  (secret, required)
//   GIST_MODEL         (optional, default claude-haiku-4-5)

const SYSTEM_PROMPT = `You are the gist engine for GIST, a live conversation-assist app. The user is an English-native speaker with intermediate (B1–B2) Spanish, in the middle of a live, real-world conversation conducted in Spanish. They often work in professional real-estate contexts (financing, remodeling, contracts, neighborhoods), but you must infer the actual domain from the transcript — do not assume real estate if the transcript says otherwise.

You receive a rolling transcript window (roughly the last 90 seconds of speech, machine-transcribed so expect transcription errors), plus lists of vocabulary and phrases already shown to the user this session.

The speakers may switch back and forth between Spanish and English (code-switching) — the transcript can contain both languages. Treat the English portions as context for understanding the conversation. Your output stays focused on the Spanish side: vocab the user needs to follow the Spanish being spoken, and Spanish phrases the user could say next — including natural Spanish versions of things just discussed in English, when the user might want to say them in Spanish.

Your job, each call:

1. **topic** — a short label for what the conversation is about right now, in both English and Spanish (e.g. "Financing" / "Financiamiento"). Keep each under ~4 words.
2. **confidence** — low/medium/high: how confident you are in the topic given the transcript quality and length.
3. **vocab** (6–10 items) — Spanish terms an intermediate learner likely needs for THIS conversation. Prefer words actually present in the transcript, plus closely adjacent domain vocabulary. For each: the Spanish term, a concise English gloss, part of speech, and a note when genuinely useful (regionalism — flag Mexican/regional usage; false friend; or, for verbs heard in a conjugated form, show the heard form AND the infinitive, e.g. "heard 'remodelaron' — from remodelar"). Set note to null when there is nothing worth saying.
4. **phrases** (4–6 items) — natural, ready-to-say Spanish phrases the USER could plausibly say next in this conversation — questions to ask, responses to give. They must be things the user (not the other parties) would say, register-appropriate (note usted vs. tú when it matters), and short enough to say from a glance. Include an English gloss and a simple English pronunciation respelling (e.g. "¿Cuál es la tasa de interés?" → "KWAL es la TAH-sah deh een-teh-RES").
5. **heard_terms** (2–4 items) — words actually spoken in this window that an intermediate learner likely doesn't know, with a short English meaning. These must appear in the transcript.

Rules:
- NEVER repeat anything in the already-shown vocab or phrase lists. If a category would be all repeats, return fewer items rather than repeating.
- Everything must be useful at a glance mid-conversation: concise glosses, no lecture-style explanations.
- The transcript is noisy. If a word looks like a mis-transcription of a plausible Spanish word, work with the plausible word.
- If the transcript window is too thin to judge the topic, keep the previous topic feel generic (e.g. "General conversation" / "Conversación general") and set confidence to low.`;

const GIST_SCHEMA = {
  type: "object",
  properties: {
    topic: {
      type: "object",
      properties: { en: { type: "string" }, es: { type: "string" } },
      required: ["en", "es"],
      additionalProperties: false,
    },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    vocab: {
      type: "array",
      items: {
        type: "object",
        properties: {
          es: { type: "string" },
          en: { type: "string" },
          pos: { type: "string" },
          note: { anyOf: [{ type: "string" }, { type: "null" }] },
        },
        required: ["es", "en", "pos", "note"],
        additionalProperties: false,
      },
    },
    phrases: {
      type: "array",
      items: {
        type: "object",
        properties: {
          es: { type: "string" },
          en: { type: "string" },
          pronunciation: { anyOf: [{ type: "string" }, { type: "null" }] },
        },
        required: ["es", "en", "pronunciation"],
        additionalProperties: false,
      },
    },
    heard_terms: {
      type: "array",
      items: {
        type: "object",
        properties: { es: { type: "string" }, en: { type: "string" } },
        required: ["es", "en"],
        additionalProperties: false,
      },
    },
  },
  required: ["topic", "confidence", "vocab", "phrases", "heard_terms"],
  additionalProperties: false,
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });

export async function onRequestPost({ request, env }) {
  // Cheap same-site gate: browsers send Origin/Referer on fetch POSTs; this
  // keeps drive-by scanners and bare curl off the (paid) upstream API. Not
  // real auth — just cost hygiene for a personal test deployment.
  const from =
    (request.headers.get("Origin") || "") + (request.headers.get("Referer") || "");
  if (!/nuzz\.pet|good-boy-4mx\.pages\.dev|localhost/.test(from)) {
    return json({ error: "forbidden" }, 403);
  }

  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: "server not configured" }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }

  const transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";
  if (!transcript) return json({ error: "transcript required" }, 400);
  if (transcript.length > 8000) return json({ error: "transcript too long" }, 400);

  const asStringList = (v) =>
    Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 300) : [];
  const vocabSeen = asStringList(body.vocabSeen);
  const phrasesSeen = asStringList(body.phrasesSeen);

  const seen =
    vocabSeen.length || phrasesSeen.length
      ? `\n\nAlready shown this session (do NOT repeat):\nVocab: ${
          vocabSeen.join(", ") || "(none)"
        }\nPhrases: ${phrasesSeen.join(" | ") || "(none)"}`
      : "";
  const userMessage = `Rolling transcript window (Spanish, machine-transcribed):\n"""\n${transcript}\n"""${seen}`;

  const apiRequest = {
    model: env.GIST_MODEL || "claude-haiku-4-5",
    max_tokens: 2048,
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: userMessage }],
    output_config: { format: { type: "json_schema", schema: GIST_SCHEMA } },
  };

  const callOnce = () =>
    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(apiRequest),
    });

  try {
    let res = await callOnce();
    if (!res.ok && res.status >= 500) res = await callOnce(); // one retry
    if (!res.ok) {
      console.log("gist upstream error", res.status, await res.text());
      // 500, not 502: Cloudflare masks 502/504 responses on custom domains
      // with its own error page, hiding the JSON body from the client.
      return json({ error: "gist generation failed", upstream: res.status }, 500);
    }
    const data = await res.json();
    if (data.stop_reason === "refusal") {
      return json({ error: "gist generation refused" }, 502);
    }
    const text = (data.content || []).find((b) => b.type === "text")?.text;
    if (!text) return json({ error: "empty gist response" }, 502);
    // Structured outputs guarantee the shape; parse defensively anyway.
    let gist;
    try {
      gist = JSON.parse(text);
    } catch {
      return json({ error: "unparseable gist response" }, 502);
    }
    return json(gist);
  } catch (err) {
    console.log("gist error", String(err));
    return json({ error: "gist generation failed" }, 500);
  }
}
