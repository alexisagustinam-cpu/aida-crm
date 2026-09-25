'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { moveOpportunity, toggleAutomation, toggleTask } from '@/lib/crm/actions'
import { useToast } from './shell'

// Casilla de una tarea: la marca como hecha (o pendiente) al instante.
export function TaskCheck({ id, done, title }: { id: string; done: boolean; title: string }) {
  const [pending, start] = useTransition()
  const [optimistic, setOptimistic] = useState(done)
  const toast = useToast()
  return (
    <button type="button" className={`check${optimistic ? ' checked' : ''}`} role="checkbox" aria-checked={optimistic} aria-label={optimistic ? `Marcar pendiente: ${title}` : `Completar: ${title}`} disabled={pending}
      onClick={() => { const next = !optimistic; setOptimistic(next); start(async () => { const r = await toggleTask(id); if (r?.error) { setOptimistic(!next); toast(r.error) } else if (next) toast('Tarea completada.') }) }}>
      {optimistic && <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 12 5 5 9-10" /></svg>}
    </button>
  )
}

export function DashTask({ task, due, color }: { task: { id: string; title: string; priority: string; done: boolean }; due: string; color: string }) {
  return (
    <div className={`dash-task${task.done ? ' done' : ''}`}>
      <TaskCheck id={task.id} done={task.done} title={task.title} />
      <span className="priority" style={{ background: color }} />
      <Link href="/tareas"><b>{task.title}</b><small>{task.priority}</small></Link>
      <time>{due}</time>
    </div>
  )
}

// Cambiar la etapa de un lead desde la tabla
export function StageSelect({ id, stage, company }: { id: string; stage: string; company: string }) {
  const [value, setValue] = useState(stage)
  const [pending, start] = useTransition()
  const toast = useToast()
  return (
    <select className="stage-select" value={value} disabled={pending} aria-label={`Etapa de ${company}`}
      onChange={e => { const next = e.target.value; setValue(next); start(async () => { const r = await moveOpportunity(id, next, null); if (r?.error) { setValue(stage); toast(r.error) } else toast(next === 'Ganado' ? `¡${company} ganado! Se creó el cliente.` : `${company} pasó a ${next}.`) }) }}>
      {['Lead', 'Contactado', 'Reunión', 'Propuesta', 'Ganado', 'Perdido'].map(s => <option key={s}>{s}</option>)}
    </select>
  )
}

// Interruptor de una automatización
export function AutomationSwitch({ id, active, name }: { id: string; active: boolean; name: string }) {
  const [on, setOn] = useState(active)
  const [pending, start] = useTransition()
  const toast = useToast()
  return <input type="checkbox" role="switch" className="switch" checked={on} disabled={pending} aria-label={`${on ? 'Desactivar' : 'Activar'}: ${name}`}
    onChange={() => { const next = !on; setOn(next); start(async () => { const r = await toggleAutomation(id); if (r?.error) { setOn(!next); toast(r.error) } else toast(next ? `“${name}” activada.` : `“${name}” pausada.`) }) }} />
}
