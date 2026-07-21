# CDS Form - Sistema de Encuestas de Satisfacción

Una plataforma completa para crear, distribuir y analizar encuestas de satisfacción corporativas. Similar a Typeform pero optimizada para uso interno en organizaciones.

## 🚀 Características

- **Creador de Encuestas Intuitivo**: Crea encuestas con múltiples tipos de preguntas
- **Dashboard Personalizado**: Filtra y visualiza encuestas específicas
- **Análisis en Tiempo Real**: Visualiza respuestas, tendencias y métricas
- **Distribución por URL y QR**: Comparte fácilmente con colaboradores
- **Notificaciones por Email**: Envía resúmenes a responsables de área
- **Configuración Corporativa**: Gestiona plantillas y remitentes
- **Multi-tipo de Preguntas**: Texto, escalas, NPS, opciones múltiples, etc.

## 📋 Tipos de Preguntas Soportadas

- Texto Corto
- Texto Largo
- Opción Múltiple
- Casillas de Verificación
- Calificación (Estrellas)
- Escala Likert
- Net Promoter Score (NPS)
- Fecha
- Email

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **Backend**: Next.js API Routes
- **Base de Datos**: CockroachDB (PostgreSQL compatible)
- **ORM**: Prisma
- **Email**: Nodemailer
- **Visualización**: Recharts
- **Animaciones**: Framer Motion
- **UI Components**: Custom + Tailwind

## 📦 Instalación

### Requisitos Previos
- Node.js 18+
- npm o yarn
- Acceso a CockroachDB (ya configurado)

### Pasos de Instalación

1. **Clona el repositorio**
```bash
git clone <repo-url>
cd sdc-form
```

2. **Instala dependencias**
```bash
npm install
```

3. **Configura variables de entorno**

Crea `.env.local` con:
```env
DATABASE_URL="postgresql://cdsForm:kRtvhlliS9mhBpx2qVWm_Q@rodriguez-db-13693.7tt.aws-us-east-1.cockroachlabs.cloud:26257/DBCdsForm?sslmode=verify-full"
NEXTAUTH_SECRET="tu-clave-secreta-aqui"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="tu-email@gmail.com"
SMTP_PASSWORD="tu-contraseña-app"
NEXTAUTH_URL="http://localhost:3000"
```

4. **Configura la base de datos**
```bash
# Genera cliente Prisma
npx prisma generate

# Ejecuta migraciones
npx prisma migrate deploy

# O crea migraciones nuevas
npx prisma migrate dev --name init
```

5. **Inicia el servidor de desarrollo**
```bash
npm run dev
```

6. **Abre tu navegador**
```
http://localhost:3000
```

## 📁 Estructura del Proyecto

```
src/
├── app/
│   ├── api/                      # API Routes
│   │   ├── surveys/              # CRUD de encuestas
│   │   ├── responses/            # Gestión de respuestas
│   │   ├── email/                # Notificaciones por email
│   │   └── users/                # Gestión de usuarios
│   ├── dashboard/                # Panel de control
│   ├── survey/
│   │   ├── new/                  # Crear nueva encuesta
│   │   ├── [id]/
│   │   │   ├── page.tsx          # Responder encuesta
│   │   │   ├── edit/             # Editar encuesta
│   │   │   └── results/          # Ver resultados
│   │   └── ...
│   ├── layout.tsx
│   ├── page.tsx                  # Home
│   └── globals.css
├── components/                   # Componentes reutilizables
│   ├── Button.tsx
│   ├── Modal.tsx
│   ├── Navbar.tsx
│   ├── Loading.tsx
│   └── Alert.tsx
├── lib/
│   ├── prisma.ts                 # Cliente Prisma
│   ├── email.ts                  # Servicio de email
│   ├── types.ts                  # Tipos TypeScript
│   └── utils.ts                  # Funciones auxiliares
└── prisma/
    └── schema.prisma             # Esquema de base de datos
```

## 🗄️ Esquema de Base de Datos

### Modelos Principales

**User**: Usuarios del sistema
- Roles: ADMIN, MANAGER, VIEWER
- Departamento
- Email

**Survey**: Encuestas/Cuestionarios
- Estados: DRAFT, PUBLISHED, ARCHIVED, CLOSED
- Configuración de publicación
- Fechas de creación y expiración

**Question**: Preguntas de la encuesta
- Múltiples tipos soportados
- Orden personalizable
- Opciones personalizables

**Response**: Respuestas de usuarios
- Estados: STARTED, IN_PROGRESS, COMPLETED, ABANDONED
- Timestamp de finalización

**DepartmentConfig**: Configuración por departamento
- Responsable del área
- Frecuencia de reportes por email
- Opciones de notificación

**SurveyMetadata**: Estadísticas agregadas
- Total de respuestas
- Tasa de finalización
- Tiempo promedio de respuesta

## 📊 API Endpoints

### Encuestas
- `GET /api/surveys` - Listar todas (con paginación y filtros)
- `POST /api/surveys` - Crear nueva
- `GET /api/surveys/[id]` - Obtener detalles
- `PUT /api/surveys/[id]` - Actualizar
- `DELETE /api/surveys/[id]` - Eliminar
- `GET /api/surveys/[id]/questions` - Listar preguntas
- `POST /api/surveys/[id]/questions` - Agregar pregunta

### Respuestas
- `POST /api/responses` - Enviar respuesta
- `GET /api/responses` - Listar respuestas (con filtros)

### Email
- `POST /api/email/send-invitation` - Enviar invitaciones
- `POST /api/email/send-summary` - Enviar resumen de resultados

## 🎨 UI/UX

- Diseño responsive (mobile-first)
- Animaciones suaves con Framer Motion
- Temas claro/oscuro
- Componentes accesibles
- Dashboard intuitivo con gráficos

## 🔐 Seguridad

- Validación de entrada en cliente y servidor
- Protección CSRF (implementar)
- Rate limiting (implementar)
- Autenticación JWT (implementar con NextAuth)
- Encriptación de datos sensibles

## 📈 Próximas Mejoras

- [ ] Autenticación con NextAuth.js
- [ ] Edición y eliminación de preguntas
- [ ] Edición de respuestas iniciadas
- [ ] Exportación de datos (CSV, PDF)
- [ ] Lógica condicional en preguntas
- [ ] Temas personalizables
- [ ] Plantillas de encuestas
- [ ] Integración con Slack/Teams
- [ ] Análisis avanzado con IA
- [ ] Multi-idioma

## 🚀 Deployment

### Vercel (Recomendado)
```bash
# Conecta tu repositorio a Vercel
# Las variables de entorno se configuran en el dashboard
# Pusea tu rama main y despliega
```

### Docker
```bash
docker build -t sdc-form .
docker run -p 3000:3000 sdc-form
```

## 📝 Convenciones de Código

- TypeScript stricto
- Componentes funcionales con hooks
- Nombres en español para modelos de negocio
- Nombres en inglés para código técnico
- ESLint + Prettier

## 🤝 Contribuir

1. Crea una rama (`git checkout -b feature/AmazingFeature`)
2. Commit tus cambios (`git commit -m 'Add AmazingFeature'`)
3. Push a la rama (`git push origin feature/AmazingFeature`)
4. Abre un Pull Request

## 📞 Soporte

Para soporte, contacta al equipo de desarrollo.

## 📄 Licencia

Este proyecto es propietario de CDS.

---

**Versión**: 0.1.0  
**Última actualización**: 2024-12-21
