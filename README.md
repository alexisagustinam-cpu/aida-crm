# AIDA CRM

CRM interno de AIDA Digital Solutions. Next.js 16 + Neon (Postgres) + Neon Auth.

## Estado: checkpoint 1

- ✅ Login, registro y sesión funcionando con Neon Auth (`/login`, `/signup`, `/dashboard`).
- ✅ Rutas protegidas: sin sesión, todo redirige a `/login`.
- ⏳ Los módulos del CRM (leads, pipeline, clientes, finanzas, proyectos…) están en
  `_pending-drizzle-port/`: es el código original (Supabase + su propio traductor de
  consultas), pendiente de reescribirse sobre Drizzle + Postgres puro, módulo por módulo.
- ⏳ Diseño visual: por ahora usa el tema genérico del proyecto base. Falta aplicar el
  diseño ya construido para AIDA.

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
