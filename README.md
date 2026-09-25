# AIDA CRM

CRM interno de AIDA Digital Solutions. Next.js 16 + Neon (Postgres) + Neon Auth.

## Estado

- ✅ Login, registro, Google y sesión con Neon Auth (`/login`, `/signup`).
- ✅ CRM completo sobre Neon (Postgres) con Drizzle, con el diseño de la maqueta original de AIDA
  (modo oscuro y claro, menú plegable):
  - **Inicio** (`/dashboard`): KPIs calculados (pipeline, MRR, clientes activos, tareas), pipeline por
    etapa, ingresos de 6 meses, próximas tareas, actividad, clientes por industria y agenda.
  - **Leads**, **Pipeline** (tablero con arrastrar y soltar), **Clientes** y su ficha (canales, reunión,
    proyecto, pagos, resultados 90 días, tareas, notas, contactos, archivos, finanzas, actividad),
    **Proyectos**, **Tareas y Agenda**, **Automatizaciones**, **Reportes** y **Configuración**.
  - Automatizaciones reales: oportunidad ganada → cliente + tarea; aviso de lead nuevo; tarea para
    preparar reuniones; pagos en la actividad; aviso diario de tareas que vencen.
  - `POST /api/intake/lead`: formularios externos (la web) crean leads con la llave de Configuración.
  - `GET /api/export`: exporta todo en JSON o una tabla en CSV.

## Integraciones, automatizaciones y API

- **Configuración → Integraciones**: Claude, OpenAI, Gemini, WhatsApp (API de Meta), correo (Resend) y
  n8n (webhook). Cada una se prueba contra el servicio al conectarla; las claves se guardan cifradas
  (AES-256-GCM, llave de `INTEGRATIONS_KEY` o derivada de `NEON_AUTH_COOKIE_SECRET`).
- **Automatizaciones** (`src/lib/crm/automations.ts`): cada ejecución queda en `automation_runs`
  (correcta / error / omitida si falta la integración). La revisión diaria la dispara el cron de Vercel
  (`vercel.json`, 12:00 UTC = 7:00 Ecuador) en `/api/cron/daily`, que exige `CRON_SECRET`.
- **Servidor MCP** en `/api/mcp` y **API REST** en `/api/v1/*`, ambos con llaves de
  Configuración → API y MCP (`Authorization: Bearer aida_…`).
- Lógica compartida por la pantalla, MCP, API y formulario web: `src/lib/crm/core.ts`.

## Base de datos

- Esquema: `src/db/schema.ts`. Migraciones SQL en `drizzle/` (`npm run db:generate` tras cambiar el esquema).
- `scripts/migrate.mjs` aplica las migraciones y, si la base está vacía, carga los datos de ejemplo
  (`drizzle/seed.sql`). Corre antes de cada `next build` en Vercel.

## Desarrollo local

```bash
npm install
npm run dev:local   # PGlite en .pglite/ con datos de ejemplo y acceso sin login
```

`dev:local` usa una base Postgres local (PGlite) y entra sin login (`AIDA_DEV_LOGIN=1`, solo en
`next dev`; en producción no puede activarse). Para empezar de cero: borra `.pglite/`.

## Variables de entorno

Provistas automáticamente por la integración de Neon en Vercel:
`DATABASE_URL`, `NEON_AUTH_BASE_URL`. `NEON_AUTH_COOKIE_SECRET` se generó y cargó aparte
(no viene de la integración).
