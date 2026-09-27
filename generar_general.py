# -*- coding: utf-8 -*-
"""
Genera el Excel GENERAL de la Porra Mundial 2026 consolidando las
predicciones de todos los jugadores y calculando puntos (regla euro)
de forma automatica cuando el administrador rellena los resultados reales.

Reutilizable: vuelve a ejecutarlo cuando lleguen porras nuevas o nuevas
jornadas. Lee cada Porra_Mundial2026_<Nombre>.xlsx y reconstruye el general.
"""
import os, json, warnings
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
warnings.filterwarnings("ignore")

BASE = os.path.dirname(os.path.abspath(__file__))
PLAYERS = ["Jugador 1", "Jugador 2", "Jugador 3", "Jugador 4", "Jugador 5", "Jugador 6"]
JORNADAS = ["Jornada 1", "Jornada 2", "Jornada 3"]   # fase de grupos: predicciones en los xlsx de cada jugador
KO_ROUNDS = ["32avos", "octavos"]                      # eliminatorias: fixtures+predicciones+resultados viven en porra_data.json
ROUNDS = JORNADAS + KO_ROUNDS                          # todas las "hojas-jornada" del general, en orden
# etiqueta corta para la cabecera de la hoja Clasificación
ROUND_LABEL = {"Jornada 1": "J1", "Jornada 2": "J2", "Jornada 3": "J3", "32avos": "32avos", "octavos": "8vos"}

# ---- Estilos ----
HDR_FILL   = PatternFill("solid", fgColor="1F4E78")  # azul oscuro
SUB_FILL   = PatternFill("solid", fgColor="2E75B6")  # azul
INPUT_FILL = PatternFill("solid", fgColor="FFF2CC")  # amarillo (input admin)
TOT_FILL   = PatternFill("solid", fgColor="D9E1F2")  # azul claro
EXACT_FILL = PatternFill("solid", fgColor="C6EFCE")  # verde
HDR_FONT   = Font(bold=True, color="FFFFFF")
BOLD       = Font(bold=True)
CENTER     = Alignment(horizontal="center", vertical="center")
THIN = Side(style="thin", color="BFBFBF")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)


def read_players():
    """Devuelve fixtures, predicciones y apuestas extra de cada jugador."""
    fixtures = {r: [] for r in ROUNDS}   # lista de (no, grupo, local, vis); KO se rellena luego desde el JSON
    preds = {p: {r: {} for r in ROUNDS} for p in PLAYERS}  # KO se rellena luego desde el JSON
    extra = {p: {} for p in PLAYERS}
    fixtures_loaded = False
    for p in PLAYERS:
        f = os.path.join(BASE, p, f"Porra_Mundial2026_{p}.xlsx")
        if not os.path.exists(f):
            print("  !! falta archivo de", p)
            continue
        wb = openpyxl.load_workbook(f, data_only=True)
        for j in JORNADAS:
            ws = wb[j]
            for r in range(2, 26):
                no = ws.cell(r, 1).value
                if no is not None:
                    no = int(no)  # algunos archivos lo guardan como float (1.0)
                grupo = ws.cell(r, 2).value
                local = ws.cell(r, 3).value
                vis = ws.cell(r, 6).value
                gl = ws.cell(r, 4).value
                gv = ws.cell(r, 5).value
                if not fixtures_loaded and no is not None:
                    fixtures[j].append((no, grupo, local, vis))
                if gl is not None and gv is not None:
                    preds[p][j][no] = (int(gl), int(gv))
        ex = wb["Extra"]
        extra[p] = {
            "goleador": ex.cell(3, 2).value,
            "mvp": ex.cell(4, 2).value,
            "campeon": ex.cell(5, 2).value,
            "fin1": ex.cell(6, 2).value,
            "fin2": ex.cell(7, 2).value,
        }
        fixtures_loaded = True
    return fixtures, preds, extra


def style_cell(c, fill=None, font=None, align=CENTER, border=True):
    if fill: c.fill = fill
    if font: c.font = font
    if align: c.alignment = align
    if border: c.border = BORDER


