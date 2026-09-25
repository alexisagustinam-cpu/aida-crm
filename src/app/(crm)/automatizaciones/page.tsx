import Link from 'next/link'
import { getAutomationRuns, getAutomations } from '@/lib/crm/queries'
import { AUTOMATION_REQUIRES, INTEGRATION_NAMES } from '@/lib/crm/automations'
import { listIntegrations } from '@/lib/crm/integrations'
import { formatAgo, nowMs } from '@/lib/crm/format'
import { AutomationSwitch } from '@/components/crm/interactive'
import { RunDailyButton } from '@/components/crm/run-daily'

const ICONS: Record<string, string> = { won_to_client: '★', new_lead_notify: '✉', meeting_prep_task: '◷', payment_activity: '$', tasks_due_notify: '✓', webhook_events: '⇄', lead_email_team: '@', daily_digest_email: '☀' }
const WHEN: Record<string, string> = {
  won_to_client: 'Cuando una oportunidad pasa a Ganado',
  new_lead_notify: 'Cuando entra un lead (CRM, web, n8n o MCP)',
  meeting_prep_task: 'Cuando se agenda una reunión con un cliente',
  payment_activity: 'Cuando una factura se marca como pagada',
  tasks_due_notify: 'Cada día a las 7:00 (hora de Ecuador)',
  webhook_events: 'En cada evento del CRM',
  lead_email_team: 'Cuando entra un lead',
  daily_digest_email: 'Cada día a las 7:00 (hora de Ecuador)',
}
const STATUS: Record<string, [string, string]> = { ok: ['green', 'Correcta'], error: ['red', 'Error'], skipped: ['orange', 'Omitida'] }

export default async function AutomationsPage() {
  const [rules, runs, { items }] = await Promise.all([getAutomations(), getAutomationRuns(40), listIntegrations()])
  const active = rules.filter(r => r.active).length
  const lastDay = runs.filter(r => r.createdAt.getTime() > nowMs() - 86_400_000)
  return (
    <div className="view">
      <section className="page-head">
        <div><h1>Automatizaciones</h1><p>{active} de {rules.length} activas · {lastDay.filter(r => r.status === 'ok').length} ejecuciones en las últimas 24 h. Cada ejecución queda en el historial de abajo.</p></div>
        <div className="page-actions"><RunDailyButton /><Link className="outline-button" href="/configuracion/integraciones">Integraciones</Link></div>
      </section>
      <section className="card-grid">
        {rules.map(r => {
          const requires = AUTOMATION_REQUIRES[r.key]
          const missing = requires && !items[requires]
          return (
            <article key={r.id} className="panel auto-card">
              <span className="auto-icon" aria-hidden>{ICONS[r.key] ?? '⚡'}</span>
              <div>
                <h3>{r.name}</h3>
                <p>{r.description}</p>
                <footer>
                  <b>{WHEN[r.key] ?? 'Cuando ocurre el evento'}</b><br />
                  {requires && <><span className={`pill ${missing ? 'orange' : 'green'}`}>{missing ? `Falta conectar ${INTEGRATION_NAMES[requires]}` : `Usa ${INTEGRATION_NAMES[requires]}`}</span><br /></>}
                  {r.runs ? `Se ejecutó ${r.runs} ${r.runs === 1 ? 'vez' : 'veces'} · última ${formatAgo(r.lastRunAt!).toLowerCase()}` : 'Todavía no se ha ejecutado'}
                </footer>
              </div>
              <AutomationSwitch id={r.id} active={r.active} name={r.name} />
            </article>
          )
        })}
      </section>
      <article className="panel" style={{ marginTop: 22 }}>
        <header className="panel-head"><div><h3>Historial de ejecuciones</h3><p>Las 40 más recientes: qué hizo cada automatización y si funcionó.</p></div></header>
        <div className="table-wrap">
          {runs.length === 0 ? <div className="empty-state"><b>Todavía no hay ejecuciones.</b>Crea un lead, gana una oportunidad o usa “Ejecutar revisión diaria ahora”.</div> : (
            <table className="data-table">
              <thead><tr><th>Automatización</th><th>Resultado</th><th>Detalle</th><th>Cuándo</th></tr></thead>
              <tbody>{runs.map(run => (
                <tr key={run.id}><td><b>{run.name ?? run.automationKey}</b></td><td><span className={`pill ${STATUS[run.status]?.[0] ?? ''}`}>{STATUS[run.status]?.[1] ?? run.status}</span></td><td>{run.detail ?? '—'}</td><td>{formatAgo(run.createdAt)}</td></tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </article>
    </div>
  )
}
