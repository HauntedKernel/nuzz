CREATE TABLE IF NOT EXISTS events (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  ts      INTEGER NOT NULL,   -- server epoch ms
  aid     TEXT,               -- anonymous client id (localStorage nuzz:aid)
  ev      TEXT NOT NULL,      -- 'start' | 'course' | 'run_end'
  reached INTEGER,            -- hurdles reached (run_end)
  result  TEXT,               -- 'finish' | 'fail' (run_end)
  banked  INTEGER,            -- stamina banked from cuddle (course / run_end)
  country TEXT,               -- cf-ipcountry, server-derived
  data    TEXT                -- full JSON payload
);
CREATE INDEX IF NOT EXISTS idx_ev_ts ON events(ev, ts);
CREATE INDEX IF NOT EXISTS idx_aid ON events(aid);

-- Global community counters (the "saved worldwide" numbers). A live cache, incremented by
-- /api/e from inc:{...} beacons and read by /api/stats. It can be fully re-derived from the
-- events table at any time (see tools/backfill-counters.sql), so it's safe to wipe/rebuild.
CREATE TABLE IF NOT EXISTS counters (
  name  TEXT PRIMARY KEY,       -- 'animals_saved' | 'animals_lost' | 'ufos_repelled' | 'alien_runs' | 'nuzz_runs'
  value INTEGER NOT NULL DEFAULT 0
);
