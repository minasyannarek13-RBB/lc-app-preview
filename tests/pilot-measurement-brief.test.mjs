import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../app-product.js", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/202609080018_pilot_measurement_briefs.sql", import.meta.url), "utf8");

assert.match(app, /function renderPilotMeasurementBrief/);
assert.match(app, /data-lc-form="pilot-brief"/);
assert.match(app, /To be validated/);
assert.match(app, /Readiness is self-reported and unverified/);
assert.match(app, /gameplay, wallet, KYC\/AML, wagering and settlement remain outside LC/);
assert.match(app, /from\("pilot_measurement_briefs"\)\.select/);
assert.match(app, /existing && existing\.status !== "draft"/);

assert.match(migration, /alter table public\.pilot_measurement_briefs enable row level security/);
assert.match(migration, /using \(auth\.uid\(\) = user_id\)/);
assert.match(migration, /with check \(auth\.uid\(\) = user_id and status = 'draft'\)/);
assert.match(migration, /old\.status <> 'draft'/);
assert.match(migration, /new\.status not in \('draft', 'submitted'\)/);
assert.match(migration, /observed_events <@ array\[/);
assert.match(migration, /grant select, insert, update on table public\.pilot_measurement_briefs to authenticated/);
assert.doesNotMatch(migration, /grant delete/i);

console.log("pilot measurement brief contract: PASS");
