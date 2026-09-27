// Port en Node de generar_general.py (este PC no tiene Python).
// Reconstruye Porra_Mundial2026_GENERAL.xlsx ENTERAMENTE desde porra_data.json,
// que es la fuente de verdad y ya contiene fixtures, predicciones, resultados,
// extra y bonus de TODAS las rondas (grupos + eliminatorias, incluidos cuartos).
// Mantiene las mismas hojas, fórmulas (regla euro) y estilos que el Python.
//
// Uso:  node generar_general.js
const path = require("path");
const fs = require("fs");
const ExcelJS = require("exceljs");

const BASE = __dirname;
const PLAYERS = ["Jugador 1", "Jugador 2", "Jugador 3", "Jugador 4", "Jugador 5", "Jugador 6"];
const JORNADAS = ["Jornada 1", "Jornada 2", "Jornada 3"];
const KO_ROUNDS = ["32avos", "octavos", "cuartos", "semis", "final"];
const ROUNDS = [...JORNADAS, ...KO_ROUNDS];
const ROUND_LABEL = {
  "Jornada 1": "J1", "Jornada 2": "J2", "Jornada 3": "J3",
  "32avos": "32avos", "octavos": "8vos", "cuartos": "4tos", "semis": "Semis", "final": "Final",
};

// ---- Estilos (ARGB, alpha FF) ----
const HDR_FILL   = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } };
const SUB_FILL   = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E75B6" } };
const INPUT_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2CC" } };
const TOT_FILL   = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E1F2" } };
const HDR_FONT   = { bold: true, color: { argb: "FFFFFFFF" } };
const BOLD       = { bold: true };
const CENTER     = { horizontal: "center", vertical: "middle" };
const LEFT       = { horizontal: "left" };
const RIGHT      = { horizontal: "right" };
const THIN       = { style: "thin", color: { argb: "FFBFBFBF" } };
const BORDER     = { top: THIN, left: THIN, bottom: THIN, right: THIN };

