import test from "node:test";
import assert from "node:assert/strict";
import { diasDeMes, rangoDias, resolverDias } from "./fechas.mjs";
import { todayMX } from "./report.mjs";

test("rango inclusivo y estable en UTC", () => {
  assert.deepEqual(rangoDias("2026-08-30", "2026-09-02"), [
    "2026-08-30", "2026-08-31", "2026-09-01", "2026-09-02",
  ]);
});

test("febrero bisiesto tiene 29 días", () => {
  const dias = diasDeMes("2024-02");
  assert.equal(dias.length, 29);
  assert.equal(dias.at(-1), "2024-02-29");
});

test("el mes actual nunca incluye fechas futuras en Ciudad de México", () => {
  const hoy = todayMX();
  assert.equal(diasDeMes(hoy.slice(0, 7)).at(-1), hoy);
});

test("rechaza rangos invertidos o excesivos", () => {
  assert.throws(() => rangoDias("2026-09-02", "2026-09-01"));
  assert.throws(() => rangoDias("2026-02-31", "2026-03-01"));
  assert.throws(() => rangoDias("2025-01-01", "2026-12-31"));
});

test("acepta una lista de días faltantes, sin duplicados", () => {
  assert.deepEqual(
    resolverDias(["--dates", "2026-09-03,2026-09-01,2026-09-03"]),
    ["2026-09-01", "2026-09-03"]
  );
});
