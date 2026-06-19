-- Rebuild the global community counters from the raw events log.
-- Idempotent: every run_end beacon stores its saved/lost/ufos in the data JSON, so re-running
-- this recomputes the authoritative totals (overwrite, not add — no double counting).
-- Apply with:  npx wrangler d1 execute nuzz_analytics --remote --file tools/backfill-counters.sql

CREATE TABLE IF NOT EXISTS counters (
  name  TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0
);

INSERT INTO counters(name, value)
  SELECT 'animals_saved', COALESCE(SUM(CAST(json_extract(data,'$.saved') AS INTEGER)), 0)
  FROM events WHERE ev='run_end' AND json_extract(data,'$.level')='aliens-proto'
ON CONFLICT(name) DO UPDATE SET value=excluded.value;

INSERT INTO counters(name, value)
  SELECT 'animals_lost', COALESCE(SUM(CAST(json_extract(data,'$.lost') AS INTEGER)), 0)
  FROM events WHERE ev='run_end' AND json_extract(data,'$.level')='aliens-proto'
ON CONFLICT(name) DO UPDATE SET value=excluded.value;

INSERT INTO counters(name, value)
  SELECT 'ufos_repelled', COALESCE(SUM(CAST(json_extract(data,'$.ufos') AS INTEGER)), 0)
  FROM events WHERE ev='run_end' AND json_extract(data,'$.level')='aliens-proto'
ON CONFLICT(name) DO UPDATE SET value=excluded.value;

INSERT INTO counters(name, value)
  SELECT 'alien_runs', COUNT(*)
  FROM events WHERE ev='run_end' AND json_extract(data,'$.level')='aliens-proto'
ON CONFLICT(name) DO UPDATE SET value=excluded.value;

INSERT INTO counters(name, value)
  SELECT 'nuzz_runs', COUNT(*)
  FROM events WHERE ev='run_end' AND json_extract(data,'$.level') IN ('dog','nest','panda')
ON CONFLICT(name) DO UPDATE SET value=excluded.value;
