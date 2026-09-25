import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth/server'
import { getDb, schema } from '@/db'

export type Member = typeof schema.members.$inferSelect

// Acceso local sin Neon Auth, solo con `next dev` y AIDA_DEV_LOGIN=1 (ver README).
// En producción NODE_ENV es "production", así que esta rama no puede activarse.
export const devLoginEnabled = () => process.env.NODE_ENV === 'development' && process.env.AIDA_DEV_LOGIN === '1'

async function sessionUser(): Promise<{ id: string; email: string; name: string; image: string | null } | null> {
  if (devLoginEnabled()) return { id: 'dev-local', email: 'dev@aida.local', name: 'Agustín Mejías', image: '/crm/agustin.webp' }
  const { data } = await auth.getSession()
  const user = data?.user
  if (!user) return null
  return { id: user.id, email: user.email, name: user.name || user.email.split('@')[0]!, image: user.image ?? null }
}

// Perfil del equipo de quien está usando el CRM; se crea la primera vez que entra.
export const getCurrentMember = cache(async (): Promise<Member | null> => {
  const user = await sessionUser()
  if (!user) return null
  const db = await getDb()
  const [existing] = await db.select().from(schema.members).where(eq(schema.members.authUserId, user.id))
  if (existing) return existing
  const count = await db.$count(schema.members)
  await db.insert(schema.members).values({
    authUserId: user.id, email: user.email, name: user.name, avatar: user.image,
    role: count === 0 ? 'Administrador' : 'Equipo',
  }).onConflictDoNothing()
  const [created] = await db.select().from(schema.members).where(eq(schema.members.authUserId, user.id))
  return created ?? null
})

export async function requireMember(): Promise<Member> {
  const member = await getCurrentMember()
  if (!member) redirect('/login')
  return member
}
