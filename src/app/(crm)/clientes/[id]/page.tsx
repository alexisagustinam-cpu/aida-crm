import Link from 'next/link'
import { notFound } from 'next/navigation'
import * as A from '@/lib/crm/actions'
import { getClientDetail, getClientOptions, getProjectOptions } from '@/lib/crm/queries'
import { listIntegrations } from '@/lib/crm/integrations'
import { formatAgo, formatDue, formatLongDate, formatMoney, formatShortDate, formatTime, isOverdue, monthLabel, signed } from '@/lib/crm/format'
import { ACTIVITY_COLORS } from '@/lib/crm/constants'
import { SetCrumb } from '@/components/crm/shell'
import { ClientMark } from '@/components/crm/marks'
import { ChannelToggle, ClientActions, ComponentSlider } from '@/components/crm/client-parts'
import { ContactDialog, InvoiceDialog, MeetingDialog, MetricsDialog, ProjectDialog, RetainerDialog, TaskDialog } from '@/components/crm/forms'
import { TaskCheck } from '@/components/crm/interactive'
import { ActionButton, InlineForm, SubmitButton } from '@/components/crm/ui'

const TABS = [['resumen', 'Resumen'], ['contactos', 'Contactos'], ['proyectos', 'Proyectos'], ['archivos', 'Archivos'], ['finanzas', 'Finanzas'], ['actividad', 'Actividad']] as const
type Tab = (typeof TABS)[number][0]

function Panel({ title, sub, action, children }: { title: string; sub?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <article className="panel section-pad">
      <header className="section-title"><div><h2>{title}</h2>{sub && <small>{sub}</small>}</div>{action}</header>
      {children}
    </article>
  )
}

