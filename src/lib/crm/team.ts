import 'server-only'
import { headers } from 'next/headers'
import { and, eq, isNull, ne, sql } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import { randomToken, sha256 } from './secrets'
import { UserError } from './action-helpers'
import { getIntegration, sendEmail } from './integrations'

// Acceso al CRM por invitación. El enlace (/signup?invitacion=…) se muestra una sola vez y
// solo se guarda su hash; vence a los 7 días y sirve una vez.
const INVITE_DAYS = 7
export type Role = (typeof s.ROLES)[number]
const isRole = (v: string): v is Role => (s.ROLES as readonly string[]).includes(v)

async function siteOrigin() {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  return `${h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')}://${host}`
}

async function newInviteLink(memberId: string) {
  const token = randomToken(24)
  const db = await getDb()
  await db.update(s.members).set({ inviteTokenHash: sha256(token), inviteExpiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000), inviteAcceptedAt: null })
    .where(and(eq(s.members.id, memberId), isNull(s.members.authUserId)))
  return `${await siteOrigin()}/signup?invitacion=${token}`
}

// Si el correo del CRM está conectado, también se envía la invitación por correo.
async function mailInvite(to: string, name: string, link: string, by: string) {
  if (!(await getIntegration('email'))) return false
  try {
    await sendEmail([to], 'Te invitaron al CRM de AIDA', [
      `Hola ${name}:`, '',
      `${by} te dio acceso al CRM de AIDA Digital Solutions.`, '',
      `Crea tu contraseña aquí (el enlace vence en ${INVITE_DAYS} días y sirve una sola vez):`, link, '',
      `Si tu correo ${to} es de Google, también puedes entrar directo con "Continuar con Google".`,
    ].join('\n'))
    return true
  } catch (error) {
    console.error('team/invite-email:', error)
    return false
  }
}

export async function inviteMember(input: { email: string; name: string | null; role: string }, by: string) {
  const email = input.email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new UserError('Escribe un correo válido.')
  const role = isRole(input.role) ? input.role : 'Equipo'
  const db = await getDb()
  const [existing] = await db.select().from(s.members).where(sql`lower(${s.members.email}) = ${email}`).limit(1)
  let id: string
  if (existing) {
    if (existing.authUserId && existing.active) throw new UserError(`${existing.name} ya es parte del equipo.`)
    if (existing.authUserId) throw new UserError(`${existing.name} está desactivado. Reactívalo desde la lista.`)
    await db.update(s.members).set({ role, name: input.name || existing.name, active: true, invitedBy: by }).where(eq(s.members.id, existing.id))
    id = existing.id
  } else {
    const [row] = await db.insert(s.members).values({ email, name: input.name || email.split('@')[0]!, role, invitedBy: by }).returning({ id: s.members.id })
    id = row!.id
  }
  const link = await newInviteLink(id)
  const mailed = await mailInvite(email, input.name || email.split('@')[0]!, link, by)
  return { link, mailed }
}

export async function renewInvite(id: string, by: string) {
  const db = await getDb()
  const [row] = await db.select().from(s.members).where(eq(s.members.id, id))
  if (!row || row.authUserId) throw new UserError('Esa invitación ya no está pendiente.')
  const link = await newInviteLink(id)
  const mailed = await mailInvite(row.email, row.name, link, by)
  return { link, mailed }
}

export async function cancelInvite(id: string) {
  const db = await getDb()
  await db.delete(s.members).where(and(eq(s.members.id, id), isNull(s.members.authUserId)))
}

// Nunca quedarse sin un administrador activo.
async function assertAnotherAdmin(exceptId: string) {
  const db = await getDb()
  const others = await db.$count(s.members, and(eq(s.members.role, 'Administrador'), eq(s.members.active, true), ne(s.members.id, exceptId), sql`${s.members.authUserId} is not null`))
  if (others === 0) throw new UserError('Tiene que quedar al menos un administrador activo.')
}

export async function setRole(id: string, role: string, actorId: string) {
  if (!isRole(role)) throw new UserError('Permiso desconocido.')
  const db = await getDb()
  const [row] = await db.select().from(s.members).where(eq(s.members.id, id))
  if (!row) throw new UserError('No existe esa persona.')
  if (row.role === 'Administrador' && role !== 'Administrador') {
    if (id === actorId) throw new UserError('No puedes quitarte el permiso de administrador a ti mismo.')
    await assertAnotherAdmin(id)
  }
  await db.update(s.members).set({ role }).where(eq(s.members.id, id))
}

export async function setActive(id: string, active: boolean, actorId: string) {
  if (id === actorId) throw new UserError('No puedes desactivarte a ti mismo.')
  const db = await getDb()
  const [row] = await db.select().from(s.members).where(eq(s.members.id, id))
  if (!row) throw new UserError('No existe esa persona.')
  if (!active && row.role === 'Administrador') await assertAnotherAdmin(id)
  await db.update(s.members).set({ active }).where(eq(s.members.id, id))
}

// Invitación pendiente y vigente para un enlace, o null.
export async function findInvite(token: string | null | undefined) {
  if (!token || token.length < 20 || token.length > 100) return null
  const db = await getDb()
  const [row] = await db.select().from(s.members).where(and(eq(s.members.inviteTokenHash, sha256(token)), isNull(s.members.authUserId), eq(s.members.active, true)))
  if (!row || !row.inviteExpiresAt || row.inviteExpiresAt.getTime() < Date.now()) return null
  return row
}

// La cuenta de email se creó con el enlace: la invitación queda confirmada y el enlace deja de servir.
export async function acceptInvite(id: string) {
  const db = await getDb()
  await db.update(s.members).set({ inviteAcceptedAt: new Date(), inviteTokenHash: null }).where(and(eq(s.members.id, id), isNull(s.members.authUserId)))
}

export async function getTeam() {
  const db = await getDb()
  return db.select({
    id: s.members.id, name: s.members.name, email: s.members.email, role: s.members.role, title: s.members.title, avatar: s.members.avatar,
    active: s.members.active, linked: sql<boolean>`${s.members.authUserId} is not null`, invitedBy: s.members.invitedBy,
    inviteExpiresAt: s.members.inviteExpiresAt, inviteAcceptedAt: s.members.inviteAcceptedAt, lastSeenAt: s.members.lastSeenAt, createdAt: s.members.createdAt,
  }).from(s.members).orderBy(sql`${s.members.authUserId} is null`, s.members.createdAt)
}
