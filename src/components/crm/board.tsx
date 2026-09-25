'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { moveOpportunity } from '@/lib/crm/actions'
import { formatAgo, formatMoneyPlain, formatShortDate, formatWhen } from '@/lib/crm/format'
import { OpportunityDialog } from './forms'
import { useToast } from './shell'

type Opp = { id: string; company: string; service: string; valueCents: number; stage: string; contactName: string | null; email: string | null; phone: string | null; source: string | null; clientId: string | null; nextActionAt: string | null; stageChangedAt: string; position: number }
type Option = { id: string; name: string }

export const BOARD_STAGES = [
  { stage: 'Lead', color: '#5f9dff' }, { stage: 'Contactado', color: '#12c6b4' }, { stage: 'Reunión', color: '#a77bff' },
  { stage: 'Propuesta', color: '#ff7a1a' }, { stage: 'Ganado', color: '#41d18b' }, { stage: 'Perdido', color: '#8da0b8' },
]

function when(o: Opp) {
  if (o.nextActionAt && o.stage !== 'Ganado' && o.stage !== 'Perdido') return formatWhen(o.nextActionAt)
  return o.stage === 'Ganado' || o.stage === 'Perdido' ? formatShortDate(o.stageChangedAt) : formatAgo(o.stageChangedAt)
}

// Tablero del pipeline: arrastra una tarjeta a otra etapa (o reordénala dentro de la misma).
export function Board({ opportunities, clients }: { opportunities: Opp[]; clients: Option[] }) {
  const [items, setItems] = useState(opportunities)
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  const params = useSearchParams()

  // Los datos del servidor mandan cuando cambian (después de guardar)
  const [source, setSource] = useState(opportunities)
  if (source !== opportunities) { setSource(opportunities); setItems(opportunities) }

  // ?abrir=<id> (desde Inicio o el buscador) abre esa oportunidad
  useEffect(() => {
    const id = params.get('abrir')
    if (id && opportunities.some(o => o.id === id)) {
      const t = setTimeout(() => setEditing(id), 0)
      router.replace('/pipeline', { scroll: false })
      return () => clearTimeout(t)
    }
  }, [params, opportunities, router])

  const drop = (stage: string, beforeId: string | null) => {
    const id = dragging
    setDragging(null); setOver(null)
    if (!id || id === beforeId) return
    const moved = items.find(o => o.id === id)
    if (!moved) return
    // Movimiento optimista: la tarjeta cambia de lugar al instante
    const rest = items.filter(o => o.id !== id)
    const column = rest.filter(o => o.stage === stage)
    const at = beforeId ? column.findIndex(o => o.id === beforeId) : column.length
    column.splice(at < 0 ? column.length : at, 0, { ...moved, stage, stageChangedAt: moved.stage === stage ? moved.stageChangedAt : new Date().toISOString() })
    setItems([...rest.filter(o => o.stage !== stage), ...column.map((o, position) => ({ ...o, position }))])
    start(async () => {
      const r = await moveOpportunity(id, stage, beforeId)
      if (r?.error) { toast(r.error); setItems(opportunities) }
      else if (moved.stage !== stage) toast(stage === 'Ganado' ? `¡${moved.company} ganado! Se creó el cliente y la tarea de bienvenida.` : `${moved.company} pasó a ${stage}.`)
    })
  }

  const editingOpp = items.find(o => o.id === editing)
  return <>
    <div className="board">
      {BOARD_STAGES.map(({ stage, color }) => {
        const col = items.filter(o => o.stage === stage).sort((a, b) => a.position - b.position)
        const total = col.reduce((t, o) => t + o.valueCents, 0)
        return (
          <section key={stage} className={`stage${over === stage ? ' drag-over' : ''}`} style={{ '--stage': color } as React.CSSProperties} aria-label={stage}
            onDragOver={e => { if (dragging) { e.preventDefault(); setOver(stage) } }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null) }}
            onDrop={e => { e.preventDefault(); drop(stage, null) }}>
            <div className="stage-head"><i />{stage}<span>{col.length}</span></div>
            <div className="stage-total">${formatMoneyPlain(total)}</div>
            {col.map(o => (
              <article key={o.id} className={`opportunity${dragging === o.id ? ' dragging' : ''}`} draggable tabIndex={0} role="button" aria-label={`${o.company}, ${o.service}, $${formatMoneyPlain(o.valueCents)}. Enter para editar`}
                onDragStart={e => { setDragging(o.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', o.id) }} onDragEnd={() => { setDragging(null); setOver(null) }}
                onDragOver={e => { if (dragging) { e.preventDefault(); e.stopPropagation(); setOver(stage) } }}
                onDrop={e => { e.preventDefault(); e.stopPropagation(); drop(stage, o.id) }}
                onClick={() => setEditing(o.id)} onKeyDown={e => { if (e.key === 'Enter') setEditing(o.id) }}>
                <b>{o.company}</b><small>{o.service}{o.contactName ? ` · ${o.contactName}` : ''}</small><strong>${formatMoneyPlain(o.valueCents)}</strong>
                <div className="opp-meta"><em>{when(o)}</em>{o.source && <span className="pill">{o.source}</span>}</div>
              </article>
            ))}
            <OpportunityDialog stage={stage} clients={clients} trigger={`+ Agregar ${stage}`} triggerClassName="add-stage" />
          </section>
        )
      })}
    </div>
    {editingOpp && <OpportunityDialog key={editingOpp.id} opportunity={editingOpp} clients={clients} open onOpenChange={o => { if (!o) setEditing(null) }} />}
  </>
}
