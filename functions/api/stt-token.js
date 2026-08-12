// Mints a short-lived Deepgram access token for the GIST app (/gist/), so the
// browser can stream mic audio directly to Deepgram's WebSocket without the
// API key ever reaching the client.
//
// Config: DEEPGRAM_API_KEY (Pages secret). If unset, returns 404 and the app
// falls back to the browser's Web Speech API tier.

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });

export async function onRequestPost({ request, env }) {
  const from =
    (request.headers.get("Origin") || "") + (request.headers.get("Referer") || "");
  if (!/nuzz\.pet|good-boy-4mx\.pages\.dev|localhost/.test(from)) {
    return json({ error: "forbidden" }, 403);
  }

  if (!env.DEEPGRAM_API_KEY) {
    return json({ error: "stt not configured" }, 404);
  }

  try {
    const res = await fetch("https://api.deepgram.com/v1/auth/grant", {
      method: "POST",
      headers: {
        Authorization: `Token ${env.DEEPGRAM_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ ttl_seconds: 30 }),
    });
    if (!res.ok) {
      console.log("deepgram grant failed", res.status, await res.text());
      return json({ error: "stt authorization failed" }, 500);
    }
    const data = await res.json();
    return json({ token: data.access_token });
  } catch (err) {
    console.log("stt-token error", String(err));
    return json({ error: "stt authorization failed" }, 500);
  }
}
