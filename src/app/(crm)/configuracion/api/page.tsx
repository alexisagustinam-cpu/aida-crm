import { headers } from 'next/headers'
import { requireMember } from '@/lib/auth/member'
import { listApiKeys } from '@/lib/crm/api-keys'
import { getSetting } from '@/lib/crm/queries'
import { ApiKeys } from '@/components/crm/api-keys'
import { IntakeKey } from '@/components/crm/settings-parts'

const EVENTS = [['lead.created', 'Entró un lead (CRM, web, n8n o MCP)'], ['opportunity.stage_changed', 'Una oportunidad cambió de etapa'], ['opportunity.won', 'Se ganó una oportunidad'], ['client.created', 'Hay un cliente nuevo'], ['task.completed', 'Se completó una tarea'], ['meeting.created', 'Se agendó una reunión'], ['invoice.paid', 'Se pagó una factura']]

export default async function ApiPage() {
  const [member, keys, intakeKey, h] = await Promise.all([requireMember(), listApiKeys(), getSetting<string>('intake_key'), headers()])
  const origin = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`
  const isAdmin = member.role === 'Administrador'
  return <>
    <article className="panel settings-section">
      <h2>Llaves de API y servidor MCP</h2>
      <p>Una llave permite que otra herramienta use el CRM en nombre del equipo: Claude (por MCP), n8n o tus scripts. Lo que hagan queda en la actividad con el nombre de la llave.</p>
      <ApiKeys keys={keys.map(k => ({ ...k, createdAt: k.createdAt.toISOString(), lastUsedAt: k.lastUsedAt?.toISOString() ?? null }))} mcpUrl={`${origin}/api/mcp`} isAdmin={isAdmin} />
    </article>
    <article className="panel settings-section">
      <h2>API para n8n y scripts</h2>
      <p>Con la misma llave, en la cabecera <code>Authorization: Bearer aida_…</code>. En n8n usa el nodo “HTTP Request” (o el nodo “MCP Client” con el enlace de arriba).</p>
      <div className="api-table">
        {[['GET', '/api/v1/resumen', 'KPIs e ingresos'], ['GET', '/api/v1/clientes', 'Clientes'], ['GET', '/api/v1/leads', 'Oportunidades'], ['GET', '/api/v1/tareas?filtro=hoy', 'Tareas (pendientes, hoy, vencidas, hechas, todas)'], ['GET', '/api/v1/reuniones', 'Próximas reuniones'],
          ['POST', '/api/v1/leads', '{ empresa, servicio, valor, contacto, correo, telefono, origen, mensaje }'], ['POST', '/api/v1/tareas', '{ titulo, vence, prioridad, cliente_id, responsable }'], ['POST', '/api/v1/notas', '{ cliente_id, texto, destacada }'],
          ['POST', '/api/v1/reuniones', '{ titulo, fecha, hora, cliente_id, lugar, enlace }'], ['POST', '/api/v1/etapa', '{ id, etapa }'], ['POST', '/api/v1/completar', '{ id } de la tarea']].map(([m, path, what]) => (
          <div key={m + path}><span className={`pill ${m === 'GET' ? 'blue' : 'green'}`}>{m}</span><code>{origin}{path}</code><small>{what}</small></div>
        ))}
      </div>
    </article>
    <article className="panel settings-section">
      <h2>Eventos que el CRM envía a n8n</h2>
      <p>Con n8n conectado en Integraciones y la automatización “Eventos a n8n / webhook” activa, cada uno de estos llega a tu webhook como <code>{'{ event, data, at }'}</code>.</p>
      <div className="api-table">{EVENTS.map(([e, what]) => <div key={e}><code>{e}</code><small>{what}</small></div>)}</div>
    </article>
    <article className="panel settings-section">
      <h2>Formulario de la web</h2>
      <p>Cualquier formulario puede crear un lead enviando sus datos a este enlace con la llave del formulario.</p>
      {intakeKey && <IntakeKey endpoint={`${origin}/api/intake/lead`} intakeKey={intakeKey} canRegenerate={isAdmin} />}
    </article>
  </>
}
