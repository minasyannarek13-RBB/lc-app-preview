import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../app-product.js", import.meta.url), "utf8");

const loadState = app.match(/async function loadState\(\)[\s\S]+?async function loadPilotBriefs/)[0];
assert.ok(loadState.indexOf("await loadReturnSignals()") < loadState.indexOf("await loadCreators()"), "Live signals must load before required Creator context");

const loadCreators = app.match(/async function loadCreators\(\)[\s\S]+?async function setCurrentPersona/)[0];
assert.match(loadCreators, /const reminderIds = \[\.\.\.state\.reminders\]/);
assert.match(loadCreators, /\.\.\.\[\.\.\.state\.follows\]/);
assert.match(loadCreators, /state\.notifications\.map\(\(row\) => row\.creator_id\)/);
assert.match(loadCreators, /reminderSessions\.data[\s\S]+row\.creator_id/);
assert.match(loadCreators, /missingRequiredIds[\s\S]+\.in\("user_id", missingRequiredIds\)/);
assert.match(loadCreators, /new Map\([\s\S]+row\.user_id/);

const openNotification = app.match(/async function openNotification\(id\)[\s\S]+?function suggestedCreators/)[0];
assert.match(openNotification, /notification\.source === "return_signal" && session/);
assert.match(openNotification, /creatorId: notification\.creator_id \|\| session\.entry\.profile\.id/);
assert.match(openNotification, /sessionId: session\.session\.id/);
assert.doesNotMatch(openNotification, /notification\.target_type === "profile"/);

console.log("creator context continuity contract: PASS");
