'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import * as A from '@/lib/crm/actions'
import { ClientDialog, InvoiceDialog, MeetingDialog, RetainerDialog, TaskDialog } from './forms'
import { useToast } from './shell'
import { Composer, SummaryDialog, type Capabilities } from './composer'

type Option = { id: string; name: string }

function useMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close); document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])
  return { open, setOpen, ref }
}

// "Enviar mensaje": redactar (con IA si está conectada) y enviar por API, o abrir WhatsApp / correo.
export function MessageMenu({ clientId, phone, email, name, caps }: { clientId: string; phone: string | null; email: string | null; name: string; caps: Capabilities }) {
  const { open, setOpen, ref } = useMenu()
  const [composer, setComposer] = useState<null | 'whatsapp' | 'email'>(null)
  const digits = phone?.replace(/\D/g, '')
  const hello = encodeURIComponent(`Hola, ${name}. Te escribimos de AIDA Digital Solutions.`)
  return (
    <div className="menu-wrap" ref={ref}>
      <button type="button" className="primary-button" aria-expanded={open} onClick={() => setOpen(o => !o)}>Enviar mensaje</button>
      {open && (
        <div className="menu-pop" role="menu">
          <button role="menuitem" disabled={!digits} onClick={() => { setOpen(false); setComposer('whatsapp') }}>Escribir por WhatsApp{caps.ai ? ' (con IA)' : ''}{digits ? '' : ' · falta el teléfono'}</button>
          <button role="menuitem" disabled={!email} onClick={() => { setOpen(false); setComposer('email') }}>Escribir correo{caps.ai ? ' (con IA)' : ''}{email ? '' : ' · falta el correo'}</button>
          {digits && <a role="menuitem" href={`https://wa.me/${digits}?text=${hello}`} target="_blank" rel="noreferrer">Abrir chat de WhatsApp</a>}
          {digits && <a role="menuitem" href={`tel:+${digits}`}>Llamar</a>}
        </div>
      )}
      {composer && <Composer key={composer} open onClose={() => setComposer(null)} clientId={clientId} name={name} phone={phone} email={email} caps={caps} initialChannel={composer} />}
    </div>
  )
}

type ClientLike = Parameters<typeof ClientDialog>[0]['client'] & { archived: boolean }

export function ClientActions({ client, clients, projects, caps }: { client: NonNullable<ClientLike>; clients: Option[]; projects: Option[]; caps: Capabilities }) {
  const { open, setOpen, ref } = useMenu()
  const [dialog, setDialog] = useState<null | 'edit' | 'meeting' | 'task' | 'invoice' | 'retainer' | 'summary'>(null)
  const [, start] = useTransition()
  const toast = useToast()
  const pick = (d: typeof dialog) => { setOpen(false); setDialog(d) }
  return (
    <div className="client-actions">
      <MessageMenu clientId={client.id} phone={client.phone} email={client.email} name={client.contactName ?? client.name} caps={caps} />
      <div className="menu-wrap" ref={ref}>
        <button type="button" className="outline-button" aria-expanded={open} onClick={() => setOpen(o => !o)}>Más opciones</button>
        {open && (
          <div className="menu-pop" role="menu">
            <button role="menuitem" onClick={() => pick('summary')}>✦ Resumen con IA</button>
            <button role="menuitem" onClick={() => pick('meeting')}>Agendar reunión</button>
            <button role="menuitem" onClick={() => pick('task')}>Nueva tarea</button>
            <button role="menuitem" onClick={() => pick('invoice')}>Registrar factura</button>
            <button role="menuitem" onClick={() => pick('retainer')}>Agregar servicio mensual</button>
            <button role="menuitem" onClick={() => { setOpen(false); start(async () => { const r = await A.setClientArchived(client.id, !client.archived); toast(r?.error ?? (client.archived ? 'Cliente reactivado.' : 'Cliente archivado.')) }) }}>
              {client.archived ? 'Reactivar cliente' : 'Archivar cliente'}
            </button>
            <button role="menuitem" className="danger" onClick={() => { setOpen(false); if (window.confirm(`¿Eliminar a ${client.name} y todo su historial? No se puede deshacer.`)) start(async () => { await A.deleteClient(client.id) }) }}>Eliminar cliente</button>
          </div>
        )}
      </div>
      <button type="button" className="outline-button" onClick={() => setDialog('edit')}>Editar cliente</button>
      <ClientDialog client={client} open={dialog === 'edit'} onOpenChange={o => setDialog(o ? 'edit' : null)} />
      <MeetingDialog clients={clients} clientId={client.id} open={dialog === 'meeting'} onOpenChange={o => setDialog(o ? 'meeting' : null)} />
      <TaskDialog clients={clients} projects={projects} clientId={client.id} open={dialog === 'task'} onOpenChange={o => setDialog(o ? 'task' : null)} />
      <InvoiceDialog clients={clients} clientId={client.id} open={dialog === 'invoice'} onOpenChange={o => setDialog(o ? 'invoice' : null)} />
      <RetainerDialog clientId={client.id} open={dialog === 'retainer'} onOpenChange={o => setDialog(o ? 'retainer' : null)} />
      {dialog === 'summary' && <SummaryDialog open onClose={() => setDialog(null)} clientId={client.id} name={client.name} ai={caps.ai} />}
    </div>
  )
}

export function ChannelToggle({ channel }: { channel: { id: string; name: string; active: boolean } }) {
  const [active, setActive] = useState(channel.active)
  const [pending, start] = useTransition()
  return (
    <button type="button" className={`channel${active ? '' : ' off'}`} aria-pressed={active} disabled={pending} title={active ? 'Desactivar canal' : 'Activar canal'}
      onClick={() => { setActive(a => !a); start(async () => { const r = await A.toggleChannel(channel.id); if (r?.error) setActive(a => !a) }) }}>
      <i /><b>{channel.name}</b><small>{active ? 'Activo' : 'Inactivo'}</small>
    </button>
  )
}

// Avance de una parte del proyecto: se guarda al soltar el control.
export function ComponentSlider({ component }: { component: { id: string; name: string; progress: number; color: string } }) {
  const [value, setValue] = useState(component.progress)
  const [, start] = useTransition()
  const save = () => { if (value !== component.progress) start(async () => { await A.setComponentProgress(component.id, value) }) }
  return (
    <div className="component">
      <label htmlFor={`c-${component.id}`}><span>{component.name}</span><span>{value}%</span></label>
      <div className="bar" style={{ '--value': `${value}%`, '--bar': component.color } as React.CSSProperties}><i /></div>
      <input id={`c-${component.id}`} className="slider" type="range" min={0} max={100} step={5} value={value} aria-label={`Avance de ${component.name}`}
        onChange={e => setValue(Number(e.target.value))} onPointerUp={save} onKeyUp={save} onBlur={save} style={{ accentColor: component.color }} />
    </div>
  )
}
