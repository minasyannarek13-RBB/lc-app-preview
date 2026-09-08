import fs from "node:fs";
import assert from "node:assert/strict";

const sql = fs.readFileSync(new URL("../supabase/migrations/202609080024_attributable_return_integrity.sql", import.meta.url), "utf8");

assert.match(sql, /new\.event_name = 'schedule_reminder'[\s\S]*session_status <> 'scheduled'/, "reminders must stay scheduled-only");
assert.match(sql, /new\.event_name in \('live_session_open', 'handoff_intent'\)[\s\S]*session_status <> 'live'/, "live intent must be live-only");
assert.match(sql, /new\.event_name = 'handoff_return' and not exists/, "return must require prior evidence");
assert.match(sql, /prior\.event_name = 'handoff_intent'/, "return must anchor to handoff intent");
assert.match(sql, /prior\.journey_id = new\.journey_id/, "return must stay in the same journey");
assert.match(sql, /prior\.creator_id = new\.creator_id/, "return must match Creator");
assert.match(sql, /prior\.creator_session_id = new\.creator_session_id/, "return must match session");
assert.match(sql, /interval '30 days'/, "return attribution must be time bounded");
assert.doesNotMatch(sql, /handoff_return'[\s\S]{0,250}session_visibility <> 'public'/, "historical return must not depend on current session visibility");
assert.match(sql, /'wallet'[\s\S]*'payment_method'/, "regulated/payment metadata guard must remain");

console.log("attributable return integrity contract: PASS");
