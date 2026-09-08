import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const auth = readFileSync(new URL("../auth.js", import.meta.url), "utf8");
const nested = readFileSync(new URL("../LC_App_GitHub_Pages_Upload/auth.js", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/202609080016_account_deletion_requests.sql", import.meta.url), "utf8");

assert.equal(auth, nested, "root and deployed auth modules must stay synchronized");
assert.match(auth, /from\("account_deletion_requests"\)[\s\S]+\.eq\("user_id", STATE\.session\.user\.id\)/);
assert.match(auth, /data-auth-form="deletion-request"/);
assert.match(auth, /deletion_confirmation[\s\S]+!== "DELETE"/);
assert.match(auth, /status: "cancelled", cancelled_at: new Date\(\)\.toISOString\(\)/);
assert.match(auth, /It does not immediately delete your account/);
assert.match(migration, /alter table public\.account_deletion_requests enable row level security/);
assert.match(migration, /auth\.uid\(\) = user_id/);
assert.match(migration, /old\.status <> 'pending'[\s\S]+new\.status <> 'cancelled'/);
assert.match(migration, /unique index[\s\S]+where status = 'pending'/);
assert.match(migration, /account deletion request rate limit exceeded/);
assert.match(migration, /new\.status := 'pending'[\s\S]+new\.requested_at := now\(\)/);
assert.doesNotMatch(auth, /client\.auth\.admin|SUPABASE_SERVICE_ROLE/);

console.log("account deletion request contract: PASS");
