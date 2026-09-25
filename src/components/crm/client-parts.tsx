'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import * as A from '@/lib/crm/actions'
import { ClientDialog, InvoiceDialog, MeetingDialog, RetainerDialog, TaskDialog } from './forms'
import { useToast } from './shell'

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

// "Enviar mensaje": abre WhatsApp, el correo o una llamada con los datos del cliente.
export function MessageMenu({ phone, email, name }: { phone: string | null; email: string | null; name: string }) {
  const { open, setOpen, ref } = useMenu()
  const digits = phone?.replace(/\D/g, '')
  const hello = encodeURIComponent(`Hola, ${name}. Te escribimos de AIDA Digital Solutions.`)
  return (
    <div className="menu-wrap" ref={ref}>
      <button type="button" className="primary-button" aria-expanded={open} onClick={() => setOpen(o => !o)}>Enviar mensaje</button>
      {open && (
        <div className="menu-pop" role="menu">
          {digits ? <a role="menuitem" href={`https://wa.me/${digits}?text=${hello}`} target="_blank" rel="noreferrer">WhatsApp · {phone}</a> : <button disabled>WhatsApp · falta el teléfono</button>}
          {email ? <a role="menuitem" href={`mailto:${email}?subject=${encodeURIComponent('AIDA Digital Solutions')}`}>Correo · {email}</a> : <button disabled>Correo · falta el correo</button>}
          {digits && <a role="menuitem" href={`tel:+${digits}`}>Llamar</a>}
        </div>
      )}
    </div>
  )
}

type ClientLike = Parameters<typeof ClientDialog>[0]['client'] & { archived: boolean }

export function ClientActions({ client, clients, projects }: { client: NonNullable<ClientLike>; clients: Option[]; projects: Option[] }) {
  const { open, setOpen, ref } = useMenu()
  const [dialog, setDialog] = useState<null | 'edit' | 'meeting' | 'task' | 'invoice' | 'retainer'>(null)
  const [, start] = useTransition()
  const toast = useToast()
  const pick = (d: typeof dialog) => { setOpen(false); setDialog(d) }
  return (
    <div className="client-actions">
      <MessageMenu phone={client.phone} email={client.email} name={client.contactName ?? client.name} />
      <div className="menu-wrap" ref={ref}>
        <button type="button" className="outline-button" aria-expanded={open} onClick={() => setOpen(o => !o)}>Más opciones</button>
        {open && (
          <div className="menu-pop" role="menu">
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
