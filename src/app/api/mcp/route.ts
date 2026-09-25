import { createMcpHandler } from 'mcp-handler'
import { z } from 'zod'
import { eq, sql } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import { authenticateRequest } from '@/lib/crm/api-keys'
import { addClientNote, createLead, createMeeting, createTask, moveOpportunityTo, setTaskDone, STAGE_NAMES } from '@/lib/crm/core'
import * as Q from '@/lib/crm/queries'
import { formatMoney } from '@/lib/crm/format'

// Servidor MCP del CRM de AIDA: Claude (u otra herramienta compatible) puede consultar y crear
// datos del CRM. Requiere una llave de Configuración → API y MCP: "Authorization: Bearer aida_…".
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const json = (data: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] })
const money = (cents: number) => formatMoney(cents)

function buildHandler(actor: string) {
  return createMcpHandler(server => {
    server.registerTool('resumen_negocio', {
      title: 'Resumen del negocio',
      description: 'KPIs actuales de AIDA: valor del pipeline, MRR, clientes activos, tareas pendientes (con variación vs. hace 30 días) e ingresos cobrados de los últimos 6 meses.',
      inputSchema: z.object({}),
    }, async () => {
      const [k, income] = await Promise.all([Q.getKpis(), Q.getMonthlyIncome()])
      return json({
        pipeline: { valor: money(k.pipeline.value), cambio: `${k.pipeline.change}%` }, mrr: { valor: money(k.mrr.value), cambio: `${k.mrr.change}%` },
        clientesActivos: k.clients.value, tareasPendientes: k.tasks.value,
        ingresosPorMes: income.series.map(p => ({ mes: p.month.slice(0, 7), cobrado: money(p.total) })),
      })
    })

    server.registerTool('buscar', {
      title: 'Buscar en el CRM',
      description: 'Busca clientes, oportunidades, proyectos y tareas por texto (nombre, contacto, correo o título).',
      inputSchema: z.object({ texto: z.string().min(2).describe('Texto a buscar') }),
    }, async ({ texto }) => json(await Q.searchCrm(texto)))

    server.registerTool('listar_clientes', {
      title: 'Listar clientes',
      description: 'Lista los clientes con estado, industria, ciudad, contacto e ingreso mensual recurrente.',
      inputSchema: z.object({ estado: z.enum(['Activo', 'En pausa', 'Prospecto']).optional() }),
    }, async ({ estado }) => {
      const rows = await Q.getClients()
      return json(rows.filter(c => !estado || c.status === estado).map(c => ({ id: c.id, nombre: c.name, estado: c.status, industria: c.industry, ciudad: c.location, contacto: c.contactName, correo: c.email, telefono: c.phone, mrr: money(c.mrrCents) })))
    })

    server.registerTool('ver_cliente', {
      title: 'Ver ficha de un cliente',
      description: 'Ficha completa de un cliente: datos, contactos, proyectos con avance, facturas, tareas, próximas reuniones, notas y actividad reciente. Acepta el id o el nombre.',
      inputSchema: z.object({ cliente: z.string().describe('Id (uuid) o nombre del cliente') }),
    }, async ({ cliente }) => {
      const db = await getDb()
      const isId = /^[0-9a-f-]{36}$/i.test(cliente)
      const [row] = await db.select({ id: s.clients.id }).from(s.clients).where(isId ? eq(s.clients.id, cliente) : sql`lower(${s.clients.name}) like lower(${`%${cliente}%`})`)
      if (!row) return json({ error: `No encontré el cliente “${cliente}”.` })
      const d = (await Q.getClientDetail(row.id))!
      return json({
        cliente: d.client, valorFacturado: money(d.valueCents), contactos: d.contacts,
        proyectos: d.projects.map(p => ({ nombre: p.name, estado: p.status, avance: `${p.progress}%`, partes: p.components.map(c => `${c.name} ${c.progress}%`) })),
        facturas: d.invoices.slice(0, 10).map(i => ({ numero: i.number, concepto: i.concept, monto: money(i.amountCents), estado: i.status, fecha: i.issuedOn })),
        tareasPendientes: d.tasks.filter(t => !t.done).map(t => ({ id: t.id, titulo: t.title, vence: t.dueDate, prioridad: t.priority })),
        reuniones: d.meetings.map(m => ({ titulo: m.title, inicio: m.startsAt, enlace: m.link })), notas: d.notes.map(n => n.body),
        actividad: d.activity.slice(0, 10).map(a => `${a.title}: ${a.detail ?? ''}`),
      })
    })

    server.registerTool('listar_leads', {
      title: 'Listar leads y oportunidades',
      description: 'Oportunidades comerciales con etapa, valor, servicio y contacto. Sin etapa, devuelve las abiertas.',
      inputSchema: z.object({ etapa: z.enum(STAGE_NAMES as [string, ...string[]]).optional() }),
    }, async ({ etapa }) => {
      const rows = await Q.getBoard()
      return json(rows.filter(o => etapa ? o.stage === etapa : Q.OPEN_STAGES.includes(o.stage))
        .map(o => ({ id: o.id, empresa: o.company, servicio: o.service, valor: money(o.valueCents), etapa: o.stage, contacto: o.contactName, correo: o.email, telefono: o.phone, origen: o.source })))
    })

    server.registerTool('crear_lead', {
      title: 'Crear lead',
      description: 'Agrega un lead nuevo al pipeline (etapa Lead). Dispara las automatizaciones de lead nuevo.',
      inputSchema: z.object({
        empresa: z.string().min(1), servicio: z.string().min(1).describe('Sitio web, Branding, SEO, CRM…'),
        valor_usd: z.number().nonnegative().optional(), contacto: z.string().optional(), correo: z.string().optional(),
        telefono: z.string().optional(), origen: z.string().optional(), mensaje: z.string().optional(),
      }),
    }, async a => {
      const lead = await createLead({ company: a.empresa, service: a.servicio, valueCents: Math.round((a.valor_usd ?? 0) * 100), contactName: a.contacto, email: a.correo, phone: a.telefono, source: a.origen ?? 'MCP', message: a.mensaje }, actor)
      return json({ creado: true, id: lead.id, empresa: lead.company })
    })

    server.registerTool('mover_oportunidad', {
      title: 'Mover oportunidad de etapa',
      description: `Cambia la etapa de una oportunidad (${STAGE_NAMES.join(', ')}). Pasar a Ganado crea el cliente y su tarea de bienvenida.`,
      inputSchema: z.object({ id: z.string().uuid(), etapa: z.enum(STAGE_NAMES as [string, ...string[]]) }),
    }, async ({ id, etapa }) => {
      const o = await moveOpportunityTo(id, etapa, actor)
      return json({ ok: true, empresa: o.company, etapa })
    })

    server.registerTool('listar_tareas', {
      title: 'Listar tareas',
      description: 'Tareas del equipo filtradas por estado.',
      inputSchema: z.object({ filtro: z.enum(['pendientes', 'hoy', 'vencidas', 'hechas', 'todas']).default('pendientes') }),
    }, async ({ filtro }) => json((await Q.getTasks(filtro)).map(t => ({ id: t.id, titulo: t.title, prioridad: t.priority, vence: t.dueDate, hecha: t.done, cliente: t.clientName, proyecto: t.projectName, responsable: t.assignee }))))

    server.registerTool('crear_tarea', {
      title: 'Crear tarea',
      description: 'Crea una tarea. La fecha va en formato AAAA-MM-DD.',
      inputSchema: z.object({
        titulo: z.string().min(1), vence: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), prioridad: z.enum(['Alta', 'Media', 'Baja']).default('Media'),
        cliente_id: z.string().uuid().optional(), responsable: z.string().optional(),
      }),
    }, async a => {
      const t = await createTask({ title: a.titulo, dueDate: a.vence, priority: a.prioridad, clientId: a.cliente_id, assignee: a.responsable }, actor)
      return json({ creada: true, id: t.id })
    })

    server.registerTool('completar_tarea', {
      title: 'Completar tarea',
      description: 'Marca una tarea como hecha.',
      inputSchema: z.object({ id: z.string().uuid() }),
    }, async ({ id }) => { const t = await setTaskDone(id, true, actor); return json({ ok: true, tarea: t.title }) })

    server.registerTool('listar_reuniones', {
      title: 'Próximas reuniones',
      description: 'Reuniones agendadas desde hoy en adelante.',
      inputSchema: z.object({ limite: z.number().int().min(1).max(50).default(10) }),
    }, async ({ limite }) => json((await Q.getUpcomingMeetings(limite)).map(m => ({ id: m.id, titulo: m.title, inicio: m.startsAt, lugar: m.location, enlace: m.link, cliente: m.clientName }))))

    server.registerTool('agendar_reunion', {
      title: 'Agendar reunión',
      description: 'Agenda una reunión (hora de Ecuador). Si es con un cliente, crea la tarea de preparación.',
      inputSchema: z.object({
        titulo: z.string().min(1), fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), hora: z.string().regex(/^\d{2}:\d{2}$/).default('10:00'),
        cliente_id: z.string().uuid().optional(), lugar: z.string().optional(), enlace: z.string().url().optional(),
      }),
    }, async a => {
      const m = await createMeeting({ title: a.titulo, startsAt: new Date(`${a.fecha}T${a.hora}:00-05:00`), clientId: a.cliente_id, location: a.lugar, link: a.enlace }, actor)
      return json({ agendada: true, id: m.id })
    })

    server.registerTool('agregar_nota', {
      title: 'Agregar nota a un cliente',
      description: 'Guarda una nota en la ficha del cliente.',
      inputSchema: z.object({ cliente_id: z.string().uuid(), texto: z.string().min(1), destacada: z.boolean().default(false) }),
    }, async a => { await addClientNote(a.cliente_id, a.texto, a.destacada, actor); return json({ ok: true }) })
  }, { serverInfo: { name: 'aida-crm', version: '1.0.0' } })
}

async function handle(request: Request) {
  const key = await authenticateRequest(request)
  if (!key) return Response.json({ error: 'Falta una llave válida: Authorization: Bearer aida_…' }, { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } })
  return buildHandler(`${key.name} (MCP)`)(request)
}

export { handle as GET, handle as POST, handle as DELETE }

