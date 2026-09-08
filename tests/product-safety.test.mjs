import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../app-product.js", import.meta.url), "utf8");
const migration = readFileSync(
  new URL("../supabase/migrations/202609080015_block_follow_cleanup.sql", import.meta.url),
  "utf8"
);

assert.match(app, /state\.client\.from\("user_blocks"\)\.select\("blocked_id"\)/);
assert.match(app, /!state\.blockedIds\.has\(id\)/);
assert.match(app, /data-lc-creator-safety="report"/);
assert.match(app, /data-lc-creator-safety="block"/);
assert.match(app, /target_type: "profile"/);
assert.match(app, /description: String\(data\.get\("description"\)[\s\S]+slice\(0, 500\)/);
assert.match(app, /blockedProfileMap[\s\S]+Blocked Creator/);
assert.match(migration, /security definer/);
assert.match(migration, /delete from public\.follows/);
assert.match(migration, /follower_id = new\.blocker_id[\s\S]+following_id = new\.blocker_id/);
assert.match(migration, /after insert on public\.user_blocks/);
assert.match(app, /from\("user_blocks"\)\.insert\(\{ blocker_id: state\.profile\.id, blocked_id: id \}\)/);
assert.match(app, /from\("user_blocks"\)\.delete\(\)\.eq\("blocker_id", state\.profile\.id\)\.eq\("blocked_id", id\)/);
assert.match(app, /data-lc-blocked-list/);
assert.match(app, /Report submitted privately/);

console.log("product safety contract: PASS");
