import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/crm/api-keys'
import { addClientNote, createLead, createMeeting, createTask, moveOpportunityTo, setTaskDone } from '@/lib/crm/core'
import * as Q from '@/lib/crm/queries'

// API REST mínima para n8n, Zapier o scripts. Misma llave que el MCP:
//   Authorization: Bearer aida_…
// GET  /api/v1/{resumen|clientes|leads|tareas|reuniones}
// POST /api/v1/{leads|tareas|notas|reuniones|etapa|completar}
export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ recurso: string }> }
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })
const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

export async function GET(request: Request, { params }: Params) {
  const key = await authenticateRequest(request)
  if (!key) return bad('Llave inválida', 401)
  const { recurso } = await params
  const url = new URL(request.url)
  switch (recurso) {
    case 'resumen': return NextResponse.json({ kpis: await Q.getKpis(), ingresos: await Q.getMonthlyIncome() })
    case 'clientes': return NextResponse.json(await Q.getClients())
    case 'leads': return NextResponse.json(await Q.getBoard())
    case 'tareas': return NextResponse.json(await Q.getTasks((url.searchParams.get('filtro') as 'pendientes') ?? 'pendientes'))
    case 'reuniones': return NextResponse.json(await Q.getUpcomingMeetings(Number(url.searchParams.get('limite') ?? 20)))
    default: return bad('Recurso desconocido', 404)
  }
}

export async function POST(request: Request, { params }: Params) {
  const key = await authenticateRequest(request)
  if (!key) return bad('Llave inválida', 401)
  const actor = `${key.name} (API)`
  const { recurso } = await params
  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!b) return bad('El cuerpo debe ser JSON')
  try {
    switch (recurso) {
      case 'leads': {
        const company = text(b.empresa ?? b.company ?? b.nombre ?? b.name)
        if (!company) return bad('Falta "empresa"')
        const lead = await createLead({ company, service: text(b.servicio ?? b.service) ?? 'Por definir', valueCents: Math.round(Number(b.valor ?? b.value ?? 0) * 100) || 0, contactName: text(b.contacto ?? b.contactName), email: text(b.correo ?? b.email), phone: text(b.telefono ?? b.phone), source: text(b.origen ?? b.source) ?? 'n8n', message: text(b.mensaje ?? b.message) }, actor)
        return NextResponse.json({ ok: true, id: lead.id }, { status: 201 })
      }
      case 'tareas': {
        const title = text(b.titulo ?? b.title)
        if (!title) return bad('Falta "titulo"')
        const t = await createTask({ title, dueDate: text(b.vence ?? b.dueDate), priority: text(b.prioridad ?? b.priority), clientId: text(b.cliente_id ?? b.clientId), assignee: text(b.responsable) }, actor)
        return NextResponse.json({ ok: true, id: t.id }, { status: 201 })
      }
      case 'notas': {
        const clientId = text(b.cliente_id ?? b.clientId), body = text(b.texto ?? b.body)
        if (!clientId || !body) return bad('Faltan "cliente_id" y "texto"')
        const n = await addClientNote(clientId, body, Boolean(b.destacada), actor)
        return NextResponse.json({ ok: true, id: n.id }, { status: 201 })
      }
      case 'reuniones': {
        const title = text(b.titulo ?? b.title), date = text(b.fecha)
        if (!title || !date) return bad('Faltan "titulo" y "fecha" (AAAA-MM-DD)')
        const m = await createMeeting({ title, startsAt: new Date(`${date}T${text(b.hora) ?? '10:00'}:00-05:00`), clientId: text(b.cliente_id), location: text(b.lugar), link: text(b.enlace) }, actor)
        return NextResponse.json({ ok: true, id: m.id }, { status: 201 })
      }
      case 'etapa': {
        const id = text(b.id), etapa = text(b.etapa)
        if (!id || !etapa) return bad('Faltan "id" y "etapa"')
        await moveOpportunityTo(id, etapa, actor)
        return NextResponse.json({ ok: true })
      }
      case 'completar': {
        const id = text(b.id)
        if (!id) return bad('Falta "id" de la tarea')
        await setTaskDone(id, true, actor)
        return NextResponse.json({ ok: true })
      }
      default: return bad('Recurso desconocido', 404)
    }
  } catch (error) {
    return bad(error instanceof Error ? error.message : 'Error', 400)
  }
}
