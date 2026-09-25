import 'server-only'
import { neon } from '@neondatabase/serverless'
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http'
import * as schema from './schema'

export type DB = NeonHttpDatabase<typeof schema>

const globalForDb = globalThis as unknown as { aidaDb?: Promise<DB> }

// Neon en Vercel; en desarrollo local sin DATABASE_URL, PGlite sobre la carpeta .pglite
// (se crea y se llena con `npm run db:migrate`). Nunca se usa PGlite en producción.
async function connect(): Promise<DB> {
  const url = process.env.DATABASE_URL
  if (url) return drizzle(neon(url), { schema })
  if (process.env.NODE_ENV === 'production') throw new Error('Falta DATABASE_URL')
  const { PGlite } = await import('@electric-sql/pglite')
  const { drizzle: drizzlePglite } = await import('drizzle-orm/pglite')
  return drizzlePglite(new PGlite(process.env.PGLITE_DIR ?? '.pglite'), { schema }) as unknown as DB
}

export function getDb(): Promise<DB> {
  globalForDb.aidaDb ??= connect()
  return globalForDb.aidaDb
}

export { schema }