def build():
    fixtures, preds, extra = read_players()
    submitted = {p: sum(len(preds[p][j]) for j in JORNADAS) for p in PLAYERS}
    print("Predicciones por jugador (nº partidos):", submitted)

    # Cargar del JSON (fuente de verdad): resultados reales de TODAS las rondas,
    # y además fixtures + predicciones de las eliminatorias (que no están en los xlsx).
    prior_res = {r: {} for r in ROUNDS}
    prior_extra_real = {"goleador": None, "mvp": None, "campeon": None, "fin1": None, "fin2": None}
    prior_bonus = {p: 0 for p in PLAYERS}  # bonos manuales del admin (puntos de gracia, etc.)
    jpath = os.path.join(BASE, "porra_data.json")
    if os.path.exists(jpath):
        try:
            with open(jpath, encoding="utf-8") as fh:
                old = json.load(fh)
            for r in ROUNDS:
                for no, gg in (old.get("resultados", {}).get(r, {}) or {}).items():
                    prior_res[r][int(no)] = (gg[0], gg[1])
            if any((old.get("extra_real") or {}).values()):
                prior_extra_real = old["extra_real"]
            for p, b in (old.get("bonus") or {}).items():
                if p in prior_bonus:
                    prior_bonus[p] = b
            tot = sum(len(prior_res[r]) for r in ROUNDS)
            if tot:
                print(f"  ({tot} resultados reales cargados del JSON)")
            # Eliminatorias: fixtures y predicciones viven solo en el JSON
            for r in KO_ROUNDS:
                for m in (old.get("fixtures", {}).get(r, []) or []):
                    fixtures[r].append((int(m["no"]), m.get("grupo", ""), m["local"], m["visitante"]))
                for p in PLAYERS:
                    for no, gg in (old.get("predicciones", {}).get(p, {}).get(r, {}) or {}).items():
                        preds[p][r][int(no)] = (int(gg[0]), int(gg[1]))
        except Exception as e:
            print("  aviso: no pude leer JSON previo:", e)

    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    # ============ Hojas de jornada ============
    # cols fijas: 1 No,2 Grupo,3 LOCAL,4 VISITANTE,5 GL(real),6 GV(real)
    # por jugador i: GL=7+i*3, GV=8+i*3, Pts=9+i*3
    pts_col = {}  # (jornada, player) -> col letter de la columna Pts
    for j in ROUNDS:
        ws = wb.create_sheet(j)
        ws.sheet_view.showGridLines = False
        # fila 1: grupos de cabecera
        ws.cell(1, 1, "PARTIDO"); ws.merge_cells("A1:D1")
        ws.cell(1, 5, "RESULTADO REAL"); ws.merge_cells("E1:F1")
        for i, p in enumerate(PLAYERS):
            c0 = 7 + i * 3
            ws.cell(1, c0, p)
            ws.merge_cells(start_row=1, start_column=c0, end_row=1, end_column=c0 + 2)
        # fila 2: subcabeceras
        subs = ["Nº", "Grupo", "LOCAL", "VISITANTE", "GL", "GV"]
        for ci, t in enumerate(subs, 1):
            ws.cell(2, ci, t)
        for i, p in enumerate(PLAYERS):
            c0 = 7 + i * 3
            ws.cell(2, c0, "GL"); ws.cell(2, c0 + 1, "GV"); ws.cell(2, c0 + 2, "Pts")
        # estilo cabeceras
        for ci in range(1, 7 + len(PLAYERS) * 3):
            style_cell(ws.cell(1, ci), HDR_FILL, HDR_FONT)
            style_cell(ws.cell(2, ci), SUB_FILL, HDR_FONT)
        # datos
        first = 3
        for ridx, (no, grupo, local, vis) in enumerate(fixtures[j]):
            R = first + ridx
            ws.cell(R, 1, no); ws.cell(R, 2, grupo)
            ws.cell(R, 3, local); ws.cell(R, 4, vis)
            style_cell(ws.cell(R, 1)); style_cell(ws.cell(R, 2))
            style_cell(ws.cell(R, 3), align=Alignment(horizontal="left"))
            style_cell(ws.cell(R, 4), align=Alignment(horizontal="left"))
            # resultado real (input amarillo) — precargado desde el JSON si existe
            rr = prior_res[j].get(no)
            if rr:
                ws.cell(R, 5, rr[0]); ws.cell(R, 6, rr[1])
            style_cell(ws.cell(R, 5), INPUT_FILL); style_cell(ws.cell(R, 6), INPUT_FILL)
            for i, p in enumerate(PLAYERS):
                c0 = 7 + i * 3
                pr = preds[p][j].get(no)
                if pr:
                    ws.cell(R, c0, pr[0]); ws.cell(R, c0 + 1, pr[1])
                style_cell(ws.cell(R, c0)); style_cell(ws.cell(R, c0 + 1))
                gl = f"{get_column_letter(c0)}{R}"
                gv = f"{get_column_letter(c0 + 1)}{R}"
                f = (f'=IF(OR($E{R}="",$F{R}=""),"",'
                     f'IF(OR({gl}="",{gv}=""),"",'
                     f'IF(AND({gl}=$E{R},{gv}=$F{R}),2,'
                     f'IF(SIGN({gl}-{gv})=SIGN($E{R}-$F{R}),1,0))))')
                pc = ws.cell(R, c0 + 2, f)
                style_cell(pc, font=BOLD)
        # fila totales
        TR = first + len(fixtures[j])
        ws.cell(TR, 4, "PUNTOS JORNADA")
        style_cell(ws.cell(TR, 4), TOT_FILL, BOLD, Alignment(horizontal="right"))
        for ci in range(1, 4):
            style_cell(ws.cell(TR, ci), TOT_FILL)
        style_cell(ws.cell(TR, 5), TOT_FILL); style_cell(ws.cell(TR, 6), TOT_FILL)
        for i, p in enumerate(PLAYERS):
            c0 = 7 + i * 3
            pcol = get_column_letter(c0 + 2)
            ws.cell(TR, c0, "")
            ws.cell(TR, c0 + 1, "")
            tc = ws.cell(TR, c0 + 2, f"=SUM({pcol}{first}:{pcol}{TR-1})")
            style_cell(ws.cell(TR, c0), TOT_FILL)
            style_cell(ws.cell(TR, c0 + 1), TOT_FILL)
            style_cell(tc, TOT_FILL, BOLD)
            pts_col[(j, p)] = (pcol, first, TR - 1, TR)
        # anchos y freeze
        ws.column_dimensions["A"].width = 4
        ws.column_dimensions["B"].width = 6
        ws.column_dimensions["C"].width = 16
        ws.column_dimensions["D"].width = 16
        for ci in range(5, 7 + len(PLAYERS) * 3):
            ws.column_dimensions[get_column_letter(ci)].width = 5
        ws.freeze_panes = "G3"

    # ============ Apuestas Extra ============
    we = wb.create_sheet("Apuestas Extra")
    we.sheet_view.showGridLines = False
    we.cell(1, 1, "APUESTAS EXTRA  (1 punto por acierto · se resuelven al final del torneo)")
    we.merge_cells(start_row=1, start_column=1, end_row=1, end_column=2 + len(PLAYERS))
    style_cell(we.cell(1, 1), HDR_FILL, HDR_FONT, Alignment(horizontal="left"))
    we.cell(2, 1, "Concepto"); we.cell(2, 2, "REAL (admin)")
    for i, p in enumerate(PLAYERS):
        we.cell(2, 3 + i, p)
    for ci in range(1, 3 + len(PLAYERS)):
        style_cell(we.cell(2, ci), SUB_FILL, HDR_FONT)
    conceptos = [("goleador", "Máximo goleador"), ("mvp", "MVP del torneo"),
                 ("campeon", "Campeón"), ("fin1", "Finalista 1"), ("fin2", "Finalista 2")]
    for ri, (key, label) in enumerate(conceptos):
        R = 3 + ri
        we.cell(R, 1, label); style_cell(we.cell(R, 1), font=BOLD, align=Alignment(horizontal="left"))
        style_cell(we.cell(R, 2), INPUT_FILL)  # real, input
        for i, p in enumerate(PLAYERS):
            we.cell(R, 3 + i, extra[p].get(key))
            style_cell(we.cell(R, 3 + i), align=Alignment(horizontal="left"))
    # bloque puntos extra por jugador
    we.cell(9, 1, "PUNTOS EXTRA POR JUGADOR"); style_cell(we.cell(9, 1), TOT_FILL, BOLD, Alignment(horizontal="left"))
    we.merge_cells("A9:B9")
    extra_pts_row = {}
    for i, p in enumerate(PLAYERS):
        R = 10 + i
        PL = get_column_letter(3 + i)
        we.cell(R, 1, p); style_cell(we.cell(R, 1), font=BOLD, align=Alignment(horizontal="left"))
        f = (f'=IF($B$3<>"",IF({PL}3=$B$3,1,0),0)'
             f'+IF($B$4<>"",IF({PL}4=$B$4,1,0),0)'
             f'+IF($B$5<>"",IF({PL}5=$B$5,1,0),0)'
             f'+IF($B$6<>"",IF(OR({PL}6=$B$6,{PL}6=$B$7),1,0),0)'
             f'+IF($B$7<>"",IF(OR({PL}7=$B$6,{PL}7=$B$7),1,0),0)')
        we.cell(R, 2, f); style_cell(we.cell(R, 2), TOT_FILL, BOLD)
        extra_pts_row[p] = R
    we.column_dimensions["A"].width = 18
    we.column_dimensions["B"].width = 16
    for i in range(len(PLAYERS)):
        we.column_dimensions[get_column_letter(3 + i)].width = 16

    # ============ Clasificacion ============
    wc = wb.create_sheet("Clasificación", 0)
    wc.sheet_view.showGridLines = False
    nrounds = len(ROUNDS)
    # columnas: 1 Puesto · 2 Jugador · 3..(2+n) una por ronda · Σ · Extra · TOTAL
    first_round_col = 3
    sum_col = first_round_col + nrounds      # Σ Partidos
    extra_col = sum_col + 1                   # Extra
    bonus_col = sum_col + 2                   # Bono (manual admin)
    total_col = sum_col + 3                   # TOTAL
    sum_L = get_column_letter(sum_col)
    extra_L = get_column_letter(extra_col)
    bonus_L = get_column_letter(bonus_col)
    total_L = get_column_letter(total_col)
    first_round_L = get_column_letter(first_round_col)
    last_round_L = get_column_letter(sum_col - 1)
    wc.cell(1, 1, "CLASIFICACIÓN GENERAL · PORRA MUNDIAL 2026")
    wc.merge_cells(start_row=1, start_column=1, end_row=1, end_column=total_col)
    style_cell(wc.cell(1, 1), HDR_FILL, HDR_FONT, Alignment(horizontal="left"))
    heads = ["Puesto", "Jugador"] + [ROUND_LABEL.get(r, r) for r in ROUNDS] + ["Σ Partidos", "Extra", "Bono", "TOTAL"]
    for ci, h in enumerate(heads, 1):
        wc.cell(2, ci, h); style_cell(wc.cell(2, ci), SUB_FILL, HDR_FONT)
    last_row = 2 + len(PLAYERS)
    for i, p in enumerate(PLAYERS):
        R = 3 + i
        wc.cell(R, 1, f"=RANK({total_L}{R},${total_L}$3:${total_L}${last_row})")
        wc.cell(R, 2, p)
        # una columna por ronda, sumando las celdas Pts de su hoja
        for k, r in enumerate(ROUNDS):
            pcol, f0, f1, _ = pts_col[(r, p)]
            wc.cell(R, first_round_col + k, f"=SUM('{r}'!{pcol}{f0}:{pcol}{f1})")
        wc.cell(R, sum_col, f"=SUM({first_round_L}{R}:{last_round_L}{R})")
        wc.cell(R, extra_col, f"='Apuestas Extra'!B{extra_pts_row[p]}")
        wc.cell(R, bonus_col, prior_bonus.get(p, 0))
        wc.cell(R, total_col, f"={sum_L}{R}+{extra_L}{R}+{bonus_L}{R}")
        style_cell(wc.cell(R, 1), font=BOLD)
        style_cell(wc.cell(R, 2), font=BOLD, align=Alignment(horizontal="left"))
        for ci in range(3, total_col):
            style_cell(wc.cell(R, ci))
        style_cell(wc.cell(R, total_col), TOT_FILL, BOLD)
    wc.column_dimensions["A"].width = 8
    wc.column_dimensions["B"].width = 14
    for ci in range(3, total_col + 1):
        wc.column_dimensions[get_column_letter(ci)].width = 11
    # nota estado de entregas
    nr = 3 + len(PLAYERS) + 1
    wc.cell(nr, 1, "Estado de entregas:"); wc.cell(nr, 1).font = BOLD
    wc.merge_cells(start_row=nr, start_column=1, end_row=nr, end_column=8)
    for i, p in enumerate(PLAYERS):
        done = [r for r in ROUNDS if preds[p][r]]
        ex_done = any(extra[p].get(k) for k in ("goleador", "mvp", "campeon", "fin1", "fin2"))
        estado = ", ".join([d.replace("ornada ", "") for d in done]) or "—"
        wc.cell(nr + 1 + i, 1, f"{p}: {estado}{' + Extra' if ex_done else ''}")
        wc.merge_cells(start_row=nr + 1 + i, start_column=1, end_row=nr + 1 + i, end_column=8)

    # ============ Instrucciones admin ============
    wi = wb.create_sheet("LÉEME (admin)")
    wi.sheet_view.showGridLines = False
    lines = [
        "PORRA MUNDIAL 2026 · EXCEL GENERAL (administrador)",
        "",
        "COMO USARLO:",
        "1) Cuando termine una jornada, ve a la hoja 'Jornada 1/2/3' y rellena las",
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
        "REGENERAR: si llegan porras nuevas o nuevas jornadas, vuelve a ejecutar",
        "  generar_general.py (recoge automaticamente todos los archivos de jugador).",
    ]
    for i, t in enumerate(lines, 1):
        c = wi.cell(i, 1, t)
        if i == 1:
            c.font = Font(bold=True, size=13, color="1F4E78")
        elif t.endswith(":") or t.startswith(("COMO", "PUNTU", "APUEST", "REGEN")):
            c.font = BOLD
    wi.column_dimensions["A"].width = 80

    out = os.path.join(BASE, "Porra_Mundial2026_GENERAL.xlsx")
    wb.save(out)
    print("OK ->", out)

    # ============ Export JSON (para futura app Vercel) ============
    data = {
        "players": PLAYERS,
        "rules": {"acierto": 1, "exacto": 2, "extra": ["goleador", "mvp", "campeon", "finalista", "finalista"]},
        "fixtures": {r: [{"no": no, "grupo": g, "local": l, "visitante": v}
                          for (no, g, l, v) in fixtures[r]] for r in ROUNDS},
        "predicciones": {p: {r: {str(no): list(preds[p][r][no]) for no in preds[p][r]}
                              for r in ROUNDS} for p in PLAYERS},
        "extra": extra,
        # resultados reales (fuente de verdad cargada al inicio); formato {"1":[gl,gv],...}
        "resultados": {r: {str(no): [gl, gv] for no, (gl, gv) in prior_res[r].items()}
                       for r in ROUNDS},
        "extra_real": prior_extra_real,
        "bonus": {p: prior_bonus.get(p, 0) for p in PLAYERS},
    }
    with open(jpath, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
    print("OK ->", jpath)
    # Copia para la app web (si existe la carpeta)
    web_data = os.path.join(BASE, "web", "data")
    if os.path.isdir(web_data):
        with open(os.path.join(web_data, "porra_data.json"), "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)
        print("OK -> web/data/porra_data.json")


if __name__ == "__main__":
    build()
