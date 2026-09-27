# Porra Mundial 2026 — App web

App de Next.js para compartir la clasificación y los pronósticos de la porra.
Lee los datos de `data/porra_data.json` (lo genera `../generar_general.py`).

## Probar en local

```bash
cd web
npm install
npm run dev
```

Abre http://localhost:3000

## Actualizar los datos (tras cada jornada)

1. Mete los resultados reales en el Excel `Porra_Mundial2026_GENERAL.xlsx`
   (o pásaselos a Claude y los carga en `../porra_data.json`, campo `resultados`).
2. Ejecuta el generador para refrescar el JSON de la web:
   ```bash
   python ../generar_general.py
   ```
   (copia el JSON actualizado a `web/data/`).
3. Vuelve a desplegar (ver abajo).

El formato de `resultados` es: `{ "Jornada 1": { "1": [gl, gv], "2": [gl, gv], ... } }`
(la clave es el Nº de partido). Los extras van en `extra_real`.

## Desplegar en Vercel

### Opción A — con Git (recomendada)
1. Sube la carpeta `web/` a un repo de GitHub.
2. En vercel.com → New Project → importa el repo → Root Directory = `web`.
3. Framework: Next.js (se detecta solo). Deploy.
4. Cada vez que hagas `git push` se redespliega.

### Opción B — con la CLI
```bash
npm i -g vercel
cd web
vercel        # primera vez (configura el proyecto)
vercel --prod # publica en producción
```

## Puntuación (regla euro)
- 1 punto: aciertas el ganador (o el empate).
- 2 puntos: aciertas el resultado exacto.
- +1 por máximo goleador, +1 MVP, +1 campeón, +1 por cada finalista acertado.
