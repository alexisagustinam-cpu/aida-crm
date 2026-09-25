import { defineConfig } from 'drizzle-kit'

// Genera las migraciones SQL a partir de src/db/schema.ts: `npx drizzle-kit generate`.
// Se aplican con scripts/migrate.mjs (en cada build de Vercel y en desarrollo local).
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
})
