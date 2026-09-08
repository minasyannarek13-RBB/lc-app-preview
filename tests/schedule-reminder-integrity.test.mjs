import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/202609080023_schedule_reminder_integrity.sql", import.meta.url),
  "utf8"
);
const app = readFileSync(new URL("../app-product.js", import.meta.url), "utf8");

assert.match(migration, /can_set_creator_session_reminder/);
assert.match(migration, /cs\.status = 'scheduled'/);
assert.match(migration, /cs\.visibility = 'public'/);
assert.match(migration, /cs\.starts_at > now\(\)/);
assert.match(migration, /public\.is_approved_creator\(cs\.creator_id\)/);
assert.match(migration, /not public\.is_blocked_pair\(target_user_id, cs\.creator_id\)/);
assert.match(migration, /status = 'active'[\s\S]+can_set_creator_session_reminder\(user_id, session_id\)/);
assert.match(migration, /player_session_reminders_select_own[\s\S]+using \(public\.can_set_creator_session_reminder\(user_id, session_id\)\)/);
assert.match(migration, /remove_ineligible_creator_session_reminders/);
assert.match(migration, /old\.starts_at is distinct from new\.starts_at/);
assert.match(migration, /after update of status, visibility, starts_at/);
assert.match(migration, /delete from public\.player_session_reminders r[\s\S]+using public\.creator_sessions cs/);

assert.match(app, /function savedScheduleEntries\(\)/);
assert.match(app, /function renderSavedSchedule\(\)/);
assert.match(app, /<h2>My schedule<\/h2>/);
assert.match(app, /push, email and SMS are not enabled/);
assert.match(app, /s\.status === "scheduled"[\s\S]+data-lc-reminder/);
assert.match(app, /found\.session\.status !== "scheduled"/);
assert.match(app, /new Date\(starts\)\.getTime\(\) <= Date\.now\(\)/);
assert.match(app, /const localDateTimeInput = \(date\)/);
assert.match(app, /next\.status === "live" \? "Watch live" : "View schedule"/);
assert.match(app, /if \(session\.status !== "live"\) return renderMissing\("Handoff unavailable"|if \(session\.status !== "live"\) return renderMissing\("Session not Live"/);
assert.match(app, /isLive \? `<button[\s\S]+data-lc-product="handoff"[\s\S]+data-lc-reminder/);

console.log("schedule reminder integrity contract: PASS");
