#!/bin/bash

echo "🚀 Iniciando deployment de Epikom Hub..."

# Ir al directorio
cd /var/www/epikom-hub

# Pull cambios (si usas git)
# git pull origin main

# Instalar dependencias nuevas
echo "📦 Instalando dependencias..."
npm install

# Build
echo "🔨 Creando build de producción..."
npm run build

# Reload PM2 sin downtime
echo "♻️ Reiniciando aplicación..."
pm2 reload epikom-hub

echo "✅ Deployment completado!"
echo "🔍 Verificando estado..."
pm2 status
