// Aplica las migraciones de drizzle/ y, si la base está vacía, carga los datos de ejemplo
// (drizzle/seed.sql). Con DATABASE_URL usa Neon; sin ella, en local, usa PGlite en .pglite/.
// Se ejecuta antes de `next build` (ver package.json) y con `npm run db:migrate`.
import { readFile } from 'node:fs/promises'

const MIGRATIONS = 'drizzle'
const BREAK = '--> statement-breakpoint'

async function connect() {
  const url = process.env.DATABASE_URL
  if (url) {
    const { neon } = await import('@neondatabase/serverless')
    const { drizzle } = await import('drizzle-orm/neon-http')
    const { migrate } = await import('drizzle-orm/neon-http/migrator')
    const sql = neon(url)
    return { name: 'Neon', migrate: () => migrate(drizzle(sql), { migrationsFolder: MIGRATIONS }), query: (text, params = []) => sql.query(text, params) }
  }
  if (process.env.VERCEL) throw new Error('Falta DATABASE_URL en Vercel')
  const { PGlite } = await import('@electric-sql/pglite')
  const { drizzle } = await import('drizzle-orm/pglite')
  const { migrate } = await import('drizzle-orm/pglite/migrator')
  const client = new PGlite(process.env.PGLITE_DIR ?? '.pglite')
  return { name: 'PGlite (local)', migrate: () => migrate(drizzle(client), { migrationsFolder: MIGRATIONS }), query: async (text, params = []) => (await client.query(text, params)).rows, close: () => client.close() }
}

// La versión anterior del CRM guardaba todo en un solo documento (tabla crm_workspace).
// Si alguien editó ahí a Selfie Dental, esos cambios pasan a la tabla de clientes.
async function carryOverWorkspaceEdits(db) {
  const [exists] = await db.query(`select to_regclass('public.crm_workspace') is not null as ok`)
  if (!exists?.ok) return
  const [row] = await db.query(`select data from crm_workspace where id = 'aida'`)
  const saved = row?.data?.clients?.find(c => c.id === 'selfie-dental')
  if (!saved) return
  await db.query(
    `update clients set name = coalesce($1, name), status = coalesce($2, status), contact_name = coalesce($3, contact_name), email = coalesce($4, email),
       phone = coalesce($5, phone), location = coalesce($6, location), description = coalesce($7, description)
     where id = '00000000-0000-4000-8000-000000000001'`,
    [saved.name, saved.status, saved.contact, saved.email, saved.phone, saved.location, saved.description].map(v => (typeof v === 'string' && v.trim() ? v : null)),
  )
  console.log('· Cambios de Selfie Dental del CRM anterior conservados')
}

const db = await connect()
console.log(`Base de datos: ${db.name}`)
await db.migrate()
console.log('· Migraciones aplicadas')
const [{ count }] = await db.query('select count(*)::int as count from clients')
if (count === 0) {
  const seed = await readFile(`${MIGRATIONS}/seed.sql`, 'utf8')
  for (const statement of seed.split(BREAK).map(s => s.replace(/^\s*--.*$/gm, '').trim()).filter(Boolean)) await db.query(statement)
  await carryOverWorkspaceEdits(db)
  console.log('· Datos de ejemplo cargados')
} else {
  console.log(`· La base ya tiene ${count} clientes: no se cargan datos de ejemplo`)
}
await db.close?.()
