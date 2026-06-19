// Anonymous gameplay event sink → D1. Privacy-first: random client id, no PII, no IP stored.
// Receives sendBeacon POSTs from the game (see track() in index.html) and inserts one row.
// It must NEVER throw in a way that surfaces to the player — always return 204.

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const b = await request.json();
    if (!b || typeof b.ev !== 'string') return new Response(null, { status: 204 });

    const num = (v) => (Number.isFinite(v) ? Math.trunc(v) : null);
    const str = (v, n) => (v == null ? null : String(v).slice(0, n));

    const ev      = str(b.ev, 32);
    const aid     = str(b.aid, 40);
    const reached = num(b.reached);
    const result  = str(b.result, 16);
    const banked  = num(b.banked);
    const country = request.headers.get('cf-ipcountry') || null;   // geo, server-side, no IP kept
    const data    = JSON.stringify(b).slice(0, 1000);

    await env.DB.prepare(
      'INSERT INTO events (ts, aid, ev, reached, result, banked, country, data) VALUES (?,?,?,?,?,?,?,?)'
    ).bind(Date.now(), aid, ev, reached, result, banked, country, data).run();

    // Global community counters: the game sends inc:{name:delta,...}. We only apply names on the
    // allowlist and clamp each delta, so a tampered beacon can't invent counters or spike them.
    // (counters is a live cache; it can be re-derived from events — see tools/schema.sql.)
    if (b.inc && typeof b.inc === 'object') {
      const ALLOW = new Set(['animals_saved','animals_lost','ufos_repelled','alien_runs','nuzz_runs']);
      for (const k of Object.keys(b.inc)) {
        if (!ALLOW.has(k)) continue;
        const d = Math.max(0, Math.min(1000, Math.trunc(Number(b.inc[k]) || 0)));
        if (!d) continue;
        await env.DB.prepare(
          'INSERT INTO counters (name, value) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET value = value + excluded.value'
        ).bind(k, d).run();
      }
    }
  } catch (e) {
    // swallow — a dropped analytics beacon must not affect anyone playing
  }
  return new Response(null, { status: 204 });
}

// Health check: GET /api/e -> "ok"
export async function onRequestGet() {
  return new Response('ok', { status: 200, headers: { 'content-type': 'text/plain' } });
}
