import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../app-product.js", import.meta.url), "utf8");
const nested = readFileSync(new URL("../LC_App_GitHub_Pages_Upload/app-product.js", import.meta.url), "utf8");
const sql = readFileSync(new URL("../supabase/migrations/202609080027_creator_public_surface_integrity.sql", import.meta.url), "utf8");

assert.equal(app, nested, "root and deployed product modules must stay synchronized");
assert.match(app, /eligibleSessions[\s\S]+session\.status === "live" \|\| new Date\(session\.starts_at\)\.getTime\(\) > Date\.now\(\)/);
assert.match(app, /a\.status === "live" \? -1[\s\S]+b\.status === "live" \? -1/, "Live must sort before scheduled sessions");
assert.match(app, /publication\.publicReady \? `<section class="lc-product-card"><h2>Create post/);
assert.match(app, /if \(!creatorPublication\(\)\.publicReady\) throw new Error\("not_verified"\)/);
assert.match(app, /state\.sessions\.some\(\(row\) => row\.id !== id && row\.status === "live"\)/);
assert.match(sql, /public\.is_approved_creator\(author_id\)/i, "Creator posts must require server-approved public identity");
assert.match(sql, /new\.starts_at <= now\(\)[\s\S]+scheduled in the future/i);
assert.match(sql, /for update[\s\S]+other\.status = 'live'/i, "single-Live check must serialize on the Creator row");
assert.match(sql, /before insert or update of status, visibility, starts_at, creator_id, provenance/i);
assert.match(sql, /revoke all on function public\.enforce_creator_session_state_machine\(\) from public, anon, authenticated/i);

console.log("Creator public surface integrity contract: PASS");
