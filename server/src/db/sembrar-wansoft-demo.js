/**
 * Datos DEMO del dashboard Wansoft (reconciliados).
 *
 *   npm run db:wansoft-demo -- --anio 2026   → todo el año (ventas + productos + reportes)
 *   npm run db:wansoft-demo -- --mes 2026-08 → un mes
 *   npm run db:wansoft-demo -- --limpiar     → borra TODO lo marcado como demo
 *
 * Los importes CUADRAN: la suma de productos, de tipos de producto, de grupos,
 * por usuario/terminal/orden/hora = la venta NETA del día; y las formas de pago
 * suman la venta TOTAL (con impuestos). Todo con origen = 'demo'.
 *
 * Nombres estilo Wansoft (POS), NO ligados al menú del sitio. Cada sucursal
 * guarda su nombre de Wansoft + un alias amigable para mostrar.
 */
"use strict";

const { pool } = require("./pool");

// Sucursales: nombre en Wansoft + alias amigable (el que ve el negocio).
// El usuario indicó: "Jordan" = Mitras, "Pollería 73" = San Nicolás.
const SUCURSALES = [
  { wansoft: "Jordan", alias: "Mitras", tier: 1.15 },
  { wansoft: "Pollería 73", alias: "San Nicolás", tier: 1.05 },
  { wansoft: "Eloy Cavazos", alias: "Eloy Cavazos", tier: 1.35 },
  { wansoft: "Guadalupe Centro", alias: "Centro de Guadalupe", tier: 1.45 },
  { wansoft: "Escamilla", alias: "Escamilla", tier: 0.95 },
  { wansoft: "Las Torres", alias: "Las Torres", tier: 1.0 },
  { wansoft: "Riberas", alias: "Riberas del Río", tier: 0.9 },
  { wansoft: "Los Lermas", alias: "Los Lermas", tier: 1.1 },
  { wansoft: "Apodaca", alias: "Apodaca Centro", tier: 1.2 },
];

// Catálogo estilo Wansoft (POS). tipo = tipo de grupo, g = grupo.
const CATALOGO = [
  { p: "POLLO ENTERO ASADO", g: "POLLOS", t: "ALIMENTOS", precio: 259, peso: 34 },
  { p: "MEDIO POLLO ASADO", g: "POLLOS", t: "ALIMENTOS", precio: 145, peso: 24 },
  { p: "CUARTO DE POLLO", g: "POLLOS", t: "ALIMENTOS", precio: 85, peso: 12 },
  { p: "ORDEN DE PAPAS", g: "COMPLEMENTOS", t: "ALIMENTOS", precio: 65, peso: 22 },
  { p: "ARROZ CHICO", g: "COMPLEMENTOS", t: "ALIMENTOS", precio: 45, peso: 14 },
  { p: "FRIJOLES CHARROS", g: "COMPLEMENTOS", t: "ALIMENTOS", precio: 45, peso: 12 },
  { p: "TORTILLAS 1/2 KG", g: "COMPLEMENTOS", t: "ALIMENTOS", precio: 20, peso: 16 },
  { p: "ENSALADA COL", g: "COMPLEMENTOS", t: "ALIMENTOS", precio: 55, peso: 8 },
  { p: "FLAN NAPOLITANO", g: "POSTRES", t: "ALIMENTOS", precio: 45, peso: 6 },
  { p: "GELATINA", g: "POSTRES", t: "ALIMENTOS", precio: 30, peso: 5 },
  { p: "REFRESCO 600ML", g: "REFRESCOS", t: "BEBIDAS", precio: 28, peso: 24 },
  { p: "REFRESCO 2LT", g: "REFRESCOS", t: "BEBIDAS", precio: 55, peso: 14 },
  { p: "AGUA FRESCA 1LT", g: "AGUAS", t: "BEBIDAS", precio: 40, peso: 10 },
  { p: "AGUA EMBOTELLADA", g: "AGUAS", t: "BEBIDAS", precio: 18, peso: 8 },
  { p: "SALSA 250ML", g: "COMPLEMENTOS", t: "ALIMENTOS", precio: 12, peso: 10 },
];
const CAJEROS = [{ n: "CAJA 1 - MARIA", peso: 32 }, { n: "CAJA 2 - JOSE", peso: 28 }, { n: "CAJA 3 - LUIS", peso: 24 }, { n: "GERENTE", peso: 16 }];
const TERMINALES = [{ n: "TERMINAL 01", peso: 45 }, { n: "TERMINAL 02", peso: 38 }, { n: "TERMINAL 03", peso: 17 }];
const TIPOS_ORDEN = [{ n: "COMEDOR", peso: 35 }, { n: "PARA LLEVAR", peso: 45 }, { n: "DOMICILIO", peso: 20 }];
const FORMAS_PAGO = [{ n: "EFECTIVO", peso: 52 }, { n: "TARJETA DE CREDITO", peso: 24 }, { n: "TARJETA DE DEBITO", peso: 18 }, { n: "TRANSFERENCIA", peso: 6 }];
const MODIFICADORES = [
  { g: "TERMINO", m: "BIEN DORADO", precio: 0, peso: 22 },
  { g: "TERMINO", m: "TERMINO MEDIO", precio: 0, peso: 10 },
  { g: "EXTRAS", m: "EXTRA SALSA", precio: 12, peso: 16 },
  { g: "EXTRAS", m: "EXTRA TORTILLAS", precio: 15, peso: 14 },
  { g: "PREPARACION", m: "SIN CEBOLLA", precio: 0, peso: 8 },
];
const HORAS = [
  { h: "11:00", peso: 5 }, { h: "12:00", peso: 9 }, { h: "13:00", peso: 14 }, { h: "14:00", peso: 16 },
  { h: "15:00", peso: 12 }, { h: "16:00", peso: 6 }, { h: "17:00", peso: 5 }, { h: "18:00", peso: 6 },
  { h: "19:00", peso: 9 }, { h: "20:00", peso: 11 }, { h: "21:00", peso: 5 }, { h: "22:00", peso: 2 },
];

