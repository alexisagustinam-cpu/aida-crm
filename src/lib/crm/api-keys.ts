import 'server-only'
import { and, eq } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import { randomToken, sha256 } from './secrets'

// Crea una llave nueva. El texto completo solo se muestra una vez; se guarda su hash.
export async function createApiKey(name: string, createdBy: string) {
  const token = `aida_${randomToken(24)}`
  const db = await getDb()
  await db.insert(s.apiKeys).values({ name, prefix: token.slice(0, 10), hash: sha256(token), createdBy })
  return token
}

export async function revokeApiKey(id: string) {
  const db = await getDb()
  await db.update(s.apiKeys).set({ revoked: true }).where(eq(s.apiKeys.id, id))
}

export async function listApiKeys() {
  const db = await getDb()
  return db.select({ id: s.apiKeys.id, name: s.apiKeys.name, prefix: s.apiKeys.prefix, createdBy: s.apiKeys.createdBy, createdAt: s.apiKeys.createdAt, lastUsedAt: s.apiKeys.lastUsedAt })
    .from(s.apiKeys).where(eq(s.apiKeys.revoked, false)).orderBy(s.apiKeys.createdAt)
}

// Lee "Authorization: Bearer aida_…" o "x-api-key: aida_…" y devuelve la llave si es válida.
export async function authenticateRequest(request: Request) {
  const header = request.headers.get('authorization')
  const token = header?.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : request.headers.get('x-api-key')?.trim()
  if (!token?.startsWith('aida_')) return null
  const db = await getDb()
  const [key] = await db.select().from(s.apiKeys).where(and(eq(s.apiKeys.hash, sha256(token)), eq(s.apiKeys.revoked, false)))
  if (!key) return null
  await db.update(s.apiKeys).set({ lastUsedAt: new Date() }).where(eq(s.apiKeys.id, key.id))
  return key
}
