#!/usr/bin/env bash
# Despliega la app de la porra en Vercel.
# Uso: en Git Bash, dentro de la carpeta web/:  bash deploy.sh
set -e
cd "$(dirname "$0")"

# Arreglo del problema de certificados de tu red (mismo que usamos con npm)
export NODE_OPTIONS=--use-system-ca

echo "==> Comprobando sesion de Vercel..."
if ! npx vercel whoami >/dev/null 2>&1; then
  echo "==> No has iniciado sesion. Abriendo login (confirma en el navegador/email)..."
  npx vercel login
fi

echo "==> Desplegando a produccion..."
npx vercel --prod --yes

echo ""
echo "==> Listo. La URL de arriba es tu app en tiempo real."
echo "    Para futuras actualizaciones: vuelve a ejecutar  bash deploy.sh"