function prng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r2 = (n) => Math.round(n * 100) / 100;

/** Reparte `total` según pesos (con ruido), sumando EXACTO a `total`. */
function repartir(total, pesos, rand) {
  const ruidosos = pesos.map((p) => p * (0.78 + rand() * 0.44));
  const suma = ruidosos.reduce((a, b) => a + b, 0) || 1;
  const vals = ruidosos.map((w) => r2((w / suma) * total));
  const diff = r2(total - vals.reduce((a, b) => a + b, 0));
  vals[vals.length - 1] = r2(vals[vals.length - 1] + diff);
  return vals;
}

function argVal(bandera, pd) {
  const i = process.argv.indexOf(bandera);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : pd;
}
function mesEnCurso() { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`; }

async function limpiar(cx) {
  console.log("→ Limpiando datos demo…");
  for (const tabla of ["wansoft_reportes", "wansoft_ventas_productos", "wansoft_ventas_categorias", "wansoft_ventas_diarias"]) {
    const [r] = await cx.query(`DELETE FROM ${tabla} WHERE origen = 'demo'`);
    console.log(`  ✗ ${r.affectedRows} en ${tabla}`);
  }
  const [s] = await cx.query(
    `DELETE s FROM wansoft_sucursales s
     LEFT JOIN wansoft_ventas_diarias v ON v.sucursal_id = s.id
     WHERE v.id IS NULL`
  );
  console.log(`  ✗ ${s.affectedRows} sucursales sin datos`);
}

async function sembrar(cx, mes) {
  const [anio, m] = mes.split("-").map(Number);
  const hoy = new Date();
  const ultimoDia = mes === mesEnCurso() ? hoy.getDate() - 1 : new Date(anio, m, 0).getDate();
  if (ultimoDia < 1) { console.log("→ El mes en curso aún no tiene días cerrados."); return; }
  console.log(`→ Sembrando ${mes} (días 1–${ultimoDia})…`);

  // Alta de sucursales (nombre = Wansoft, alias amigable)
  const idPorSuc = {};
  for (let i = 0; i < SUCURSALES.length; i++) {
    const s = SUCURSALES[i];
    await cx.query(
      `INSERT INTO wansoft_sucursales (nombre, alias, orden, activo) VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE alias = VALUES(alias), orden = VALUES(orden)`,
      [s.wansoft, s.alias, (i + 1) * 10]
    );
    const [row] = await cx.query("SELECT id FROM wansoft_sucursales WHERE nombre = ?", [s.wansoft]);
    idPorSuc[s.wansoft] = row[0].id;
  }

  let dias = 0;
  for (const s of SUCURSALES) {
    const sucId = idPorSuc[s.wansoft];
    const rand = prng((anio * 100 + m) * 1000 + s.wansoft.length * 7 + s.wansoft.charCodeAt(0));
    for (let d = 1; d <= ultimoDia; d++) {
      const fecha = new Date(anio, m - 1, d);
      const dow = fecha.getDay();
      const finde = dow === 5 ? 1.35 : dow === 6 ? 1.6 : dow === 0 ? 1.7 : 1.0;
      const ruido = 0.82 + rand() * 0.36;
      const f = `${anio}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

      const venta_neta = r2(21000 * s.tier * finde * ruido);
      const impuestos = r2(venta_neta * 0.16);
      const propinas = r2(venta_neta * (0.02 + rand() * 0.025));
      const venta_total = r2(venta_neta + impuestos + propinas);
      const descuentos = r2(venta_neta * (0.012 + rand() * 0.02));
      const cortesias = r2(venta_neta * (rand() * 0.01));
      const cancelaciones = r2(venta_neta * (rand() * 0.008));
      const venta_bruta = r2(venta_neta + descuentos + cortesias);
      const ticket = 128 + rand() * 46;
      const cuentas = Math.max(30, Math.round(venta_neta / ticket));
      const comensales = Math.round(cuentas * (2 + rand() * 0.7));
      const ticket_promedio = r2(venta_neta / cuentas);
      const efectivoKpi = r2(venta_total * 0.52);
      const tarjetaKpi = r2(venta_total * 0.42);
      const otrosKpi = r2(venta_total - efectivoKpi - tarjetaKpi);

      await cx.query(
        `INSERT INTO wansoft_ventas_diarias
           (sucursal_id, fecha, venta_bruta, descuentos, cortesias, cancelaciones, venta_neta,
            impuestos, propinas, venta_total, cuentas, comensales, ticket_promedio,
            efectivo, tarjeta, otros_pago, origen)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'demo')
         ON DUPLICATE KEY UPDATE venta_bruta=VALUES(venta_bruta), descuentos=VALUES(descuentos),
           cortesias=VALUES(cortesias), cancelaciones=VALUES(cancelaciones), venta_neta=VALUES(venta_neta),
           impuestos=VALUES(impuestos), propinas=VALUES(propinas), venta_total=VALUES(venta_total),
           cuentas=VALUES(cuentas), comensales=VALUES(comensales), ticket_promedio=VALUES(ticket_promedio),
           efectivo=VALUES(efectivo), tarjeta=VALUES(tarjeta), otros_pago=VALUES(otros_pago), origen='demo'`,
        [sucId, f, venta_bruta, descuentos, cortesias, cancelaciones, venta_neta, impuestos, propinas,
         venta_total, cuentas, comensales, ticket_promedio, efectivoKpi, tarjetaKpi, otrosKpi]
      );

      // ── Productos: reparte EXACTO la venta neta (subtotal = neto) ──
      const netos = repartir(venta_neta, CATALOGO.map((c) => c.peso), rand);
      const prodVals = [];
      const porTipo = {};
      const porGrupo = {};
      CATALOGO.forEach((c, i) => {
        const sub = netos[i];
        const cant = Math.max(1, Math.round(sub / c.precio));
        // categoria del producto = GRUPO (para el detalle del treemap por grupo)
        prodVals.push([sucId, f, c.p, c.g, cant, sub, r2(sub * 1.16), "demo"]);
        porTipo[c.t] = r2((porTipo[c.t] || 0) + sub);
        porGrupo[c.g] = r2((porGrupo[c.g] || 0) + sub);
      });
      await cx.query(
        `INSERT INTO wansoft_ventas_productos (sucursal_id, fecha, producto, categoria, cantidad, subtotal, total, origen)
         VALUES ? ON DUPLICATE KEY UPDATE cantidad=VALUES(cantidad), categoria=VALUES(categoria),
           subtotal=VALUES(subtotal), total=VALUES(total), origen='demo'`,
        [prodVals]
      );

      // ── Tipo de grupo → wansoft_ventas_categorias (treemap; subtotal = neto) ──
      const catVals = Object.entries(porTipo).map(([t, sub]) => [sucId, f, "tipo", t, sub, r2(sub * 0.16), r2(sub * 1.16), "demo"]);
      await cx.query(
        `INSERT INTO wansoft_ventas_categorias (sucursal_id, fecha, nivel, nombre, subtotal, iva, total, origen)
         VALUES ? ON DUPLICATE KEY UPDATE subtotal=VALUES(subtotal), iva=VALUES(iva), total=VALUES(total), origen='demo'`,
        [catVals]
      );

      // ── Reportes dimensionales → wansoft_reportes ──
      const rep = []; // [sucId,fecha,reporte,etiqueta,etiqueta2,cantidad,cantidad2,subtotal,iva,total,porcentaje,origen]
      const push = (reporte, etq, sub, extra = {}) =>
        rep.push([sucId, f, reporte, etq, extra.etq2 || "", extra.cant ?? null, extra.cant2 ?? null, sub, r2(sub * 0.16), r2(sub * 1.16), extra.pct ?? r2((sub / venta_neta) * 100), "demo"]);

      // grupo
      for (const [g, sub] of Object.entries(porGrupo)) push("grupo", g, sub);
      // tipo de orden (reparte neta; personas/cuentas por misma fracción)
      const netoOrden = repartir(venta_neta, TIPOS_ORDEN.map((x) => x.peso), rand);
      TIPOS_ORDEN.forEach((x, i) => {
        const frac = netoOrden[i] / venta_neta;
        push("tipo_orden", x.n, netoOrden[i], { cant: Math.round(comensales * frac), cant2: Math.round(cuentas * frac) });
      });
      // usuario / terminal
      repartir(venta_neta, CAJEROS.map((x) => x.peso), rand).forEach((sub, i) => push("usuario", CAJEROS[i].n, sub));
      repartir(venta_neta, TERMINALES.map((x) => x.peso), rand).forEach((sub, i) => push("terminal", TERMINALES[i].n, sub));
      // hora (para el mapa de calor)
      repartir(venta_neta, HORAS.map((x) => x.peso), rand).forEach((sub, i) => push("hora", HORAS[i].h, sub));
      // forma de pago (reparte venta TOTAL con impuestos)
      const pagos = repartir(venta_total, FORMAS_PAGO.map((x) => x.peso), rand);
      FORMAS_PAGO.forEach((x, i) =>
        rep.push([sucId, f, "forma_pago", x.n, "", null, null, r2(pagos[i] / 1.16), r2(pagos[i] - pagos[i] / 1.16), pagos[i], r2((pagos[i] / venta_total) * 100), "demo"]));
      // modificadores (no particionan; cantidad + importe)
      for (const md of MODIFICADORES) {
        const cant = Math.max(0, Math.round(cuentas * (md.peso / 100) * (0.7 + rand() * 0.6)));
        const imp = r2(cant * md.precio);
        rep.push([sucId, f, "modificador", md.m, md.g, cant, null, imp, r2(imp * 0.16), r2(imp * 1.16), null, "demo"]);
      }

      await cx.query(
        `INSERT INTO wansoft_reportes
           (sucursal_id, fecha, reporte, etiqueta, etiqueta2, cantidad, cantidad2, subtotal, iva, total, porcentaje, origen)
         VALUES ? ON DUPLICATE KEY UPDATE cantidad=VALUES(cantidad), cantidad2=VALUES(cantidad2),
           subtotal=VALUES(subtotal), iva=VALUES(iva), total=VALUES(total), porcentaje=VALUES(porcentaje), origen='demo'`,
        [rep]
      );
      dias++;
    }
  }
  console.log(`  ✓ ${dias} días × sucursal sembrados (ventas + productos + reportes).`);
}

async function sembrarAnio(cx, anio) {
  const hoy = new Date();
  const ultimoMes = anio === hoy.getFullYear() ? hoy.getMonth() + 1 : 12;
  console.log(`→ Sembrando el año ${anio} (meses 1–${ultimoMes})…`);
  for (let m = 1; m <= ultimoMes; m++) await sembrar(cx, `${anio}-${String(m).padStart(2, "0")}`);
}

(async () => {
  const cx = await pool.getConnection();
  try {
    if (process.argv.includes("--limpiar")) await limpiar(cx);
    else if (argVal("--anio", null)) await sembrarAnio(cx, Number(argVal("--anio", null)));
    else await sembrar(cx, argVal("--mes", mesEnCurso()));
    console.log("✅ Listo.");
  } finally {
    cx.release();
    await pool.end();
  }
})().catch((e) => { console.error("❌ Error:", e.message); process.exit(1); });