export default async function ClientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params
  const { tab: rawTab } = await searchParams
  const tab: Tab = (TABS.find(t => t[0] === rawTab)?.[0]) ?? 'resumen'
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const [d, clients, projectOptions, integrations] = await Promise.all([getClientDetail(id), getClientOptions(), getProjectOptions(), listIntegrations()])
  const caps = { whatsapp: !!integrations.items.whatsapp, email: !!integrations.items.email, ai: integrations.aiDefault }
  if (!d) notFound()
  const { client: c } = d
  const since = c.clientSince ? monthLabel(`${c.clientSince}T12:00:00`) + ' ' + c.clientSince.slice(0, 4) : '—'
  const current = d.projects.find(p => p.status === 'En curso') ?? d.projects[0]
  const nextMeeting = d.meetings[0]
  const lastInvoice = d.invoices[0]
  const pinned = d.notes.filter(n => n.pinned)
  const openTasks = d.tasks.filter(t => !t.done)
  const mrr = d.retainers.filter(r => !r.endedAt).reduce((t, r) => t + r.monthlyCents, 0)

  const summary = (
    <div className="summary-grid">
      <div className="summary-left">
        <Panel title="Canales conectados" sub="Toca un canal para activarlo o desactivarlo">
          <div className="channels">{d.channels.map(ch => <ChannelToggle key={ch.id} channel={ch} />)}</div>
        </Panel>
        <Panel title="Próxima reunión" sub={nextMeeting ? formatLongDate(nextMeeting.startsAt) : 'Sin reuniones agendadas'}
          action={<MeetingDialog clients={clients} clientId={c.id} trigger="+ Agendar" triggerClassName="link-button" />}>
          {nextMeeting ? (
            <div className="meeting">
              <div className="meeting-date">{monthLabel(nextMeeting.startsAt).toUpperCase()}<br /><strong>{new Date(nextMeeting.startsAt).toLocaleDateString('es-EC', { day: 'numeric', timeZone: 'America/Guayaquil' })}</strong></div>
              <div>
                <b>{nextMeeting.title}</b>
                <p>{formatTime(nextMeeting.startsAt)} · {nextMeeting.location ?? 'Sin lugar'}</p>
                <div className="actions">
                  {nextMeeting.link ? <a className="outline-button" href={nextMeeting.link} target="_blank" rel="noreferrer">Unirse a la reunión</a>
                    : <MeetingDialog meeting={nextMeeting} clients={clients} trigger="Agregar enlace" triggerClassName="outline-button" />}
                  <MeetingDialog meeting={nextMeeting} clients={clients} trigger="Editar" triggerClassName="quiet-button" />
                </div>
              </div>
            </div>
          ) : <p className="muted-text">Agenda la próxima reunión con el botón “+ Agendar”.</p>}
        </Panel>
        {current ? <>
          <Panel title="Proyecto actual" action={<Link className="link-button" href={`/clientes/${c.id}?tab=proyectos`}>Ver proyectos</Link>}>
            <div className="project-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {current.image ? <img src={current.image} alt={`Vista del proyecto ${current.name}`} /> : <div className="project-placeholder"><ClientMark name={c.name} /></div>}
              <div>
                <h3>{current.name}</h3><p>{current.description}</p>
                <div className="bar" style={{ '--value': `${current.progress}%`, '--bar': '#0866ff' } as React.CSSProperties}><i /></div>
                <small className="progress-note">{current.progress}% completado{current.dueDate ? ` · entrega ${formatShortDate(current.dueDate)}` : ''}</small>
              </div>
            </div>
          </Panel>
          <Panel title="Componentes del proyecto" sub="Arrastra para actualizar el avance">
            <div className="components">{current.components.map(k => <ComponentSlider key={k.id} component={k} />)}</div>
          </Panel>
        </> : (
          <Panel title="Proyecto actual" action={<ProjectDialog clients={clients} clientId={c.id} trigger="+ Nuevo proyecto" triggerClassName="link-button" />}>
            <p className="muted-text">Este cliente todavía no tiene proyectos.</p>
          </Panel>
        )}
      </div>
      <div className="summary-right">
        <Panel title="Estado de pagos" action={<Link className="link-button" href={`/clientes/${c.id}?tab=finanzas`}>Ver finanzas</Link>}>
          {lastInvoice ? (
            <div className="invoice">
              <span><b>Invoice #{lastInvoice.number}</b><small>Facturada el {formatLongDate(lastInvoice.issuedOn)}</small></span>
              <span style={{ textAlign: 'right' }}>
                <b className={lastInvoice.status === 'Pagado' ? 'paid' : 'unpaid'}>{lastInvoice.status}</b><small>{formatMoney(lastInvoice.amountCents)}</small>
                {lastInvoice.status !== 'Pagado' && <ActionButton run={A.markInvoicePaid.bind(null, lastInvoice.id)} className="link-button">Marcar pagada</ActionButton>}
              </span>
            </div>
          ) : <p className="muted-text">Sin facturas todavía.</p>}
        </Panel>
        <Panel title="Resultados últimos 90 días" sub={d.results ? 'Comparado con los 90 días anteriores' : undefined} action={<MetricsDialog clientId={c.id} trigger="Cargar mes" triggerClassName="link-button" />}>
          {d.results ? (
            <div className="trends">
              {([['Visitas', d.results.visits], ['Leads', d.results.leads], ['Conversión', d.results.conversions]] as const).map(([label, v]) => (
                <div key={label} className="trend"><small>{label}</small><b>{d.results!.hasComparison ? signed(v) : '—'}</b><i>{d.results!.hasComparison ? 'vs. trimestre anterior' : 'Falta el trimestre anterior'}</i></div>
              ))}
            </div>
          ) : <p className="muted-text">Carga las visitas, leads y conversiones de cada mes para ver la tendencia.</p>}
        </Panel>
        <Panel title="Tareas" sub={`${openTasks.length} pendientes`} action={<TaskDialog clients={clients} projects={projectOptions} clientId={c.id} trigger="+ Tarea" triggerClassName="link-button" />}>
          <div>
            {openTasks.length === 0 && <p className="muted-text">Sin tareas pendientes.</p>}
            {openTasks.slice(0, 4).map(t => (
              <div key={t.id} className="task-line"><TaskCheck id={t.id} done={t.done} title={t.title} /><b>{t.title}</b><small className={isOverdue(t.dueDate) ? 'overdue' : undefined}>{formatDue(t.dueDate)}</small></div>
            ))}
          </div>
        </Panel>
        <Panel title="Notas destacadas">
          {pinned.length === 0 && <p className="muted-text">Sin notas destacadas.</p>}
          {pinned.map(n => <div key={n.id} className="note">{n.body}<footer><span>{n.author}</span><span>{formatAgo(n.createdAt)}</span></footer></div>)}
          <InlineForm action={A.addNote} className="inline-add">
            <input type="hidden" name="clientId" value={c.id} /><input type="hidden" name="pinned" value="true" />
            <textarea name="body" required placeholder="Escribe una nota importante sobre el cliente…" aria-label="Nueva nota" />
            <SubmitButton className="outline-button">Guardar nota</SubmitButton>
          </InlineForm>
        </Panel>
        <Panel title="Actividad reciente" action={<Link className="link-button" href={`/clientes/${c.id}?tab=actividad`}>Ver todo</Link>}>
          <div className="timeline">{d.activity.slice(0, 4).map(a => <div key={a.id}><b>{a.title}</b>{a.detail} · {formatAgo(a.createdAt)}</div>)}</div>
        </Panel>
      </div>
    </div>
  )

  const contactsTab = (
    <article className="panel tab-panel">
      <header className="section-title"><h2>Contactos</h2><ContactDialog clientId={c.id} trigger="+ Contacto" triggerClassName="primary-button" /></header>
      <div className="list-rows">
        {d.contacts.length === 0 && <p className="muted-text">Agrega a las personas con las que trabajan en este cliente.</p>}
        {d.contacts.map(p => (
          <div key={p.id} className="list-row">
            <span><b>{p.name}</b><small>{[p.role, p.email, p.phone].filter(Boolean).join(' · ')}</small></span>
            <span className="row-actions">
              {p.phone && <a className="icon-action" href={`https://wa.me/${p.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp</a>}
              {p.email && <a className="icon-action" href={`mailto:${p.email}`}>Correo</a>}
              <ContactDialog clientId={c.id} contact={p} trigger="Editar" triggerClassName="icon-action" />
              <ActionButton run={A.deleteContact.bind(null, p.id)} confirm={`¿Eliminar a ${p.name}?`} className="icon-action danger">Eliminar</ActionButton>
            </span>
          </div>
        ))}
      </div>
    </article>
  )

  const projectsTab = (
    <article className="panel tab-panel">
      <header className="section-title"><h2>Proyectos</h2><ProjectDialog clients={clients} clientId={c.id} trigger="+ Proyecto" triggerClassName="primary-button" /></header>
      <div className="list-rows">
        {d.projects.length === 0 && <p className="muted-text">Sin proyectos todavía.</p>}
        {d.projects.map(p => (
          <div key={p.id} className="list-row project-row">
            <span className="grow"><b>{p.name}</b><small>{p.status}{p.dueDate ? ` · entrega ${formatShortDate(p.dueDate)}` : ''}</small>
              <span className="bar" style={{ '--value': `${p.progress}%`, '--bar': '#0866ff' } as React.CSSProperties}><i /></span></span>
            <b className="pct">{p.progress}%</b>
            <span className="row-actions"><Link className="icon-action" href={`/proyectos#p-${p.id}`}>Abrir</Link></span>
          </div>
        ))}
      </div>
    </article>
  )

  const filesTab = (
    <article className="panel tab-panel">
      <header className="section-title"><h2>Archivos</h2></header>
      <p className="muted-text">Guarda aquí los enlaces a los archivos del cliente (Drive, Figma, Canva…).</p>
      <div className="list-rows">
        {d.files.map(f => (
          <div key={f.id} className="list-row">
            <span><b>{f.name}</b><small>{new URL(f.url).hostname} · {formatAgo(f.createdAt)}</small></span>
            <span className="row-actions"><a className="icon-action" href={f.url} target="_blank" rel="noreferrer">Abrir</a><ActionButton run={A.deleteFile.bind(null, f.id)} confirm={`¿Quitar ${f.name}?`} className="icon-action danger">Quitar</ActionButton></span>
          </div>
        ))}
      </div>
      <InlineForm action={A.addFile} className="inline-add">
        <input type="hidden" name="clientId" value={c.id} />
        <input name="name" required placeholder="Nombre (Brief, Logos, Fotos…)" aria-label="Nombre del archivo" />
        <input name="url" type="url" required placeholder="https://drive.google.com/…" aria-label="Enlace" />
        <SubmitButton className="outline-button">Agregar enlace</SubmitButton>
      </InlineForm>
    </article>
  )

  const financeTab = (
    <div className="two-col">
      <article className="panel tab-panel">
        <header className="section-title"><h2>Facturas</h2><InvoiceDialog clients={clients} clientId={c.id} trigger="+ Factura" triggerClassName="primary-button" /></header>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Factura</th><th>Monto</th><th>Estado</th><th /></tr></thead>
            <tbody>
              {d.invoices.map(inv => (
                <tr key={inv.id}>
                  <td><b>#{inv.number}</b><small>{inv.concept ?? '—'} · {formatLongDate(inv.issuedOn)}</small></td>
                  <td>{formatMoney(inv.amountCents)}</td>
                  <td><span className={`pill ${inv.status === 'Pagado' ? 'green' : inv.issuedOn < new Date().toISOString().slice(0, 10) ? 'orange' : 'blue'}`}>{inv.status}</span></td>
                  <td><span className="row-actions">
                    {inv.status !== 'Pagado' && <ActionButton run={A.markInvoicePaid.bind(null, inv.id)} className="icon-action">Pagada</ActionButton>}
                    <ActionButton run={A.deleteInvoice.bind(null, inv.id)} confirm={`¿Eliminar la factura #${inv.number}?`} className="icon-action danger">×</ActionButton>
                  </span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {d.invoices.length === 0 && <p className="muted-text">Sin facturas.</p>}
        </div>
      </article>
      <article className="panel tab-panel">
        <header className="section-title"><h2>Servicios mensuales</h2><RetainerDialog clientId={c.id} trigger="+ Servicio" triggerClassName="primary-button" /></header>
        <p className="muted-text">Suman {formatMoney(mrr)} al mes (MRR).</p>
        <div className="list-rows">
          {d.retainers.map(r => (
            <div key={r.id} className="list-row">
              <span><b>{r.service}</b><small>{formatMoney(r.monthlyCents)} al mes · desde {formatLongDate(r.startedAt)}{r.endedAt ? ` · terminó ${formatLongDate(r.endedAt)}` : ''}</small></span>
              <span className="row-actions">{!r.endedAt && <ActionButton run={A.endRetainer.bind(null, r.id)} confirm={`¿Terminar ${r.service}? Deja de sumar al MRR.`} className="icon-action">Terminar</ActionButton>}</span>
            </div>
          ))}
        </div>
      </article>
    </div>
  )

  const activityTab = (
    <article className="panel tab-panel">
      <h2>Actividad</h2>
      <div className="activity">{d.activity.map(a => {
        const col = ACTIVITY_COLORS[a.kind] ?? '#5f9dff'
        return <div key={a.id} className="activity-row"><span className="activity-icon" style={{ background: `${col}33`, color: col }}>●</span><span><b>{a.title}</b><small>{a.detail}{a.actor ? ` · ${a.actor}` : ''} · {formatAgo(a.createdAt)}</small></span></div>
      })}</div>
      <h2 style={{ marginTop: 26 }}>Todas las notas</h2>
      <div className="list-rows">{d.notes.map(n => (
        <div key={n.id} className="list-row"><span><b>{n.pinned ? '★ ' : ''}{n.body}</b><small>{n.author} · {formatAgo(n.createdAt)}</small></span>
          <span className="row-actions"><ActionButton run={A.toggleNotePin.bind(null, n.id)} className="icon-action">{n.pinned ? 'Quitar destacado' : 'Destacar'}</ActionButton><ActionButton run={A.deleteNote.bind(null, n.id)} confirm="¿Eliminar la nota?" className="icon-action danger">×</ActionButton></span></div>
      ))}</div>
      <InlineForm action={A.addNote} className="inline-add">
        <input type="hidden" name="clientId" value={c.id} />
        <textarea name="body" required placeholder="Nueva nota…" aria-label="Nueva nota" />
        <SubmitButton className="outline-button">Guardar nota</SubmitButton>
      </InlineForm>
    </article>
  )

  const body = { resumen: summary, contactos: contactsTab, proyectos: projectsTab, archivos: filesTab, finanzas: financeTab, actividad: activityTab }[tab]

  return (
    <div className="view client-detail">
      <SetCrumb label={`Clientes / ${c.name}`} />
      <section className="client-hero">
        <div className="client-main">
          <div className="client-mark"><ClientMark name={c.name} /></div>
          <div className="client-title">
            <h1>{c.name} <span className="status">{c.archived ? 'Archivado' : `Cliente ${c.status.toLowerCase()}`}</span></h1>
            <p>{[c.category, c.industry, c.location].filter(Boolean).join(' | ')}</p>
            <p>{c.description}</p>
          </div>
          <ClientActions client={c} clients={clients} projects={projectOptions} caps={caps} />
        </div>
        <div className="client-meta">
          <div><small>Cliente desde</small><b>{since}</b></div>
          <div><small>Responsable</small><b>{c.owner ?? '—'}</b></div>
          <div><small>Valor de cliente</small><b>{formatMoney(d.valueCents)} facturados{mrr ? ` · ${formatMoney(mrr)}/mes` : ''}</b></div>
          <div><small>Estado</small><b>{c.archived ? 'Archivado' : c.status}</b></div>
        </div>
      </section>
      <nav className="detail-tabs" aria-label="Secciones del cliente">
        {TABS.map(([key, label]) => <Link key={key} href={key === 'resumen' ? `/clientes/${c.id}` : `/clientes/${c.id}?tab=${key}`} scroll={false} className={`detail-tab${tab === key ? ' active' : ''}`} aria-current={tab === key ? 'page' : undefined}>{label}</Link>)}
      </nav>
      <section className="tab-content">{body}</section>
    </div>
  )
}
