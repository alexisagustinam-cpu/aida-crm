import Link from 'next/link'
import { getAutomations } from '@/lib/crm/queries'
import { formatAgo } from '@/lib/crm/format'
import { AutomationSwitch } from '@/components/crm/interactive'

const ICONS: Record<string, string> = { won_to_client: '★', new_lead_notify: '✉', meeting_prep_task: '◷', payment_activity: '$', tasks_due_notify: '✓' }
const WHEN: Record<string, string> = {
  won_to_client: 'Cuando: una oportunidad pasa a Ganado',
  new_lead_notify: 'Cuando: entra un lead (desde el CRM o la web)',
  meeting_prep_task: 'Cuando: se agenda una reunión con un cliente',
  payment_activity: 'Cuando: una factura se marca como pagada',
  tasks_due_notify: 'Cuando: se abre el CRM por primera vez en el día',
}

export default async function AutomationsPage() {
  const rules = await getAutomations()
  const active = rules.filter(r => r.active).length
  const runs = rules.reduce((t, r) => t + r.runs, 0)
  return (
    <div className="view">
      <section className="page-head">
        <div><h1>Automatizaciones</h1><p>{active} de {rules.length} activas · {runs} {runs === 1 ? 'ejecución' : 'ejecuciones'} en total. Se ejecutan solas dentro del CRM.</p></div>
        <div className="page-actions"><Link className="outline-button" href="/configuracion#integraciones">Integraciones</Link></div>
      </section>
      <section className="card-grid">
        {rules.map(r => (
          <article key={r.id} className="panel auto-card">
            <span className="auto-icon" aria-hidden>{ICONS[r.key] ?? '⚡'}</span>
            <div>
              <h3>{r.name}</h3>
              <p>{r.description}</p>
              <footer><b>{WHEN[r.key]}</b><br />{r.runs ? `Se ejecutó ${r.runs} ${r.runs === 1 ? 'vez' : 'veces'} · última ${formatAgo(r.lastRunAt!).toLowerCase()}` : 'Todavía no se ha ejecutado'}</footer>
            </div>
            <AutomationSwitch id={r.id} active={r.active} name={r.name} />
          </article>
        ))}
      </section>
      <article className="panel section-pad" style={{ marginTop: 20 }}>
        <h2 style={{ margin: '0 0 6px', fontSize: 17 }}>¿Qué más se puede automatizar?</h2>
        <p className="muted-text">Enviar mensajes de WhatsApp o correos automáticos requiere conectar esos servicios (por ejemplo, WhatsApp Business API o un servicio de correo). Cuando los conectemos, sus reglas aparecerán aquí con su interruptor.</p>
      </article>
    </div>
  )
}
