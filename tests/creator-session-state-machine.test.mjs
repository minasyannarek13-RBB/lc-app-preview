import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/202609080021_creator_session_state_machine.sql", import.meta.url),
  "utf8"
);
const app = readFileSync(new URL("../app-product.js", import.meta.url), "utf8");

assert.match(migration, /new Creator sessions must start as scheduled/);
assert.match(migration, /old\.status = 'scheduled'[\s\S]+new\.status in \('scheduled', 'live', 'cancelled'\)/);
assert.match(migration, /old\.status = 'live'[\s\S]+new\.status in \('live', 'completed', 'cancelled'\)/);
assert.match(migration, /old\.status = 'completed' and new\.status = 'completed'/);
assert.match(migration, /old\.status = 'cancelled' and new\.status = 'cancelled'/);
assert.match(migration, /new\.status in \('completed', 'cancelled'\)[\s\S]+new\.visibility := 'private'/);
assert.match(migration, /new\.status = 'live'[\s\S]+new\.visibility <> 'public'/);
assert.match(migration, /not public\.is_approved_creator\(new\.creator_id\)/);
assert.match(migration, /delete from public\.return_signals[\s\S]+session_id = new\.id/);
assert.match(migration, /security definer[\s\S]+remove_ineligible_creator_live_return_signals/);
assert.match(migration, /revoke all on function public\.remove_ineligible_creator_live_return_signals\(\) from public, anon, authenticated/);

assert.match(app, /const allowedTransitions = \{/);
assert.match(app, /scheduled: new Set\(\["scheduled", "live", "cancelled"\]\)/);
assert.match(app, /completed: new Set\(\["completed"\]\)/);
assert.match(app, /throw new Error\("invalid_transition"\)/);
assert.match(app, /\["completed", "cancelled"\]\.includes\(changes\.status\)[\s\S]+visibility: "private"/);

console.log("creator session state machine contract: PASS");
