# AIDA CRM

CRM interno de AIDA Digital Solutions. Next.js 16 + Neon (Postgres) + Neon Auth.

## Estado

- ✅ Login, registro, Google y sesión con Neon Auth (`/login`, `/signup`).
- ✅ `/dashboard` es el CRM de AIDA: la maqueta original (dashboard, clientes, ficha de
  Selfie Dental, configuración), servida tal cual y solo con sesión iniciada.
  - Vista: `src/lib/crm/page-html.ts` + `public/crm/` (estilos, script, imágenes).
  - Datos: se guardan en Neon, tabla `crm_workspace`, como un solo documento JSON
    compartido por el equipo (`src/lib/crm/store.ts`, API en `/api/crm`). La primera
    carga siembra la base con los datos de ejemplo de la maqueta.
- ⏳ Módulos que en la maqueta aún están vacíos (Leads, Pipeline completo, Proyectos,
  Tareas, Automatizaciones, Reportes) y métricas que siguen siendo de demostración.

## Desarrollo local

```bash
npm install
vercel env pull .env.local --environment=production --yes
npm run dev
```

Nota: `vercel env pull` puede devolver las variables sensibles vacías según los permisos
del equipo en Vercel; si pasa eso, pruébalo directo contra el deploy en Vercel en vez de
en local.

## Variables de entorno

Provistas automáticamente por la integración de Neon en Vercel:
`DATABASE_URL`, `NEON_AUTH_BASE_URL`. `NEON_AUTH_COOKIE_SECRET` se generó y cargó aparte
(no viene de la integración).
