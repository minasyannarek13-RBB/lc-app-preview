import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../app-product.js", import.meta.url), "utf8");

assert.match(app, /discoveryFilter: "for_you"/);
assert.match(app, /function creatorDiscoveryScore/);
assert.match(app, /function creatorRecommendationReasons/);
assert.match(app, /data-lc-discovery-filter/);
assert.match(app, /\["for_you", "live", "following", "upcoming"\]/);
assert.match(app, /metadata: \{ surface: "creator_feed", position: index \+ 1, filter: state\.discoveryFilter, recommendation_reasons:/);
assert.match(app, /lead\.sessions\[0\] \? `<button/);
assert.doesNotMatch(app, /data-lc-live="\$\{safe\(lead\.sessions\[0\]\?\.id \|\| ""\)\}"/);

console.log("player discovery feed contract: PASS");