function colLetter(n) {
  let s = "";
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function styleCell(c, { fill, font, align = CENTER, border = true } = {}) {
  if (fill) c.fill = fill;
  if (font) c.font = font;
  if (align) c.alignment = align;
  if (border) c.border = BORDER;
}

function build() {
  const jpath = path.join(BASE, "porra_data.json");
  const D = JSON.parse(fs.readFileSync(jpath, "utf-8"));

  // fixtures[r] = [{no,grupo,local,visitante}]
  const fixtures = {};
  for (const r of ROUNDS) fixtures[r] = (D.fixtures[r] || []).slice().sort((a, b) => a.no - b.no);
  // preds[p][r] = {no: [gl,gv]}
  const preds = {};
  for (const p of PLAYERS) { preds[p] = {}; for (const r of ROUNDS) preds[p][r] = (D.predicciones[p] && D.predicciones[p][r]) || {}; }
  const extra = D.extra || {};
  const resultados = {};
  for (const r of ROUNDS) resultados[r] = (D.resultados && D.resultados[r]) || {};
  const bonus = D.bonus || {};

  const wb = new ExcelJS.Workbook();

  // pts_col[(r,p)] = {pcol, f0, f1}
  const ptsCol = {};

  // ============ Hoja Clasificación (primera) ============
  const wc = wb.addWorksheet("Clasificación", { views: [{ showGridLines: false }] });

  // ============ Hojas de jornada ============
  for (const j of ROUNDS) {
    const ws = wb.addWorksheet(j, { views: [{ showGridLines: false, state: "frozen", xSplit: 6, ySplit: 2 }] });
    ws.getCell(1, 1).value = "PARTIDO"; ws.mergeCells("A1:D1");
    ws.getCell(1, 5).value = "RESULTADO REAL"; ws.mergeCells("E1:F1");
    PLAYERS.forEach((p, i) => {
      const c0 = 7 + i * 3;
      ws.getCell(1, c0).value = p;
      ws.mergeCells(1, c0, 1, c0 + 2);
    });
    const subs = ["Nº", "Grupo", "LOCAL", "VISITANTE", "GL", "GV"];
    subs.forEach((t, ci) => { ws.getCell(2, ci + 1).value = t; });
    PLAYERS.forEach((p, i) => {
      const c0 = 7 + i * 3;
      ws.getCell(2, c0).value = "GL"; ws.getCell(2, c0 + 1).value = "GV"; ws.getCell(2, c0 + 2).value = "Pts";
    });
    for (let ci = 1; ci < 7 + PLAYERS.length * 3; ci++) {
      styleCell(ws.getCell(1, ci), { fill: HDR_FILL, font: HDR_FONT });
      styleCell(ws.getCell(2, ci), { fill: SUB_FILL, font: HDR_FONT });
    }
    const first = 3;
    fixtures[j].forEach((m, ridx) => {
      const R = first + ridx;
      ws.getCell(R, 1).value = m.no; ws.getCell(R, 2).value = m.grupo || "";
      ws.getCell(R, 3).value = m.local; ws.getCell(R, 4).value = m.visitante;
      styleCell(ws.getCell(R, 1)); styleCell(ws.getCell(R, 2));
      styleCell(ws.getCell(R, 3), { align: LEFT }); styleCell(ws.getCell(R, 4), { align: LEFT });
      const rr = resultados[j][String(m.no)];
      if (rr) { ws.getCell(R, 5).value = rr[0]; ws.getCell(R, 6).value = rr[1]; }
      styleCell(ws.getCell(R, 5), { fill: INPUT_FILL }); styleCell(ws.getCell(R, 6), { fill: INPUT_FILL });
      PLAYERS.forEach((p, i) => {
        const c0 = 7 + i * 3;
        const pr = preds[p][j][String(m.no)];
        if (pr) { ws.getCell(R, c0).value = pr[0]; ws.getCell(R, c0 + 1).value = pr[1]; }
        styleCell(ws.getCell(R, c0)); styleCell(ws.getCell(R, c0 + 1));
        const gl = `${colLetter(c0)}${R}`;
        const gv = `${colLetter(c0 + 1)}${R}`;
        const f = `IF(OR($E${R}="",$F${R}=""),"",` +
                  `IF(OR(${gl}="",${gv}=""),"",` +
                  `IF(AND(${gl}=$E${R},${gv}=$F${R}),2,` +
                  `IF(SIGN(${gl}-${gv})=SIGN($E${R}-$F${R}),1,0))))`;
        const pc = ws.getCell(R, c0 + 2); pc.value = { formula: f };
        styleCell(pc, { font: BOLD });
      });
    });
    const TR = first + fixtures[j].length;
    ws.getCell(TR, 4).value = "PUNTOS JORNADA";
    styleCell(ws.getCell(TR, 4), { fill: TOT_FILL, font: BOLD, align: RIGHT });
    for (let ci = 1; ci < 4; ci++) styleCell(ws.getCell(TR, ci), { fill: TOT_FILL });
    styleCell(ws.getCell(TR, 5), { fill: TOT_FILL }); styleCell(ws.getCell(TR, 6), { fill: TOT_FILL });
    PLAYERS.forEach((p, i) => {
      const c0 = 7 + i * 3;
      const pcol = colLetter(c0 + 2);
      styleCell(ws.getCell(TR, c0), { fill: TOT_FILL });
      styleCell(ws.getCell(TR, c0 + 1), { fill: TOT_FILL });
      const tc = ws.getCell(TR, c0 + 2); tc.value = { formula: `SUM(${pcol}${first}:${pcol}${TR - 1})` };
      styleCell(tc, { fill: TOT_FILL, font: BOLD });
      ptsCol[`${j}|${p}`] = { pcol, f0: first, f1: TR - 1 };
    });
    ws.getColumn(1).width = 4; ws.getColumn(2).width = 6;
    ws.getColumn(3).width = 16; ws.getColumn(4).width = 16;
    for (let ci = 5; ci < 7 + PLAYERS.length * 3; ci++) ws.getColumn(ci).width = 5;
  }

  // ============ Apuestas Extra ============
  const we = wb.addWorksheet("Apuestas Extra", { views: [{ showGridLines: false }] });
  we.getCell(1, 1).value = "APUESTAS EXTRA  (1 punto por acierto · se resuelven al final del torneo)";
  we.mergeCells(1, 1, 1, 2 + PLAYERS.length);
  styleCell(we.getCell(1, 1), { fill: HDR_FILL, font: HDR_FONT, align: LEFT });
  we.getCell(2, 1).value = "Concepto"; we.getCell(2, 2).value = "REAL (admin)";
  PLAYERS.forEach((p, i) => { we.getCell(2, 3 + i).value = p; });
  for (let ci = 1; ci < 3 + PLAYERS.length; ci++) styleCell(we.getCell(2, ci), { fill: SUB_FILL, font: HDR_FONT });
  const conceptos = [["goleador", "Máximo goleador"], ["mvp", "MVP del torneo"],
    ["campeon", "Campeón"], ["fin1", "Finalista 1"], ["fin2", "Finalista 2"]];
  conceptos.forEach(([key, label], ri) => {
    const R = 3 + ri;
    we.getCell(R, 1).value = label; styleCell(we.getCell(R, 1), { font: BOLD, align: LEFT });
    styleCell(we.getCell(R, 2), { fill: INPUT_FILL });
    PLAYERS.forEach((p, i) => {
      we.getCell(R, 3 + i).value = (extra[p] && extra[p][key]) || null;
      styleCell(we.getCell(R, 3 + i), { align: LEFT });
    });
  });
  we.getCell(9, 1).value = "PUNTOS EXTRA POR JUGADOR"; styleCell(we.getCell(9, 1), { fill: TOT_FILL, font: BOLD, align: LEFT });
  we.mergeCells("A9:B9");
  const extraPtsRow = {};
  PLAYERS.forEach((p, i) => {
    const R = 10 + i;
    const PL = colLetter(3 + i);
    we.getCell(R, 1).value = p; styleCell(we.getCell(R, 1), { font: BOLD, align: LEFT });
    const f = `IF($B$3<>"",IF(${PL}3=$B$3,1,0),0)` +
              `+IF($B$4<>"",IF(${PL}4=$B$4,1,0),0)` +
              `+IF($B$5<>"",IF(${PL}5=$B$5,1,0),0)` +
              `+IF($B$6<>"",IF(OR(${PL}6=$B$6,${PL}6=$B$7),1,0),0)` +
              `+IF($B$7<>"",IF(OR(${PL}7=$B$6,${PL}7=$B$7),1,0),0)`;
    we.getCell(R, 2).value = { formula: f }; styleCell(we.getCell(R, 2), { fill: TOT_FILL, font: BOLD });
    extraPtsRow[p] = R;
  });
  we.getColumn(1).width = 18; we.getColumn(2).width = 16;
  for (let i = 0; i < PLAYERS.length; i++) we.getColumn(3 + i).width = 16;

  // ============ Clasificación (contenido) ============
  const nrounds = ROUNDS.length;
  const firstRoundCol = 3;
  const sumCol = firstRoundCol + nrounds;
  const extraCol = sumCol + 1;
  const bonusCol = sumCol + 2;
  const totalCol = sumCol + 3;
  const sumL = colLetter(sumCol), extraL = colLetter(extraCol), bonusL = colLetter(bonusCol), totalL = colLetter(totalCol);
  const firstRoundL = colLetter(firstRoundCol), lastRoundL = colLetter(sumCol - 1);
  wc.getCell(1, 1).value = "CLASIFICACIÓN GENERAL · PORRA MUNDIAL 2026";
  wc.mergeCells(1, 1, 1, totalCol);
  styleCell(wc.getCell(1, 1), { fill: HDR_FILL, font: HDR_FONT, align: LEFT });
  const heads = ["Puesto", "Jugador", ...ROUNDS.map((r) => ROUND_LABEL[r] || r), "Σ Partidos", "Extra", "Bono", "TOTAL"];
  heads.forEach((h, ci) => { wc.getCell(2, ci + 1).value = h; styleCell(wc.getCell(2, ci + 1), { fill: SUB_FILL, font: HDR_FONT }); });
  const lastRow = 2 + PLAYERS.length;
  PLAYERS.forEach((p, i) => {
    const R = 3 + i;
    wc.getCell(R, 1).value = { formula: `RANK(${totalL}${R},$${totalL}$3:$${totalL}$${lastRow})` };
    wc.getCell(R, 2).value = p;
    ROUNDS.forEach((r, k) => {
      const { pcol, f0, f1 } = ptsCol[`${r}|${p}`];
      wc.getCell(R, firstRoundCol + k).value = { formula: `SUM('${r}'!${pcol}${f0}:${pcol}${f1})` };
    });
    wc.getCell(R, sumCol).value = { formula: `SUM(${firstRoundL}${R}:${lastRoundL}${R})` };
    wc.getCell(R, extraCol).value = { formula: `'Apuestas Extra'!B${extraPtsRow[p]}` };
    wc.getCell(R, bonusCol).value = bonus[p] || 0;
    wc.getCell(R, totalCol).value = { formula: `${sumL}${R}+${extraL}${R}+${bonusL}${R}` };
    styleCell(wc.getCell(R, 1), { font: BOLD });
    styleCell(wc.getCell(R, 2), { font: BOLD, align: LEFT });
    for (let ci = 3; ci < totalCol; ci++) styleCell(wc.getCell(R, ci));
    styleCell(wc.getCell(R, totalCol), { fill: TOT_FILL, font: BOLD });
  });
  wc.getColumn(1).width = 8; wc.getColumn(2).width = 14;
  for (let ci = 3; ci <= totalCol; ci++) wc.getColumn(ci).width = 11;
  const nr = 3 + PLAYERS.length + 1;
  wc.getCell(nr, 1).value = "Estado de entregas:"; wc.getCell(nr, 1).font = BOLD;
  wc.mergeCells(nr, 1, nr, 8);
  PLAYERS.forEach((p, i) => {
    const done = ROUNDS.filter((r) => Object.keys(preds[p][r]).length > 0);
    const exDone = ["goleador", "mvp", "campeon", "fin1", "fin2"].some((k) => extra[p] && extra[p][k]);
    const estado = done.map((d) => d.replace("ornada ", "")).join(", ") || "—";
    wc.getCell(nr + 1 + i, 1).value = `${p}: ${estado}${exDone ? " + Extra" : ""}`;
    wc.mergeCells(nr + 1 + i, 1, nr + 1 + i, 8);
  });

  // ============ LÉEME (admin) ============
  const wi = wb.addWorksheet("LÉEME (admin)", { views: [{ showGridLines: false }] });
  const lines = [
    "PORRA MUNDIAL 2026 · EXCEL GENERAL (administrador)",
    "",
    "COMO USARLO:",
    "1) Cuando termine una jornada, ve a la hoja 'Jornada 1/2/3' (o 32avos/8vos/4tos) y rellena las",
    "   columnas amarillas GL y GV (goles reales) de cada partido.",
    "2) Los puntos de cada jugador se calculan SOLOS (columna 'Pts').",
    "3) La hoja 'Clasificación' se actualiza automaticamente.",
    "",
    "PUNTUACION (regla euro):",
    "  · 1 punto = aciertas el ganador (o el empate).",
    "  · 2 puntos = aciertas el resultado EXACTO.",
    "  · +1 por máximo goleador · +1 MVP · +1 campeón · +1 por cada finalista.",
    "",
    "APUESTAS EXTRA: en la hoja 'Apuestas Extra', columna 'REAL (admin)',",
    "  escribe el goleador, MVP, campeón y los 2 finalistas reales al acabar.",
    "",
    "REGENERAR: la fuente de verdad es porra_data.json. Este PC no tiene Python,",
    "  asi que el Excel se regenera con:  node generar_general.js",
  ];
  lines.forEach((t, idx) => {
    const i = idx + 1;
    const c = wi.getCell(i, 1); c.value = t;
    if (i === 1) c.font = { bold: true, size: 13, color: { argb: "FF1F4E78" } };
    else if (t.endsWith(":") || /^(COMO|PUNTU|APUEST|REGEN)/.test(t)) c.font = BOLD;
  });
  wi.getColumn(1).width = 80;

  const out = path.join(BASE, "Porra_Mundial2026_GENERAL.xlsx");
  return wb.xlsx.writeFile(out).then(() => {
    console.log("OK ->", out);
    const submitted = {};
    for (const p of PLAYERS) submitted[p] = JORNADAS.reduce((a, j) => a + Object.keys(preds[p][j]).length, 0);
    console.log("Predicciones grupos por jugador:", JSON.stringify(submitted));
    const totRes = ROUNDS.reduce((a, r) => a + Object.keys(resultados[r]).length, 0);
    console.log(`Resultados reales cargados: ${totRes}`);
    console.log("Rondas incluidas:", ROUNDS.join(", "));
  });
}

build().catch((e) => { console.error("ERROR:", e); process.exit(1); });
