import Link from 'next/link'
import * as A from '@/lib/crm/actions'
import { getClientOptions, getProjects } from '@/lib/crm/queries'
import { formatShortDate, todayKey } from '@/lib/crm/format'
import { ProjectDialog } from '@/components/crm/forms'
import { ComponentSlider } from '@/components/crm/client-parts'
import { ActionButton, InlineForm, SubmitButton } from '@/components/crm/ui'

const FILTERS = [['En curso', 'En curso'], ['En pausa', 'En pausa'], ['Terminado', 'Terminados'], ['todos', 'Todos']] as const
const STATUS_PILL: Record<string, string> = { 'En curso': 'blue', 'En pausa': 'orange', Terminado: 'green' }

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado = 'En curso' } = await searchParams
  const [all, clients] = await Promise.all([getProjects(), getClientOptions()])
  const rows = estado === 'todos' ? all : all.filter(p => p.status === estado)
  const active = all.filter(p => p.status === 'En curso')
  const avg = active.length ? Math.round(active.reduce((t, p) => t + p.progress, 0) / active.length) : 0
  const late = active.filter(p => p.dueDate && p.dueDate < todayKey()).length
  return (
    <div className="view">
      <section className="page-head">
        <div><h1>Proyectos</h1><p>{active.length} en curso · avance promedio {avg}%{late ? ` · ${late} con la entrega vencida` : ''}.</p></div>
        <div className="page-actions"><ProjectDialog clients={clients} trigger="+ Nuevo proyecto" /></div>
      </section>
      <nav className="chip-row" aria-label="Filtrar proyectos">
        {FILTERS.map(([key, label]) => <Link key={key} href={key === 'En curso' ? '/proyectos' : `/proyectos?estado=${encodeURIComponent(key)}`} className={`chip${estado === key ? ' active' : ''}`}>{label}<span>{key === 'todos' ? all.length : all.filter(p => p.status === key).length}</span></Link>)}
      </nav>
      {rows.length === 0 && <div className="panel empty-state"><b>No hay proyectos aquí.</b>Crea uno con “Nuevo proyecto”.</div>}
      <section className="card-grid">
        {rows.map(p => (
          <article key={p.id} id={`p-${p.id}`} className="panel card">
            <div className="card-top">
              <div><h3>{p.name}</h3><p>{p.clientId ? <Link href={`/clientes/${p.clientId}`}>{p.clientName}</Link> : 'Proyecto interno'}{p.dueDate ? ` · entrega ${formatShortDate(p.dueDate)}` : ''}</p></div>
              <span className={`pill ${STATUS_PILL[p.status] ?? ''}`}>{p.status}</span>
            </div>
            {p.description && <p>{p.description}</p>}
            <div className="big-progress"><span className="muted-text">Avance total</span><b>{p.progress}%</b></div>
            <div className="bar" style={{ '--value': `${p.progress}%`, '--bar': '#0866ff' } as React.CSSProperties}><i /></div>
            <div className="components" style={{ marginTop: 18 }}>
              {p.components.map(k => (
                <div key={k.id} className="component-with-remove">
                  <ComponentSlider component={k} />
                  <ActionButton run={A.deleteComponent.bind(null, k.id)} confirm={`¿Quitar “${k.name}” del proyecto?`} className="icon-action danger" title={`Quitar ${k.name}`}>×</ActionButton>
                </div>
              ))}
            </div>
            <InlineForm action={A.addComponent} className="inline-add">
              <input type="hidden" name="projectId" value={p.id} />
              <input name="name" required placeholder="Nueva parte (p. ej. Fotos)" aria-label="Nueva parte del proyecto" />
              <SubmitButton className="outline-button">Agregar</SubmitButton>
            </InlineForm>
            <div className="card-actions">
              <ProjectDialog project={p} clients={clients} trigger="Editar" triggerClassName="outline-button" />
              <ActionButton run={A.deleteProject.bind(null, p.id)} confirm={`¿Eliminar el proyecto ${p.name}?`} className="quiet-button danger-text">Eliminar</ActionButton>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
