import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/202609080022_product_event_context_guard.sql", import.meta.url),
  "utf8"
);

assert.match(migration, /not public\.is_approved_creator\(new\.creator_id\)/);
assert.match(migration, /public\.user_blocks[\s\S]+blocker_id = new\.user_id[\s\S]+blocked_id = new\.creator_id/);
assert.match(migration, /session_creator <> new\.creator_id/);
assert.match(migration, /session_visibility <> 'public'/);
assert.match(migration, /session_status not in \('scheduled', 'live'\)/);
assert.match(migration, /'handoff_return', 'notification_response'[\s\S]+new\.creator_id is null/);
assert.match(migration, /'handoff_return', 'notification_response'[\s\S]+new\.creator_session_id is null/);
assert.match(migration, /new\.metadata \?\| array\[[\s\S]+'wallet'[\s\S]+'kyc'[\s\S]+'wager'[\s\S]+'payment_method'/);
assert.match(migration, /security definer/);
assert.match(migration, /revoke all on function public\.enforce_product_event_context\(\) from public, anon, authenticated/);
assert.match(migration, /before insert or update of creator_id, creator_session_id, event_name, metadata/);

console.log("product event context guard contract: PASS");
