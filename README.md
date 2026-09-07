# SDC Form - Sistema de Encuestas de Satisfacción

Plataforma corporativa para crear, distribuir y analizar encuestas de satisfacción. Similar a Typeform pero optimizada para uso interno en organizaciones.

## Características

- **Creador de Encuestas**: 10 tipos de preguntas (texto, opción múltiple, rating, escala, NPS, fecha, email, departamento, etc.)
- **Dashboard con analíticas**: gráficos en tiempo real, tasa de finalización, sentimiento, NPS y comparativas
- **Respuestas tipo Typeform**: una pregunta a la vez, con barra de progreso y animaciones
- **Distribución**: enlace público, QR e invitaciones por email
- **Privacidad por departamento**: reglas de anonimato y umbral de participación configurable
- **Reportes por email**: resúmenes ejecutivos automáticos a responsables de área
- **Autenticación**: JWT propio con login por contraseña y enlace mágico

## Requisitos

- Node.js 18+
- CockroachDB (PostgreSQL compatible)
- Credenciales SMTP para el envío de correos

## Inicio rápido

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed       # (opcional) datos de ejemplo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Variables de entorno

Copia `.env.local`:

```env
DATABASE_URL="postgresql://usuario:password@host:26257/db?sslmode=verify-full"
AUTH_SECRET="genera-una-clave-secreta-fuerte"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="tu-email@gmail.com"
SMTP_PASSWORD="tu-contraseña-app"
```

> **Producción**: configura `AUTH_SECRET` con un valor aleatorio y seguro, y `NEXT_PUBLIC_BASE_URL` con la URL pública.

## Scripts

```bash
npm run dev              # Desarrollo con hot reload
npm run build            # Build de producción (prisma generate + next build)
npm start                # Servir build de producción
npm run lint             # ESLint
npm run prisma:migrate   # Crear migración Prisma
npm run db:push          # Sincronizar esquema sin migración
```

## Documentación

- [GETTING_STARTED.md](GETTING_STARTED.md) — guía de implementación
- [DEVELOPMENT.md](DEVELOPMENT.md) — documentación técnica completa
- [QUICKSTART.md](QUICKSTART.md) — setup en 5 minutos

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Prisma · CockroachDB · Nodemailer · Recharts · Framer Motion

© CDS Business Corporation