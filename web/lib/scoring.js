// Logica de puntuacion "regla euro" — debe coincidir con el Excel general.
//  - 1 punto si aciertas el ganador (o el empate)
//  - 2 puntos si aciertas el resultado exacto
//  - Extra (al final): +1 goleador, +1 MVP, +1 campeon, +1 por cada finalista

export const JORNADAS = ["Jornada 1", "Jornada 2", "Jornada 3"]; // fase de grupos
export const KO_ROUNDS = ["32avos", "octavos", "cuartos", "semis", "final"]; // eliminatorias
export const ROUNDS = [...JORNADAS, ...KO_ROUNDS]; // todas las rondas, en orden
// etiqueta corta para la cabecera de la clasificación
export const ROUND_LABEL = {
  "Jornada 1": "J1",
  "Jornada 2": "J2",
  "Jornada 3": "J3",
  "32avos": "32avos",
  "octavos": "8vos",
  "cuartos": "4tos",
  "semis": "Semis",
  "final": "Final",
};

function sign(n) {
  return n > 0 ? 1 : n < 0 ? -1 : 0;
}

// Puntos de un pronostico [gl,gv] frente a un resultado real [gl,gv].
export function matchPoints(pred, real) {
  if (!pred || !real) return null; // null = sin datos
  const [pgl, pgv] = pred;
  const [rgl, rgv] = real;
  if (pgl === rgl && pgv === rgv) return 2;
  if (sign(pgl - pgv) === sign(rgl - rgv)) return 1;
  return 0;
}

// Puntos extra de un jugador segun los resultados reales.
export function extraPoints(playerExtra, extraReal) {
  if (!playerExtra || !extraReal) return 0;
  let pts = 0;
  if (extraReal.goleador && playerExtra.goleador === extraReal.goleador) pts++;
  if (extraReal.mvp && playerExtra.mvp === extraReal.mvp) pts++;
  if (extraReal.campeon && playerExtra.campeon === extraReal.campeon) pts++;
  const finalistas = [extraReal.fin1, extraReal.fin2].filter(Boolean);
  if (finalistas.length) {
    if (playerExtra.fin1 && finalistas.includes(playerExtra.fin1)) pts++;
    if (playerExtra.fin2 && finalistas.includes(playerExtra.fin2)) pts++;
  }
  return pts;
}

// Calcula puntos por jornada de un jugador.
export function jornadaPoints(data, player, jornada) {
  const preds = data.predicciones?.[player]?.[jornada] || {};
  const reals = data.resultados?.[jornada] || {};
  let total = 0;
  let scored = 0;
  for (const no of Object.keys(reals)) {
    const p = matchPoints(preds[no], reals[no]);
    if (p !== null) {
      total += p;
      scored++;
    }
  }
  return { total, scored };
}

// Tabla de clasificacion ordenada con puesto (empates comparten puesto).
export function standings(data) {
  const rows = data.players.map((player) => {
    const jorn = {};
    let partidos = 0;
    for (const j of ROUNDS) {
      const { total } = jornadaPoints(data, player, j);
      jorn[j] = total;
      partidos += total;
    }
    const extra = extraPoints(data.extra?.[player], data.extra_real);
    const bonus = data.bonus?.[player] || 0;
    return { player, jorn, partidos, extra, bonus, total: partidos + extra + bonus };
  });
  rows.sort((a, b) => b.total - a.total || a.player.localeCompare(b.player));
  let lastTotal = null;
  let lastRank = 0;
  rows.forEach((r, i) => {
    if (r.total !== lastTotal) {
      lastRank = i + 1;
      lastTotal = r.total;
    }
    r.rank = lastRank;
  });
  return rows;
}

// ¿Se ha rellenado algun resultado en una jornada?
export function jornadaHasResults(data, jornada) {
  return Object.keys(data.resultados?.[jornada] || {}).length > 0;
}

// ¿Que jugadores han entregado pronostico para una jornada?
export function submittedFor(data, jornada) {
  return data.players.filter(
    (p) => Object.keys(data.predicciones?.[p]?.[jornada] || {}).length > 0
  );
}
