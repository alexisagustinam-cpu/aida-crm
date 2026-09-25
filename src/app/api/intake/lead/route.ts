import { NextResponse } from 'next/server'
import { getSetting } from '@/lib/crm/queries'
import { createLead } from '@/lib/crm/core'

export const dynamic = 'force-dynamic'

// Recibe leads de formularios externos (la web de AIDA) y los agrega al pipeline como "Lead".
// Requiere la llave de Configuración → Integraciones, en la cabecera x-aida-key o en el campo "key".
const ALLOWED_ORIGINS = ['https://aida-website-fawn.vercel.app']
const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]!,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-aida-key',
})

export function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: cors(request.headers.get('origin')) })
}

const clean = (v: unknown, max = 200) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)

export async function POST(request: Request) {
  const headers = cors(request.headers.get('origin'))
  let body: Record<string, unknown>
  try {
    body = request.headers.get('content-type')?.includes('application/json') ? await request.json() : Object.fromEntries(await request.formData())
  } catch {
    return NextResponse.json({ error: 'Formato inválido' }, { status: 400, headers })
  }
  const key = await getSetting<string>('intake_key')
  const sent = request.headers.get('x-aida-key') ?? clean(body.key, 100)
  if (!key || sent !== key) return NextResponse.json({ error: 'Llave inválida' }, { status: 401, headers })
  const contactName = clean(body.name ?? body.nombre)
  const company = clean(body.company ?? body.empresa) ?? contactName
  if (!company) return NextResponse.json({ error: 'Falta el nombre o la empresa' }, { status: 400, headers })
  const service = clean(body.service ?? body.servicio) ?? 'Por definir'
  const message = clean(body.message ?? body.mensaje, 1000)
  const opp = await createLead({
    company, service, source: clean(body.source ?? body.origen) ?? 'Web', message,
    contactName, email: clean(body.email ?? body.correo), phone: clean(body.phone ?? body.telefono),
  }, 'Formulario web')
  return NextResponse.json({ ok: true, id: opp.id }, { status: 201, headers })
}
