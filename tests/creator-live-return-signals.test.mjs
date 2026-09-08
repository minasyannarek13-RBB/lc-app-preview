import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../app-product.js", import.meta.url), "utf8");
const nested = readFileSync(new URL("../LC_App_GitHub_Pages_Upload/app-product.js", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/202609080017_creator_live_return_signals.sql", import.meta.url), "utf8");

assert.equal(app, nested, "root and deployed product modules must stay synchronized");
assert.match(app, /from\("return_signals"\)\.select/);
assert.match(app, /from\("return_signal_preferences"\)\.select/);
assert.match(app, /return_signal_preferences"\)\.upsert/);
assert.match(app, /row\.type === "creator_live"/);
assert.match(app, /source === "return_signal"[\s\S]+from\("return_signals"\)\.update/);
assert.match(app, /data-lc-live-signals/);
assert.match(app, /In-app only\. No email, SMS or push delivery is implied/);
assert.match(migration, /creator_sessions_create_live_return_signals/);
assert.match(migration, /cp\.verification_status = 'verified'[\s\S]+cp\.profile_status = 'published'/);
assert.match(migration, /coalesce\(pref\.creator_live_enabled, true\)/);
assert.match(migration, /not public\.is_blocked_pair/);
assert.match(migration, /grant select, update on table public\.return_signals to authenticated/);
assert.doesNotMatch(migration, /grant insert[^;]+return_signals to authenticated/i);
assert.match(migration, /No gameplay, funds, KYC\/AML, wagering or settlement data/i);

console.log("creator live return signals contract: PASS");
