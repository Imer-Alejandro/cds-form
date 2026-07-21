# 🚀 Quick Start Guide - CDS Form

## Configuración Rápida (5 minutos)

### 1️⃣ Verifica .env.local
El archivo `.env.local` ya está configurado con:
- **Base de datos**: CockroachDB (ProductionReady)
- **Email**: Gmail SMTP (configura con tu cuenta)

```bash
# En .env.local, actualiza SMTP si es necesario:
SMTP_USER="tu-email@gmail.com"
SMTP_PASSWORD="tu-contraseña-app"
```

### 2️⃣ Instala y crea la BD
```bash
# Instala dependencias
npm install

# Genera cliente Prisma
npm run prisma:generate

# Crea/actualiza esquema en BD
npm run prisma:migrate

# (Opcional) Carga datos de ejemplo
npm run prisma:seed
```

### 3️⃣ Inicia desarrollo
```bash
npm run dev
```

Abre: **http://localhost:3000**

## 📍 Rutas Principales

| Ruta | Descripción |
|------|-------------|
| `/` | Home - Landing page |
| `/dashboard` | Panel de control |
| `/survey/new` | Crear encuesta |
| `/survey/[id]/edit` | Editar encuesta |
| `/survey/[id]` | Responder encuesta |
| `/survey/[id]/results` | Ver resultados |
| `/survey/[id]/settings` | Configuración & compartir |

## 🔌 API Principales

### Encuestas
```bash
# Listar
GET /api/surveys?status=PUBLISHED&page=1

# Crear
POST /api/surveys
{
  "title": "Mi encuesta",
  "description": "Descripción",
  "createdBy": "user-id"
}

# Detalles
GET /api/surveys/[id]

# Actualizar
PUT /api/surveys/[id]

# Agregar pregunta
POST /api/surveys/[id]/questions
{
  "title": "¿Pregunta?",
  "type": "RATING",
  "required": true
}
```

### Respuestas
```bash
# Enviar respuesta
POST /api/responses
{
  "surveyId": "id",
  "answers": [
    {"questionId": "id", "value": "respuesta"}
  ]
}

# Ver respuestas
GET /api/responses?surveyId=[id]
```

### Email
```bash
# Enviar invitaciones
POST /api/email/send-invitation
{
  "surveyId": "id",
  "emails": ["correo@example.com"]
}

# Enviar resumen
POST /api/email/send-summary
{
  "surveyId": "id"
}
```

## 🗂️ Estructura Clave

```
src/
├── app/
│   ├── api/          ← Backend (endpoints)
│   ├── dashboard/    ← Dashboard principal
│   ├── survey/       ← Página de respuestas
│   └── page.tsx      ← Home
├── components/       ← Componentes reutilizables
├── lib/
│   ├── prisma.ts     ← Cliente BD
│   ├── email.ts      ← Servicio email
│   └── utils.ts      ← Funciones auxiliares
└── prisma/
    └── schema.prisma ← Esquema BD
```

## 🎯 Flujo de Uso

1. **Crear Encuesta** → Dashboard → "+ Nueva Encuesta"
2. **Agregar Preguntas** → Editor → "+ Agregar Pregunta"
3. **Publicar** → Botón "Publicar"
4. **Compartir** → Settings → Copiar enlace o enviar emails
5. **Ver Respuestas** → Dashboard → "Ver Resultados"

## 🛠️ Comandos Útiles

```bash
# Desarrollo
npm run dev              # Inicia servidor

# BD
npm run prisma:generate # Regenera cliente
npm run prisma:migrate  # Crea migración
npm run db:push         # Sincroniza esquema
npm run prisma:reset    # Resetea todo

# Build
npm run build           # Construye para producción
npm start               # Inicia producción

# Lint
npm run lint            # Verifica código
```

## 🐛 Troubleshooting

**Error: "DATABASE_URL not found"**
- Verifica que `.env.local` existe en la raíz
- Ejecuta: `npm run prisma:generate`

**Error: "User not found" al compartir**
- Crea usuarios en BD primero
- O usa el email del responsable directamente

**Error: Email no se envía**
- Verifica credenciales SMTP en `.env.local`
- Comprueba si Gmail requiere "contraseña de aplicación"

**Puerto 3000 en uso**
- Cambia: `npm run dev -- -p 3001`

## 📊 Modelos de Datos

| Tabla | Descripción |
|-------|-------------|
| `User` | Usuarios del sistema |
| `Survey` | Encuestas creadas |
| `Question` | Preguntas de encuesta |
| `Response` | Respuestas de usuarios |
| `Answer` | Respuesta individual a pregunta |
| `DepartmentConfig` | Config de notificaciones |
| `SurveyMetadata` | Estadísticas agregadas |
| `EmailLog` | Registro de emails enviados |

## ✅ Checklist de Instalación

- [ ] `.env.local` configurado
- [ ] `npm install` ejecutado
- [ ] `npm run prisma:migrate` ejecutado sin errores
- [ ] `npm run dev` inicia exitosamente
- [ ] `http://localhost:3000` carga correctamente
- [ ] Dashboard accesible
- [ ] Puedo crear encuesta

## 📞 Siguiente Paso

Lee [DEVELOPMENT.md](./DEVELOPMENT.md) para guía completa de desarrollo.

---

**¿Problemas?** Revisa los logs en la terminal o contacta al equipo.
