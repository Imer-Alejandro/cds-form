#!/bin/bash

echo "🚀 Inicializando CDS Form..."
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local no encontrado"
    echo "Por favor, crea .env.local con DATABASE_URL"
    exit 1
fi

echo "📦 Instalando dependencias..."
npm install

echo ""
echo "🔧 Generando cliente Prisma..."
npx prisma generate

echo ""
echo "🗄️ Ejecutando migraciones..."
npx prisma migrate deploy

echo ""
echo "✅ Inicialización completada"
echo ""
echo "Próximos pasos:"
echo "1. npm run dev - Inicia el servidor de desarrollo"
echo "2. Abre http://localhost:3000 en tu navegador"
echo "3. ¡Comienza a crear encuestas!"
