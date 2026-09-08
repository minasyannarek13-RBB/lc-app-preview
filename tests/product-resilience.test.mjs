import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../app-product.js", import.meta.url), "utf8");
const nested = await readFile(new URL("../LC_App_GitHub_Pages_Upload/app-product.js", import.meta.url), "utf8");

assert.equal(app, nested, "root and deployed product modules must stay synchronized");
assert.match(app, /data-lc-retry/);
assert.match(app, /async function retryLoad[\s\S]+await loadState\(\)[\s\S]+renderProductTarget/);
assert.match(app, /window\.addEventListener\("online"[\s\S]+if \(state\.loadError\) retryLoad/);
assert.match(app, /window\.addEventListener\("offline", syncConnectivity\)/);

const follow = app.match(/async function toggleFollow[\s\S]+?async function toggleReminder/)[0];
assert.match(follow, /state\.follows\.add\(id\);[\s\S]+throw error/);
assert.match(follow, /state\.follows\.delete\(id\);[\s\S]+throw error/);

const reminder = app.match(/async function toggleReminder[\s\S]+?async function likePost/)[0];
assert.match(reminder, /state\.reminders\.add\(id\);[\s\S]+throw error/);
assert.match(reminder, /state\.reminders\.delete\(id\);[\s\S]+throw error/);

console.log("product resilience contract: PASS");
