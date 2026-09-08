import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../app-product.js", import.meta.url), "utf8");
const nested = await readFile(new URL("../LC_App_GitHub_Pages_Upload/app-product.js", import.meta.url), "utf8");
const migration = await readFile(new URL("../supabase/migrations/202609080013_product_attribution_events.sql", import.meta.url), "utf8");

assert.equal(app, nested, "root and deployed product modules must stay synchronized");
assert.match(app, /const PRODUCT_EVENTS = new Set\(\["product_open"[\s\S]+"handoff_return"[\s\S]+"notification_response"/);
assert.match(app, /async function trackProductEvent[\s\S]+from\("product_events"\)\.insert/);
assert.match(app, /state\.demo \|\| !state\.analyticsAvailable/);
assert.match(app, /metadata: \{ has_query: Boolean\(state\.search\), result_count:/);
assert.doesNotMatch(app, /metadata: \{[^}]*search:/);
assert.match(app, /function attributionStorageKey\(\)[\s\S]+state\.profile\?\.id[\s\S]+ATTRIBUTION_KEY_PREFIX/);
assert.match(app, /localStorage\.getItem\(storageKey\)/);
assert.doesNotMatch(app, /localStorage\.(getItem|setItem)\(ATTRIBUTION_KEY[,)]/);

assert.match(migration, /alter table public\.product_events enable row level security/);
assert.match(migration, /revoke all on table public\.product_events from public, anon, authenticated/);
assert.match(migration, /auth\.uid\(\) = user_id[\s\S]+public\.is_active_profile\(user_id\)/);
assert.match(migration, /grant select, insert on table public\.product_events to authenticated/);
assert.doesNotMatch(migration, /grant (update|delete)/i);
assert.match(migration, /octet_length\(metadata::text\) <= 2048/);
assert.match(migration, /product event rate limit exceeded/);
assert.match(migration, /Never store gameplay, funds, KYC\/AML, wagering or settlement data/);

console.log("product attribution contract: PASS");
