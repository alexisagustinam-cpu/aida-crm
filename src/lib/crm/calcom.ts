import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { and, desc, eq, notInArray, or, sql } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import { createLead, moveOpportunityTo } from './core'
import { emitEvent, logActivity, notify, runAutomation } from './automations'
import { calApi, getIntegration, IntegrationError } from './integrations'
import { formatLongDate, formatTime } from './format'

// Citas de Cal.com → CRM. Entran por dos caminos que terminan en `applyBooking`:
// el aviso (webhook) que Cal.com manda en cada reserva y la sincronización (diaria o manual),
// que vuelve a revisar las reservas recientes por si algún aviso no llegó.
// Cada reserva se guarda una sola vez gracias a meetings.external_id = uid de Cal.com.

export type CalBooking = {
  uid: string
  status: string // accepted | pending | cancelled | rejected
  start: string
  meetingUrl?: string | null
  location?: string | null
  rescheduledFromUid?: string | null
  attendees: { name: string; email: string; phoneNumber?: string | null }[]
  bookingFieldsResponses?: Record<string, unknown>
}

const ACTOR = 'Cal.com'
const SYNC_DAYS = 30

const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)

export function verifyCalSignature(body: string, signature: string | null, secret: string) {
  if (!signature) return false
  const expected = Buffer.from(createHmac('sha256', secret).update(body).digest('hex'))
  const got = Buffer.from(signature.replace(/^sha256=/, ''))
  return expected.length === got.length && timingSafeEqual(expected, got)
}

function where(b: CalBooking) {
  const url = b.meetingUrl ?? b.location ?? ''
  if (/meet\.google\.com/.test(url)) return 'Google Meet'
  if (/zoom\.us/.test(url)) return 'Zoom'
  if (/cal\.com\/video/.test(url)) return 'Cal Video'
  return url.startsWith('http') ? 'En línea' : text(url)
}

// Lead abierto de la misma persona (por correo o teléfono), el más reciente.
export async function findOpenLead(email: string | null, phone: string | null) {
  const digits = phone?.replace(/\D/g, '') ?? ''
  if (!email && digits.length < 8) return null
  const db = await getDb()
  const [opp] = await db.select().from(s.opportunities).where(and(
    notInArray(s.opportunities.stage, ['Ganado', 'Perdido']),
    or(
      email ? sql`lower(${s.opportunities.email}) = ${email.toLowerCase()}` : undefined,
      digits.length >= 8 ? sql`regexp_replace(coalesce(${s.opportunities.phone}, ''), '\\D', '', 'g') = ${digits}` : undefined,
    ),
  )).orderBy(desc(s.opportunities.createdAt)).limit(1)
  return opp ?? null
}

export type ApplyResult = 'nueva' | 'actualizada' | 'cancelada' | 'sin cambios' | 'omitida'

