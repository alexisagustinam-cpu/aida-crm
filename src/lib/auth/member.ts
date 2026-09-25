import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { and, eq, gt, sql } from 'drizzle-orm'
import { auth } from '@/lib/auth/server'
import { getDb, schema } from '@/db'

export type Member = typeof schema.members.$inferSelect

// Acceso local sin Neon Auth, solo con `next dev` y AIDA_DEV_LOGIN=1 (ver README).
// En producción NODE_ENV es "production", así que esta rama no puede activarse.
export const devLoginEnabled = () => process.env.NODE_ENV === 'development' && process.env.AIDA_DEV_LOGIN === '1'

const DEV_EMAIL = 'dev@aida.local'

type SessionUser = { id: string; email: string; name: string; image: string | null; emailVerified: boolean }

async function sessionUser(): Promise<SessionUser | null> {
  // AIDA_DEV_EMAIL simula otra cuenta (p. ej. alguien sin invitación) y AIDA_DEV_UNVERIFIED=1 una de correo sin verificar.
  if (devLoginEnabled()) {
    const email = process.env.AIDA_DEV_EMAIL ?? DEV_EMAIL
    return { id: email === DEV_EMAIL ? 'dev-local' : `dev-${email}`, email, name: email === DEV_EMAIL ? 'Agustín Mejías' : email.split('@')[0]!, image: email === DEV_EMAIL ? '/crm/agustin.webp' : null, emailVerified: process.env.AIDA_DEV_UNVERIFIED !== '1' }
  }
  const { data } = await auth.getSession()
  const user = data?.user
  if (!user) return null
  return { id: user.id, email: user.email, name: user.name || user.email.split('@')[0]!, image: user.image ?? null, emailVerified: user.emailVerified === true }
}

// Correos que siempre pueden entrar como administradores aunque no tengan invitación
// (Vercel → AIDA_ADMIN_EMAILS, separados por coma). Sirve para el primer acceso y para
// recuperar el CRM si nadie más puede invitar. Exige correo verificado (Google lo verifica).
const adminEmails = () => (process.env.AIDA_ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

export type Denied = 'sin-invitacion' | 'desactivado' | 'sin-verificar' | 'invitacion-vencida'
export type Access = { member: Member } | { denied: Denied; email: string; provider: string } | null

// Quién está usando el CRM y si puede entrar. Solo entran:
//  · miembros activos ya ligados a su cuenta, o
//  · personas con una invitación pendiente para su correo (verificado por Google, o
//    confirmado al crear la cuenta con el enlace de invitación), o
//  · correos de AIDA_ADMIN_EMAILS, o la primera cuenta verificada de una base sin miembros.
// Cualquier otra cuenta (por ejemplo, alguien que entra con su Google) queda fuera y se avisa
// a los administradores en la campana.
export const getAccess = cache(async (): Promise<Access> => {
  const user = await sessionUser()
  if (!user) return null
  const db = await getDb()
  const m = schema.members
  const email = user.email.trim().toLowerCase()
  const provider = user.emailVerified ? 'Google o correo verificado' : 'correo y contraseña'

  let [member] = await db.select().from(m).where(eq(m.authUserId, user.id))
  if (!member) {
    const [invite] = await db.select().from(m).where(sql`lower(${m.email}) = ${email}`).orderBy(sql`${m.authUserId} is not null`).limit(1)
    if (invite) {
      if (!invite.active) return { denied: 'desactivado', email, provider }
      // La invitación ya la tomó otra cuenta con este correo: solo se pasa a esta si el correo está verificado.
      if (invite.authUserId && !user.emailVerified) return { denied: 'sin-verificar', email, provider }
      if (!invite.authUserId && !user.emailVerified && !invite.inviteAcceptedAt) return { denied: 'sin-verificar', email, provider }
      if (!invite.authUserId && !invite.inviteAcceptedAt && invite.inviteExpiresAt && invite.inviteExpiresAt.getTime() < Date.now()) return { denied: 'invitacion-vencida', email, provider }
      ;[member] = await db.update(m).set({
        authUserId: user.id, name: invite.authUserId ? invite.name : invite.name || user.name, avatar: invite.avatar ?? user.image,
        inviteTokenHash: null, inviteExpiresAt: null, inviteAcceptedAt: null,
      }).where(eq(m.id, invite.id)).returning()
    } else if (user.emailVerified && (adminEmails().includes(email) || (devLoginEnabled() && email === DEV_EMAIL) || (await db.$count(m)) === 0)) {
      // Base sin miembros (instalación nueva): la primera cuenta verificada es la administradora.
      ;[member] = await db.insert(m).values({ authUserId: user.id, email: user.email, name: user.name, avatar: user.image, role: 'Administrador' }).onConflictDoNothing().returning()
    } else {
      await reportBlockedAttempt(email, provider)
      return { denied: user.emailVerified ? 'sin-invitacion' : 'sin-verificar', email, provider }
    }
    if (!member) return { denied: 'sin-invitacion', email, provider }
  }
  if (!member.active) return { denied: 'desactivado', email, provider }
  // Último acceso (como mucho una escritura por hora).
  if (!member.lastSeenAt || Date.now() - member.lastSeenAt.getTime() > 3_600_000) {
    await db.update(m).set({ lastSeenAt: new Date() }).where(eq(m.id, member.id))
  }
  return { member }
})

// Aviso en la campana, una vez al día por correo, para que un administrador vea el intento.
async function reportBlockedAttempt(email: string, provider: string) {
  const db = await getDb()
  const n = schema.notifications
  const title = 'Intento de acceso bloqueado'
  const body = `${email} (${provider}) intentó entrar al CRM sin invitación.`
  const [recent] = await db.select({ id: n.id }).from(n).where(and(eq(n.title, title), eq(n.body, body), gt(n.createdAt, new Date(Date.now() - 86_400_000)))).limit(1)
  if (!recent) await db.insert(n).values({ title, body, href: '/configuracion/equipo' })
}

export const getCurrentMember = cache(async (): Promise<Member | null> => {
  const access = await getAccess()
  return access && 'member' in access ? access.member : null
})

export async function requireMember(): Promise<Member> {
  const access = await getAccess()
  if (!access) redirect('/login')
  if ('denied' in access) redirect('/sin-acceso')
  return access.member
}

export async function requireAdmin(): Promise<Member> {
  const member = await requireMember()
  if (member.role !== 'Administrador') redirect('/dashboard')
  return member
}
