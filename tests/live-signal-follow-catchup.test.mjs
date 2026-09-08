import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(new URL('../supabase/migrations/202609080020_live_signal_follow_catchup.sql', import.meta.url), 'utf8');
const executableSql = sql.replace(/^\s*--.*$/gm, '');

assert.match(sql, /after insert on public\.follows/i, 'follow insert must trigger live-signal catch-up');
assert.match(sql, /cp\.verification_status = 'verified'/i, 'creator must be verified');
assert.match(sql, /cp\.profile_status = 'published'/i, 'creator profile must be published');
assert.match(sql, /s\.status = 'live'/i, 'session must be live');
assert.match(sql, /s\.visibility = 'public'/i, 'session must be public');
assert.match(sql, /public\.is_active_profile\(new\.follower_id\)/i, 'recipient must be active');
assert.match(sql, /public\.is_blocked_pair\(new\.follower_id, new\.following_id\)/i, 'blocked pairs must fail closed');
assert.match(sql, /coalesce\(pref\.creator_live_enabled, true\)/i, 'live-signal preference must be respected');
assert.match(sql, /on conflict \(recipient_id, session_id, signal_type\) do nothing/i, 'catch-up must be idempotent');
assert.match(sql, /after insert or update of creator_live_enabled on public\.return_signal_preferences/i, 're-enable must restore eligible current signals');
assert.match(sql, /revoke all on function public\.create_live_signal_on_follow\(\) from public, anon, authenticated/i, 'trigger function must not be client callable');
assert.match(sql, /revoke all on function public\.create_live_signals_on_preference_enable\(\) from public, anon, authenticated/i, 'preference catch-up function must not be client callable');
assert.doesNotMatch(executableSql, /wallet|deposit|withdraw|kyc|aml|wager|settlement/i, 'migration must not introduce regulated-flow data');

console.log('live-signal follow catch-up contract: PASS');
