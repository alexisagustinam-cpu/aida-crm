'use client'

import * as A from '@/lib/crm/actions'
import { ActionButton, Field, FormDialog, Select } from './ui'

type Option = { id: string; name: string }
const opts = (list: Option[]) => list.map(o => ({ value: o.id, label: o.name }))
const dateInput = (d: Date | string | null | undefined) => (d ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(new Date(d)) : '')
const timeInput = (d: Date | string | null | undefined) => (d ? new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Guayaquil', hour: '2-digit', minute: '2-digit' }).format(new Date(d)) : '')
const money = (cents: number | null | undefined) => (cents ? String(Math.round(cents / 100)) : '')

export const STAGE_OPTIONS = ['Lead', 'Contactado', 'Reunión', 'Propuesta', 'Ganado', 'Perdido']
export const SERVICE_OPTIONS = ['Sitio web', 'Web', 'E-commerce', 'Branding', 'Redes sociales', 'SEO', 'CRM', 'WhatsApp', 'Automatización']
export const SOURCE_OPTIONS = ['Web', 'WhatsApp', 'Instagram', 'Redes sociales', 'Referido', 'Evento', 'Llamada']
export const INDUSTRY_OPTIONS = ['Salud y Bienestar', 'Servicios', 'Retail', 'Turismo', 'Gastronomía', 'Educación', 'Construcción', 'Tecnología', 'Otros']

type OpportunityLike = { id: string; company: string; service: string; valueCents: number; stage: string; contactName: string | null; email: string | null; phone: string | null; source: string | null; clientId: string | null; nextActionAt: Date | string | null }

export function OpportunityDialog({ opportunity, stage, clients, trigger, triggerClassName, open, onOpenChange }: {
  opportunity?: OpportunityLike; stage?: string; clients: Option[]; trigger?: React.ReactNode; triggerClassName?: string; open?: boolean; onOpenChange?: (o: boolean) => void
}) {
  const o = opportunity
  return (
    <FormDialog eyebrow={o ? 'OPORTUNIDAD' : 'NUEVA OPORTUNIDAD'} title={o ? o.company : 'Agregar lead'} action={o ? A.updateOpportunity : A.createOpportunity}
      trigger={trigger} triggerClassName={triggerClassName} open={open} onOpenChange={onOpenChange} submitLabel={o ? 'Guardar cambios' : 'Agregar'}
      footerStart={o && <ActionButton run={async () => { const r = await A.deleteOpportunity(o.id); if (!r?.error) onOpenChange?.(false); return r }} confirm={`¿Eliminar la oportunidad de ${o.company}?`} className="quiet-button danger-text">Eliminar</ActionButton>}>
      {o && <input type="hidden" name="id" value={o.id} />}
      <Field label="Empresa"><input name="company" required defaultValue={o?.company} autoFocus /></Field>
      <Field label="Servicio"><input name="service" required list="aida-services" defaultValue={o?.service} /></Field>
      <datalist id="aida-services">{SERVICE_OPTIONS.map(x => <option key={x} value={x} />)}</datalist>
      <Field label="Valor (USD)"><input name="value" inputMode="decimal" placeholder="14,500" defaultValue={money(o?.valueCents)} /></Field>
      <Field label="Etapa"><Select name="stage" options={STAGE_OPTIONS} defaultValue={o?.stage ?? stage ?? 'Lead'} /></Field>
      <Field label="Contacto"><input name="contactName" defaultValue={o?.contactName ?? ''} /></Field>
      <Field label="Origen"><Select name="source" options={SOURCE_OPTIONS} defaultValue={o?.source} placeholder="Sin origen" /></Field>
      <Field label="Correo"><input type="email" name="email" defaultValue={o?.email ?? ''} /></Field>
      <Field label="Teléfono"><input name="phone" defaultValue={o?.phone ?? ''} /></Field>
      <Field label="Próxima acción · fecha"><input type="date" name="nextDate" defaultValue={dateInput(o?.nextActionAt)} /></Field>
      <Field label="Hora"><input type="time" name="nextTime" defaultValue={timeInput(o?.nextActionAt)} /></Field>
      <Field label="Cliente existente" full><Select name="clientId" options={opts(clients)} defaultValue={o?.clientId} placeholder="Todavía no es cliente" /></Field>
    </FormDialog>
  )
}

type TaskLike = { id: string; title: string; priority: string; dueDate: string | null; clientId: string | null; projectId: string | null; assignee: string | null }

export function TaskDialog({ task, clients, projects, clientId, trigger, triggerClassName, open, onOpenChange }: {
  task?: TaskLike; clients: Option[]; projects: Option[]; clientId?: string; trigger?: React.ReactNode; triggerClassName?: string; open?: boolean; onOpenChange?: (o: boolean) => void
}) {
  return (
    <FormDialog eyebrow="TAREA" title={task ? 'Editar tarea' : 'Nueva tarea'} action={A.saveTask} trigger={trigger} triggerClassName={triggerClassName} open={open} onOpenChange={onOpenChange}>
      {task && <input type="hidden" name="id" value={task.id} />}
      <Field label="Tarea" full><input name="title" required defaultValue={task?.title} autoFocus /></Field>
      <Field label="Prioridad"><Select name="priority" options={['Alta', 'Media', 'Baja']} defaultValue={task?.priority ?? 'Media'} /></Field>
      <Field label="Vence"><input type="date" name="dueDate" defaultValue={task?.dueDate ?? ''} /></Field>
      <Field label="Cliente"><Select name="clientId" options={opts(clients)} defaultValue={task?.clientId ?? clientId} placeholder="Sin cliente" /></Field>
      <Field label="Proyecto"><Select name="projectId" options={opts(projects)} defaultValue={task?.projectId} placeholder="Sin proyecto" /></Field>
      <Field label="Responsable" full><input name="assignee" defaultValue={task?.assignee ?? ''} placeholder="Tú, si lo dejas vacío" /></Field>
    </FormDialog>
  )
}

type MeetingLike = { id: string; title: string; startsAt: Date | string; location: string | null; link: string | null; clientId: string | null }

export function MeetingDialog({ meeting, clients, clientId, trigger, triggerClassName, open, onOpenChange }: {
  meeting?: MeetingLike; clients: Option[]; clientId?: string; trigger?: React.ReactNode; triggerClassName?: string; open?: boolean; onOpenChange?: (o: boolean) => void
}) {
  return (
    <FormDialog eyebrow="REUNIÓN" title={meeting ? 'Editar reunión' : 'Agendar reunión'} action={A.saveMeeting} trigger={trigger} triggerClassName={triggerClassName} open={open} onOpenChange={onOpenChange}>
      {meeting && <input type="hidden" name="id" value={meeting.id} />}
      <Field label="Título" full><input name="title" required defaultValue={meeting?.title} autoFocus placeholder="Revisión de avances web" /></Field>
      <Field label="Fecha"><input type="date" name="date" required defaultValue={dateInput(meeting?.startsAt)} /></Field>
      <Field label="Hora"><input type="time" name="time" defaultValue={timeInput(meeting?.startsAt) || '10:00'} /></Field>
      <Field label="Lugar"><input name="location" defaultValue={meeting?.location ?? 'Google Meet'} /></Field>
      <Field label="Cliente"><Select name="clientId" options={opts(clients)} defaultValue={meeting?.clientId ?? clientId} placeholder="Sin cliente" /></Field>
      <Field label="Enlace de la reunión" full><input type="url" name="link" defaultValue={meeting?.link ?? ''} placeholder="https://meet.google.com/…" /></Field>
    </FormDialog>
  )
}

type ClientLike = { id: string; name: string; status: string; category: string | null; industry: string | null; location: string | null; description: string | null; contactName: string | null; email: string | null; phone: string | null; owner: string | null; clientSince: string | null }

export function ClientDialog({ client, trigger, triggerClassName, open, onOpenChange }: { client?: ClientLike; trigger?: React.ReactNode; triggerClassName?: string; open?: boolean; onOpenChange?: (o: boolean) => void }) {
  const c = client
  return (
    <FormDialog eyebrow="CLIENTE" title={c ? 'Editar cliente' : 'Nuevo cliente'} action={c ? A.updateClient : A.createClient} trigger={trigger} triggerClassName={triggerClassName}
      open={open} onOpenChange={onOpenChange} submitLabel={c ? 'Guardar cambios' : 'Crear cliente'}>
      {c && <input type="hidden" name="id" value={c.id} />}
      <Field label="Nombre"><input name="name" required defaultValue={c?.name} autoFocus /></Field>
      <Field label="Estado"><Select name="status" options={['Activo', 'En pausa', 'Prospecto']} defaultValue={c?.status ?? 'Activo'} /></Field>
      <Field label="Tipo de negocio"><input name="category" defaultValue={c?.category ?? ''} placeholder="Clínica dental" /></Field>
      <Field label="Industria"><input name="industry" list="aida-industries" defaultValue={c?.industry ?? ''} /></Field>
      <datalist id="aida-industries">{INDUSTRY_OPTIONS.map(x => <option key={x} value={x} />)}</datalist>
      <Field label="Contacto"><input name="contactName" defaultValue={c?.contactName ?? ''} /></Field>
      <Field label="Responsable en AIDA"><input name="owner" defaultValue={c?.owner ?? ''} /></Field>
      <Field label="Correo"><input type="email" name="email" defaultValue={c?.email ?? ''} /></Field>
      <Field label="Teléfono (con código de país)"><input name="phone" defaultValue={c?.phone ?? ''} placeholder="+593 99 000 0000" /></Field>
      <Field label="Ciudad"><input name="location" defaultValue={c?.location ?? ''} /></Field>
      <Field label="Cliente desde"><input type="date" name="clientSince" defaultValue={c?.clientSince ?? ''} /></Field>
      <Field label="Descripción" full><textarea name="description" defaultValue={c?.description ?? ''} /></Field>
    </FormDialog>
  )
}

type ProjectLike = { id: string; name: string; clientId: string | null; description: string | null; status: string; dueDate: string | null }

export function ProjectDialog({ project, clients, clientId, trigger, triggerClassName, open, onOpenChange }: {
  project?: ProjectLike; clients: Option[]; clientId?: string; trigger?: React.ReactNode; triggerClassName?: string; open?: boolean; onOpenChange?: (o: boolean) => void
}) {
  const p = project
  return (
    <FormDialog eyebrow="PROYECTO" title={p ? 'Editar proyecto' : 'Nuevo proyecto'} action={A.saveProject} trigger={trigger} triggerClassName={triggerClassName} open={open} onOpenChange={onOpenChange}>
      {p && <input type="hidden" name="id" value={p.id} />}
      <Field label="Nombre" full><input name="name" required defaultValue={p?.name} autoFocus placeholder="Sitio web corporativo" /></Field>
      <Field label="Cliente"><Select name="clientId" options={opts(clients)} defaultValue={p?.clientId ?? clientId} placeholder="Proyecto interno" /></Field>
      <Field label="Estado"><Select name="status" options={['En curso', 'En pausa', 'Terminado']} defaultValue={p?.status ?? 'En curso'} /></Field>
      <Field label="Entrega"><input type="date" name="dueDate" defaultValue={p?.dueDate ?? ''} /></Field>
      {!p && <Field label="Partes del proyecto"><input name="components" defaultValue="Web, CRM, WhatsApp, SEO" /><span className="hint">Separadas por coma; cada una lleva su avance.</span></Field>}
      <Field label="Descripción" full><textarea name="description" defaultValue={p?.description ?? ''} /></Field>
    </FormDialog>
  )
}

export function InvoiceDialog({ clients, clientId, trigger, triggerClassName, open, onOpenChange }: { clients: Option[]; clientId?: string; trigger?: React.ReactNode; triggerClassName?: string; open?: boolean; onOpenChange?: (o: boolean) => void }) {
  return (
    <FormDialog eyebrow="FACTURA" title="Registrar factura" action={A.createInvoice} trigger={trigger} triggerClassName={triggerClassName} open={open} onOpenChange={onOpenChange}>
      <Field label="Cliente"><Select name="clientId" options={opts(clients)} defaultValue={clientId} required placeholder="Elige un cliente" /></Field>
      <Field label="Número"><input name="number" placeholder="Automático" /></Field>
      <Field label="Concepto" full><input name="concept" placeholder="Sitio web · segundo pago" /></Field>
      <Field label="Monto (USD)"><input name="amount" required inputMode="decimal" placeholder="1,250" /></Field>
      <Field label="Fecha"><input type="date" name="issuedOn" defaultValue={dateInput(new Date())} /></Field>
      <Field label="Estado" full><Select name="status" options={['Pendiente', 'Pagado']} defaultValue="Pendiente" /></Field>
    </FormDialog>
  )
}

export function RetainerDialog({ clientId, trigger, triggerClassName, open, onOpenChange }: { clientId: string; trigger?: React.ReactNode; triggerClassName?: string; open?: boolean; onOpenChange?: (o: boolean) => void }) {
  return (
    <FormDialog eyebrow="SERVICIO RECURRENTE" title="Agregar servicio mensual" action={A.addRetainer} trigger={trigger} triggerClassName={triggerClassName} open={open} onOpenChange={onOpenChange}>
      <input type="hidden" name="clientId" value={clientId} />
      <Field label="Servicio" full><input name="service" required list="aida-services" placeholder="Mantenimiento web" /></Field>
      <Field label="Valor mensual (USD)"><input name="monthly" required inputMode="decimal" placeholder="450" /></Field>
      <Field label="Desde"><input type="date" name="startedAt" defaultValue={dateInput(new Date())} /></Field>
    </FormDialog>
  )
}

type ContactLike = { id: string; name: string; role: string | null; email: string | null; phone: string | null }

export function ContactDialog({ clientId, contact, trigger, triggerClassName }: { clientId: string; contact?: ContactLike; trigger: React.ReactNode; triggerClassName?: string }) {
  return (
    <FormDialog eyebrow="CONTACTO" title={contact ? 'Editar contacto' : 'Nuevo contacto'} action={A.saveContact} trigger={trigger} triggerClassName={triggerClassName}>
      <input type="hidden" name="clientId" value={clientId} />
      {contact && <input type="hidden" name="id" value={contact.id} />}
      <Field label="Nombre"><input name="name" required defaultValue={contact?.name} autoFocus /></Field>
      <Field label="Cargo"><input name="role" defaultValue={contact?.role ?? ''} /></Field>
      <Field label="Correo"><input type="email" name="email" defaultValue={contact?.email ?? ''} /></Field>
      <Field label="Teléfono"><input name="phone" defaultValue={contact?.phone ?? ''} /></Field>
    </FormDialog>
  )
}

export function MetricsDialog({ clientId, trigger, triggerClassName }: { clientId: string; trigger: React.ReactNode; triggerClassName?: string }) {
  const lastMonth = new Date(); lastMonth.setDate(1); lastMonth.setMonth(lastMonth.getMonth() - 1)
  return (
    <FormDialog eyebrow="RESULTADOS" title="Cargar resultados del mes" action={A.saveMetrics} trigger={trigger} triggerClassName={triggerClassName}>
      <input type="hidden" name="clientId" value={clientId} />
      <Field label="Mes" full><input type="month" name="month" required defaultValue={lastMonth.toISOString().slice(0, 7)} /></Field>
      <Field label="Visitas a la web"><input type="number" min={0} name="visits" required /></Field>
      <Field label="Leads recibidos"><input type="number" min={0} name="leads" required /></Field>
      <Field label="Conversiones (ventas o citas)" full><input type="number" min={0} name="conversions" required /></Field>
    </FormDialog>
  )
}
