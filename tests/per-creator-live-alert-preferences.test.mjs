import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../app-product.js", import.meta.url), "utf8");
const nested = readFileSync(new URL("../LC_App_GitHub_Pages_Upload/app-product.js", import.meta.url), "utf8");
const sql = readFileSync(new URL("../supabase/migrations/202609080025_per_creator_live_alert_preferences.sql", import.meta.url), "utf8");
const executableSql = sql.replace(/^\s*--.*$/gm, "");

assert.equal(app, nested, "root and deployed product modules must stay synchronized");
assert.match(app, /following_id,live_alerts_enabled/);
assert.match(app, /creatorLiveAlertsAvailable = false[\s\S]+select\("following_id"\)/, "old deployments must degrade safely");
assert.match(app, /rpc\("set_creator_live_alert_preference"/);
assert.match(app, /data-lc-creator-live-alerts/);
assert.match(app, /Live alerts paused globally/);
assert.match(sql, /add column if not exists live_alerts_enabled boolean not null default true/i);
assert.match(sql, /public\.is_approved_creator\(following_id\)/i, "new follows must target approved public Creators");
assert.match(sql, /f\.live_alerts_enabled/i, "all fan-out paths must respect the per-Creator preference");
assert.match(sql, /where follower_id = v_user_id[\s\S]+following_id = p_creator_id/i, "RPC update must be owner scoped");
assert.match(sql, /delete from public\.return_signals[\s\S]+recipient_id = v_user_id[\s\S]+creator_id = p_creator_id/i, "muting must remove stale signals");
assert.match(sql, /s\.status = 'live'[\s\S]+s\.visibility = 'public'/i, "re-enable catch-up must be Live and public only");
assert.match(sql, /revoke all on function public\.set_creator_live_alert_preference\(uuid, boolean\) from public, anon, authenticated/i);
assert.match(sql, /grant execute on function public\.set_creator_live_alert_preference\(uuid, boolean\) to authenticated/i);
assert.doesNotMatch(executableSql, /wallet|deposit|withdraw|kyc|aml|wager|settlement/i);

console.log("per-Creator Live alert preferences contract: PASS");
