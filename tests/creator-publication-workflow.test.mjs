import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/202609080014_creator_publication_control.sql", import.meta.url),
  "utf8"
);
const app = readFileSync(new URL("../app-product.js", import.meta.url), "utf8");

assert.match(migration, /can_publish_creator_profile/);
assert.match(migration, /verification_status = 'verified'/);
assert.match(migration, /profile_status = 'published'/);
assert.match(migration, /profile_status <> 'published'[\s\S]+can_publish_creator_profile/);
assert.match(migration, /target_visibility <> 'public'[\s\S]+is_approved_creator/);
assert.match(migration, /update public\.creator_sessions[\s\S]+visibility = 'private'/);
assert.match(migration, /privatize_creator_sessions_on_unpublish/);
assert.match(migration, /after update of profile_status on public\.creator_profiles/);
assert.match(migration, /old\.profile_status = 'published'[\s\S]+new\.profile_status <> 'published'/);
assert.match(migration, /where creator_id = new\.user_id[\s\S]+visibility = 'public'[\s\S]+provenance = 'user_generated'/);

assert.match(app, /visibility: publicReady \? "public" : "private"/);
assert.match(app, /SAVE PRIVATE SESSION/);
assert.match(app, /data-lc-creator-profile-status/);
assert.match(app, /data-lc-session-visibility/);
assert.match(app, /data-lc-session-status="live"/);
assert.match(app, /profileStatus === "draft"[\s\S]+visibility: "private"/);
assert.match(app, /changes\.status === "live"[\s\S]+publish_first/);

console.log("creator publication workflow contract: PASS");
