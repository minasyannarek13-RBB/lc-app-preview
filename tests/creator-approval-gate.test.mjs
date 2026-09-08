import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/202608080012_creator_approval_gate.sql", import.meta.url),
  "utf8"
);
const app = readFileSync(new URL("../app-product.js", import.meta.url), "utf8");

assert.match(migration, /cp\.verification_status = 'verified'/);
assert.match(migration, /profile_status <> 'published'/);
assert.match(migration, /target_visibility <> 'public'[\s\S]+is_approved_creator/);
assert.match(migration, /creator_sessions_select_public[\s\S]+is_approved_creator/);
assert.match(migration, /revoke all on function public\.admin_set_creator_verification[\s\S]+anon, authenticated/);
assert.match(app, /profile_status: creatorApproved \? "published" : "draft"/);
const creatorSave = app.match(/async function saveCreator\(form\)[\s\S]+?async function saveIndustry/)[0];
const persistedCreatorSave = creatorSave.slice(creatorSave.indexOf("const affiliationType"));
assert.doesNotMatch(persistedCreatorSave, /profile_status: "published"/);

console.log("creator approval gate contract: PASS");
