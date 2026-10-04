import { NextResponse } from 'next/server'
import { getIntegration } from '@/lib/crm/integrations'
import { applyBookingByUid, verifyCalSignature } from '@/lib/crm/calcom'

export const dynamic = 'force-dynamic'

// Aviso de Cal.com en cada reserva, cambio o cancelación. Lo crea el CRM al conectar Cal.com
// (Configuración → Integraciones) y viene firmado con x-cal-signature-256 (HMAC del cuerpo).
// Solo se usa el uid: la reserva completa se vuelve a pedir a Cal.com con la API key.
export async function POST(request: Request) {
  const raw = await request.text()
  const row = await getIntegration('calcom')
  if (!row?.secrets.webhookSecret) return NextResponse.json({ error: 'Cal.com no está conectado' }, { status: 404 })
  if (!verifyCalSignature(raw, request.headers.get('x-cal-signature-256'), row.secrets.webhookSecret)) return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })

  let body: { triggerEvent?: string; payload?: { uid?: string; rescheduleUid?: string; fromReschedule?: string } }
  try { body = JSON.parse(raw) } catch { return NextResponse.json({ error: 'Formato inválido' }, { status: 400 }) }
  if (body.triggerEvent === 'PING') return NextResponse.json({ ok: true })
  const uid = body.payload?.uid
  if (!uid) return NextResponse.json({ ok: true, ignorado: 'sin uid' })

  const result = await applyBookingByUid(uid, body.payload?.rescheduleUid ?? body.payload?.fromReschedule ?? null)
  return NextResponse.json({ ok: true, cita: result })
}