export async function applyBooking(b: CalBooking, opts: { ownerEmail?: string; fromUid?: string | null } = {}): Promise<ApplyResult> {
  const db = await getDb()
  const guest = b.attendees[0]
  if (!guest) return 'omitida'
  // Las reservas de prueba que hace el dueño de la cuenta no son leads.
  if (opts.ownerEmail && guest.email.toLowerCase() === opts.ownerEmail.toLowerCase()) return 'omitida'

  const startsAt = new Date(b.start)
  const link = b.meetingUrl ?? (b.location?.startsWith('http') ? b.location : null)
  const [existing] = await db.select().from(s.meetings).where(eq(s.meetings.externalId, b.uid))

  if (b.status === 'cancelled' || b.status === 'rejected') {
    if (!existing) return 'sin cambios'
    await db.delete(s.meetings).where(eq(s.meetings.id, existing.id))
    await logActivity({ kind: 'meeting', title: 'Cita cancelada', detail: `${existing.title} · era el ${formatLongDate(existing.startsAt)}`, clientId: existing.clientId, actor: ACTOR })
    await notify({ title: `Cita cancelada: ${existing.title}`, body: `Era el ${formatLongDate(existing.startsAt)} a las ${formatTime(existing.startsAt)}`, href: '/tareas' })
    return 'cancelada'
  }

  if (existing) {
    if (existing.startsAt.getTime() === startsAt.getTime() && existing.link === link) return 'sin cambios'
    await db.update(s.meetings).set({ startsAt, link, location: where(b) }).where(eq(s.meetings.id, existing.id))
    return 'actualizada'
  }

  // Reprogramada: Cal.com crea una reserva nueva; se mueve la reunión que ya existía.
  const fromUid = b.rescheduledFromUid ?? opts.fromUid
  if (fromUid) {
    const [old] = await db.select().from(s.meetings).where(eq(s.meetings.externalId, fromUid))
    if (old) {
      await db.update(s.meetings).set({ externalId: b.uid, startsAt, link, location: where(b) }).where(eq(s.meetings.id, old.id))
      if (old.opportunityId) await db.update(s.opportunities).set({ nextActionAt: startsAt }).where(eq(s.opportunities.id, old.opportunityId))
      await logActivity({ kind: 'meeting', title: 'Cita reprogramada', detail: `${old.title} · ahora el ${formatLongDate(startsAt)}`, clientId: old.clientId, actor: ACTOR })
      await notify({ title: `Cita reprogramada: ${old.title}`, body: `Nueva fecha: ${formatLongDate(startsAt)} a las ${formatTime(startsAt)}`, href: '/tareas' })
      return 'actualizada'
    }
  }

  const answers = b.bookingFieldsResponses ?? {}
  const name = text(guest.name) ?? text(answers.name)
  const email = text(guest.email)
  const phone = text(guest.phoneNumber) ?? text(answers.attendeePhoneNumber)
  const business = text(answers.negocio)
  const service = text(answers.servicio)
  const notes = text(answers.notes)

  const opp = (await findOpenLead(email, phone)) ?? await createLead({
    company: business ?? name ?? email ?? 'Cita sin nombre',
    service: service && service !== 'Aún no lo sé' ? service : 'Por definir',
    contactName: name, email, phone, source: 'Web', message: notes,
  }, ACTOR)

  const title = `Diagnóstico · ${opp.company}`
  // onConflictDoNothing: si el aviso y la sincronización llegan a la vez, solo uno la crea.
  const [m] = await db.insert(s.meetings).values({ title, startsAt, location: where(b), link, clientId: opp.clientId, opportunityId: opp.id, externalId: b.uid })
    .onConflictDoNothing({ target: s.meetings.externalId }).returning()
  if (!m) return 'sin cambios'
  // La fecha de la cita se ve en la tarjeta del lead (Leads, Pipeline y Dashboard).
  await db.update(s.opportunities).set({ nextActionAt: startsAt }).where(eq(s.opportunities.id, opp.id))

  await logActivity({ kind: 'meeting', title: 'Cita agendada desde la web', detail: `${title} · ${formatLongDate(startsAt)} ${formatTime(startsAt)}`, clientId: opp.clientId, actor: ACTOR })
  await notify({ title: `Cita nueva: ${opp.company}`, body: `${formatLongDate(startsAt)} a las ${formatTime(startsAt)}${notes ? ` · ${notes.slice(0, 80)}` : ''}`, href: '/leads' })
  if (opp.stage === 'Lead' || opp.stage === 'Contactado') await moveOpportunityTo(opp.id, 'Reunión', ACTOR)
  await emitEvent('meeting.created', { id: m.id, title, startsAt: startsAt.toISOString(), opportunityId: opp.id, link, source: 'calcom' })
  return 'nueva'
}

async function connected() {
  const row = await getIntegration('calcom')
  if (!row) throw new IntegrationError('Cal.com no está conectado (Configuración → Integraciones).')
  return row
}

// Aviso de Cal.com: trae la reserva completa por su uid y la aplica.
export async function applyBookingByUid(uid: string, fromUid: string | null) {
  const row = await connected()
  let result: ApplyResult = 'sin cambios'
  await runAutomation('calcom_sync', async () => {
    const booking = await calApi<CalBooking>(row.secrets.apiKey!, `/bookings/${encodeURIComponent(uid)}`)
    result = await applyBooking(booking, { ownerEmail: row.settings.ownerEmail, fromUid })
    return `Aviso de Cal.com: cita ${result}`
  })
  return result
}

// Revisa las reservas de los últimos 30 días y las próximas. Se puede correr las veces que sea.
export async function syncCalcom() {
  const row = await connected()
  const counts: Record<ApplyResult, number> = { nueva: 0, actualizada: 0, cancelada: 0, 'sin cambios': 0, omitida: 0 }
  let total = 0, error: string | null = null
  await runAutomation('calcom_sync', async () => {
    try { return await pull() } catch (e) { error = (e as Error).message; throw e }
  })
  return { total, error, ...counts }

  async function pull() {
    const since = new Date(Date.now() - SYNC_DAYS * 86_400_000).toISOString()
    for (let skip = 0; skip < 1000; skip += 100) {
      const page = await calApi<CalBooking[]>(row.secrets.apiKey!, `/bookings?afterStart=${encodeURIComponent(since)}&sortStart=asc&take=100&skip=${skip}`)
      for (const b of page) counts[await applyBooking(b, { ownerEmail: row.settings.ownerEmail })]++
      total += page.length
      if (page.length < 100) break
    }
    return `Sincronización: ${total} reservas revisadas, ${counts.nueva} nuevas, ${counts.actualizada} actualizadas, ${counts.cancelada} canceladas`
  }
}
