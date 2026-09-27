"use client";

import { useState } from "react";
import data from "../data/porra_data.json";
import {
  ROUNDS,
  KO_ROUNDS,
  ROUND_LABEL,
  standings,
  matchPoints,
  jornadaHasResults,
  submittedFor,
  extraPoints,
} from "../lib/scoring";

const TABS = ["Clasificación", ...ROUNDS, "Extra", "Entregas"];

// Nombre a mostrar: en eliminatorias usamos la etiqueta corta (8vos, 4tos...)
function roundTitle(r) {
  return KO_ROUNDS.includes(r) ? ROUND_LABEL[r] || r : r;
}

export default function Home() {
  const [tab, setTab] = useState("Clasificación");

  return (
    <div className="wrap">
      <header className="hero">
        <h1>
          <span className="flag">🏆</span> Porra Mundial 2026
        </h1>
        <p>Regla euro · 1 punto acierto · 2 puntos resultado exacto</p>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t}
            className={"tab" + (tab === t ? " active" : "")}
            onClick={() => setTab(t)}
          >
            {roundTitle(t)}
          </button>
        ))}
      </nav>

      {tab === "Clasificación" && <Leaderboard />}
      {ROUNDS.includes(tab) && <Jornada jornada={tab} />}
      {tab === "Extra" && <Extra />}
      {tab === "Entregas" && <Entregas />}

      <footer>Actualizado al final de cada jornada · Porra de los colegas</footer>
    </div>
  );
}

function Leaderboard() {
  const rows = standings(data);
  const anyResults = ROUNDS.some((j) => jornadaHasResults(data, j));
  const anyBonus = rows.some((r) => r.bonus);
  const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };
  return (
    <div className="card">
      <h2>Clasificación general</h2>
      {!anyResults && (
        <p className="section-note">
          Aún no hay resultados cargados. La tabla se actualizará al terminar la primera jornada.
        </p>
      )}
      <table className="lead">
        <thead>
          <tr>
            <th>#</th>
            <th className="left">Jugador</th>
            {ROUNDS.map((r) => (
              <th key={r}>{ROUND_LABEL[r] || r}</th>
            ))}
            <th>Partidos</th>
            <th>Extra</th>
            {anyBonus && <th>Bono</th>}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.player} className={r.rank <= 3 && anyResults ? `r${r.rank}` : ""}>
              <td className="rank">
                {anyResults && medals[r.rank] ? (
                  <span className="medal">{medals[r.rank]}</span>
                ) : (
                  r.rank
                )}
              </td>
              <td className="name">{r.player}</td>
              {ROUNDS.map((j) => (
                <td key={j}>{r.jorn[j]}</td>
              ))}
              <td>{r.partidos}</td>
              <td>{r.extra}</td>
              {anyBonus && <td>{r.bonus}</td>}
              <td className="total">{r.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Jornada({ jornada }) {
  const fixtures = data.fixtures[jornada] || [];
  const reals = data.resultados?.[jornada] || {};
  const submitted = submittedFor(data, jornada);
  const hasResults = jornadaHasResults(data, jornada);

  if (submitted.length === 0) {
    return (
      <div className="card">
        <h2>{roundTitle(jornada)}</h2>
        <p className="empty">Todavía no hay pronósticos entregados para esta jornada.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>{roundTitle(jornada)}</h2>
      <p className="section-note">
        {hasResults
          ? "Resultados cargados. Verde = exacto (2 pts) · amarillo = ganador (1 pt)."
          : "Pronósticos de los participantes. Pendiente de resultados."}
      </p>
      {fixtures.map((m) => {
        const real = reals[String(m.no)];
        return (
          <div className="match-block" key={m.no}>
            <div className="match">
              <span className="grp">{m.grupo}</span>
              <span className="home">{m.local}</span>
              <span className={"score" + (real ? "" : " pending")}>
                {real ? `${real[0]} - ${real[1]}` : "vs"}
              </span>
              <span className="away">{m.visitante}</span>
            </div>
            <div className="preds">
              {data.players.map((p) => {
                const pred = data.predicciones?.[p]?.[jornada]?.[String(m.no)];
                if (!pred) return null;
                const pts = matchPoints(pred, real);
                const cls = pts === 2 ? " p2" : pts === 1 ? " p1" : "";
                return (
                  <span className={"chip" + cls} key={p}>
                    <b>{p}</b> {pred[0]}-{pred[1]}
                    {pts !== null && <span className="pts-badge">{pts}</span>}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Extra() {
  const er = data.extra_real || {};
  const fields = [
    ["goleador", "Máximo goleador"],
    ["mvp", "MVP del torneo"],
    ["campeon", "Campeón"],
    ["fin1", "Finalista 1"],
    ["fin2", "Finalista 2"],
  ];
  return (
    <>
      <div className="card">
        <h2>Resultados extra</h2>
        <p className="section-note">Se resuelven al final del torneo (+1 punto cada acierto).</p>
        <div className="extra-grid">
          {fields.map(([k, label]) => (
            <div className="extra-card" key={k}>
              <h3>{label}</h3>
              <div className={"real" + (er[k] ? "" : " pending")}>
                {er[k] || "Por decidir"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Apuestas de cada jugador</h2>
        <table>
          <thead>
            <tr>
              <th className="left">Jugador</th>
              <th>Goleador</th>
              <th>MVP</th>
              <th>Campeón</th>
              <th>Finalistas</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
            {data.players.map((p) => {
              const e = data.extra?.[p] || {};
              const has = e.goleador || e.mvp || e.campeon || e.fin1 || e.fin2;
              if (!has) return null;
              return (
                <tr key={p}>
                  <td className="left">
                    <b>{p}</b>
                  </td>
                  <td>{e.goleador || "—"}</td>
                  <td>{e.mvp || "—"}</td>
                  <td>{e.campeon || "—"}</td>
                  <td>
                    {[e.fin1, e.fin2].filter(Boolean).join(" / ") || "—"}
                  </td>
                  <td>
                    <b>{extraPoints(e, er)}</b>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Entregas() {
  return (
    <div className="card">
      <h2>Estado de entregas</h2>
      <p className="section-note">Quién ha mandado su porra de cada jornada.</p>
      <ul className="status-list">
        {data.players.map((p) => {
          const done = ROUNDS.filter(
            (j) => Object.keys(data.predicciones?.[p]?.[j] || {}).length > 0
          );
          const e = data.extra?.[p] || {};
          const exDone = e.goleador || e.mvp || e.campeon || e.fin1 || e.fin2;
          const labels = done.map((j) => ROUND_LABEL[j] || j);
          if (exDone) labels.push("Extra");
          return (
            <li key={p}>
              <span>{p}</span>
              <span className={labels.length ? "tag-ok" : "tag-no"}>
                {labels.length ? labels.join(" · ") : "Sin entregar"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
