# 🏆 Porra Mundial 2026

**La porra del Mundial de mi grupo de amigos: Excel para apostar, un script que lo junta todo y una web con la clasificación en directo.**

![Next.js](https://img.shields.io/badge/Next.js-16-000?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Python](https://img.shields.io/badge/Python-openpyxl-3776AB?logo=python&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-exceljs-339933?logo=nodedotjs&logoColor=white)
![Excel](https://img.shields.io/badge/Excel-217346?logo=microsoftexcel&logoColor=white)
![Vercel](https://img.shields.io/badge/deploy-Vercel-000?logo=vercel)

## 👉 Demo: [web-nu-ten-72.vercel.app](https://web-nu-ten-72.vercel.app)

[![Ver la demo](https://img.shields.io/badge/Abrir%20la%20porra-web--nu--ten--72.vercel.app-1F4E78?style=for-the-badge&logo=vercel)](https://web-nu-ten-72.vercel.app)

Es la porra real que jugamos seis amigos (aquí anonimizados como Jugador 1 … Jugador 6) durante todo el Mundial 2026, desde la primera jornada de grupos hasta la final.

---

## ✨ Cómo funciona

```
 Cada jugador                    Administrador                     Todos
┌──────────────────┐   envía   ┌──────────────────────┐  publica  ┌─────────────────┐
│ Su Excel con     │ ───────▶ │ generar_general.py   │ ───────▶ │ Web en Vercel   │
│ hojas bloqueadas │           │ junta predicciones,  │           │ clasificación,  │
│ por jornada      │           │ resultados y puntos  │           │ pronósticos y   │
└──────────────────┘           └──────────────────────┘           │ entregas        │
                                  │           │                   └─────────────────┘
                                  ▼           ▼
                     Excel GENERAL    porra_data.json
```

1. **Un Excel por jugador.** Cada uno recibe `Porra_Mundial2026_<Nombre>.xlsx`. Las hojas de cada jornada y la de apuestas extra están protegidas y se desbloquean con una clave que el administrador reparte cuando toca, así nadie apuesta con ventaja.
2. **Un generador que lo junta todo.** `generar_general.py` lee los Excel de todos, construye `Porra_Mundial2026_GENERAL.xlsx` (con fórmulas que calculan los puntos solas en cuanto se meten los resultados reales) y exporta `porra_data.json`. `generar_general.js` hace lo mismo en Node para equipos sin Python.
3. **Una web para mirar.** La app de Next.js lee ese JSON y muestra la clasificación, los pronósticos de cada partido con los aciertos marcados, las apuestas extra y quién ha entregado cada jornada.

### Puntuación (la "regla euro")

| Qué | Puntos |
|---|---|
| Aciertas el ganador o el empate | 1 |
| Aciertas el resultado exacto | 2 |
| Máximo goleador, MVP, campeón | +1 cada uno |
| Cada finalista acertado | +1 |

La lógica está duplicada a propósito en `web/lib/scoring.js` y en las fórmulas del Excel general, para que ambos den siempre el mismo resultado.

## 🗂️ Estructura

```
generar_general.py        Generador principal (Python + openpyxl)
generar_general.js        El mismo generador en Node (exceljs)
porra_data.json           Fuente de verdad: partidos, predicciones, resultados, extras
Porra_Mundial2026_GENERAL.xlsx   Excel del administrador, con la clasificación
<Jugador>/Porra_Mundial2026_<Jugador>.xlsx   Excel de cada jugador
web/
  app/page.js             Pestañas: clasificación, cada ronda, extras, entregas
  lib/scoring.js          Cálculo de puntos
  data/porra_data.json    Copia que lee la web (la escribe el generador)
  deploy.sh               Publicar en Vercel
```

## 🚀 Ejecutarlo en local

```bash
git clone https://github.com/joorjozc/porra-mundial-2026.git
cd porra-mundial-2026/web
npm install
npm run dev
```

Abre `http://localhost:3000`.

### Actualizar tras cada jornada

1. Mete los resultados reales en `Porra_Mundial2026_GENERAL.xlsx` o en `porra_data.json`, en el campo `resultados`, con el formato `{ "Jornada 1": { "1": [goles_local, goles_visitante], ... } }` (la clave es el número de partido). Los extras reales van en `extra_real`.
2. Regenera los datos:
   ```bash
   pip install openpyxl
   python generar_general.py        # o: npm install && node generar_general.js
   ```
3. Vuelve a publicar la web (ver abajo).

## 🧑‍🤝‍🧑 Monta tu propia porra

Sirve para cualquier torneo: Mundial, Eurocopa, Champions o tu liga. La forma más rápida es pedírselo a [Claude Code](https://claude.com/claude-code). Clona el repositorio, entra en la carpeta, ejecuta `claude` y pega este prompt rellenando lo que va entre corchetes:

```text
Quiero reutilizar esta porra (esta carpeta) para otro torneo. Datos:

- Torneo: [Eurocopa 2028 / Champions 25-26 / ...]
- Jugadores: [nombres separados por comas]
- Rondas: [p. ej. Jornada 1, Jornada 2, Jornada 3, octavos, cuartos, semis, final]
- Partidos: [pégalos o dime de dónde sacarlos, con fecha, grupo, local y visitante]
- Puntuación: [la misma regla euro / cámbiala así: ...]
- Apuestas extra: [goleador, MVP, campeón, finalistas / otras]

Hazlo en este orden y enséñame el resultado de cada paso antes de seguir:
1. Actualiza porra_data.json con los jugadores, las reglas y los partidos,
   dejando vacíos predicciones, resultados y extras.
2. Cambia PLAYERS, JORNADAS y KO_ROUNDS en generar_general.py,
   generar_general.js y web/lib/scoring.js para que coincidan.
3. Crea una carpeta por jugador con su Excel
   <Jugador>/Porra_<Torneo>_<Jugador>.xlsx: una hoja por ronda con los
   partidos y las casillas de goles en amarillo, más una hoja "Extra".
   Protege cada hoja con una clave distinta y dame la lista de claves
   aparte (no las guardes en el repositorio).
4. Cambia el título y los textos de la web (web/app/layout.js y
   web/app/page.js) y los nombres de los ficheros en los generadores.
5. Ejecuta el generador, luego "npm install" y "npm run build" en web/,
   y comprueba que la web arranca sin errores.

No inventes partidos ni fechas: si no los tienes claros, pregúntame.
```

## 📦 Publicarlo

Con una cuenta gratuita de [Vercel](https://vercel.com):

```bash
cd web
npx vercel --prod
```

La primera vez te pide iniciar sesión y ponerle nombre al proyecto, y al terminar te da la dirección para compartir con el grupo. En Git Bash también vale `bash deploy.sh`.

Otra opción: en vercel.com, **New Project**, importa este repositorio y pon `web` como **Root Directory**. A partir de ahí, cada `git push` publica solo.

## 📄 Licencia

[MIT](LICENSE) © 2026 Jorge
