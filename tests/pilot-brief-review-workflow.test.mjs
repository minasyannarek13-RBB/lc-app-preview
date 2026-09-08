import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const base = readFileSync(new URL("../supabase/migrations/202609080018_pilot_measurement_briefs.sql", import.meta.url), "utf8");
const fix = readFileSync(new URL("../supabase/migrations/202609080019_pilot_brief_review_workflow.sql", import.meta.url), "utf8");

assert.match(base, /status in \('draft', 'submitted', 'under_review', 'approved', 'rejected'\)/);
assert.match(fix, /create or replace function public\.protect_pilot_measurement_brief\(\)/);
assert.match(fix, /if auth\.role\(\) = 'service_role' then\s+return new;/);
assert.ok(
  fix.indexOf("auth.role() = 'service_role'") < fix.indexOf("old.status <> 'draft'"),
  "service-role bypass must run before owner transition restrictions"
);
assert.match(fix, /old\.status <> 'draft'/);
assert.match(fix, /new\.status not in \('draft', 'submitted'\)/);
assert.match(fix, /revoke all on function public\.protect_pilot_measurement_brief\(\) from public, anon, authenticated/);
assert.doesNotMatch(fix, /grant execute/i);

console.log("pilot brief privileged review contract: PASS");
