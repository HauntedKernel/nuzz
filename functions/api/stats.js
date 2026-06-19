// Public global community counters → GET /api/stats
// Returns the live counters table as a flat JSON object, e.g.
//   { "animals_saved": 4212, "ufos_repelled": 980, "alien_runs": 530, "nuzz_runs": 8800 }
// Cached briefly at the edge so a busy end-screen doesn't hammer D1. Never throws to the caller.

export async function onRequestGet(context) {
  const { env } = context;
  const out = {};
  try {
    const rows = await env.DB.prepare('SELECT name, value FROM counters').all();
    for (const r of (rows.results || [])) out[r.name] = r.value;
  } catch (e) {
    // missing table / transient D1 error → just return what we have (possibly {})
  }
  return new Response(JSON.stringify(out), {
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, max-age=10',
      'access-control-allow-origin': '*'
    }
  });
}
