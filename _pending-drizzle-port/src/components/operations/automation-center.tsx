'use client'

import { ActionSubmitButton } from '@/components/ui/action-submit-button'
import { ActionFeedbackForm } from '@/components/ui/action-feedback-form'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Bot, Check, ChevronRight, MessageCircle, Network, X } from 'lucide-react'
import { createAutomation } from '@/app/actions/operations'

type Automation = {
  id: string
  name: string
  event_type: string
  webhook_url: string
  status: string
  last_error: string | null
}

type Connection = 'whatsapp' | 'hermes' | null

const checklists = {
  whatsapp: {
    title: 'Configurar WhatsApp Business API',
    intro: 'Esta conexión no está creada. Cuando decidas conectarla, configura las credenciales solo en el proveedor o en un servicio seguro del servidor.',
    items: ['Una cuenta de Meta Business verificada.', 'Una app de Meta con WhatsApp Business API aprobada.', 'Phone Number ID y Business Account ID.', 'Un endpoint HTTPS aprobado para webhooks y verificación.', 'Un servicio de entrega del lado del servidor para enviar y recibir mensajes.'],
  },
  hermes: {
    title: 'Configurar Hermes AI',
    intro: 'Hermes AI no está conectado. La configuración requiere un endpoint de herramienta aprobado; no ingreses claves en este CRM.',
    items: ['Un endpoint HTTPS de Hermes AI o del proveedor aprobado.', 'Autenticación gestionada fuera del navegador y del Postgres de este CRM.', 'Las herramientas permitidas y sus alcances revisados.', 'Un servicio del lado del servidor que valide solicitudes y entregue acciones.', 'Pruebas de auditoría antes de habilitar cualquier acción de escritura.'],
  },
} as const

function ConnectionDialog({ connection, onClose }: { connection: Exclude<Connection, null>; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const [copied, setCopied] = useState(false)
  const details = checklists[connection]
  const checklist = `${details.title}\n\n${details.items.map((item, index) => `${index + 1}. ${item}`).join('\n')}`

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      previousFocus.current?.focus()
    }
  }, [onClose])

  async function copyChecklist() {
    try {
      await navigator.clipboard.writeText(checklist)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return <div className="fixed inset-0 z-50 grid place-items-center bg-brand-text/35 p-4" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
    <section role="dialog" aria-modal="true" aria-labelledby="connection-dialog-title" className="w-full max-w-xl border border-brand-border bg-brand-surface-elevated p-5 shadow-xl sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div><p className="mono text-[10px] tracking-[.14em] text-brand-primary">CONEXIÓN PARA CONFIGURAR</p><h2 id="connection-dialog-title" className="mt-2 text-xl font-semibold tracking-[-.035em]">{details.title}</h2></div>
        <button ref={closeRef} type="button" aria-label="Cerrar configuración" onClick={onClose} className="grid size-9 place-items-center border border-brand-border text-brand-muted hover:border-brand-text hover:text-brand-text"><X size={17} /></button>
      </div>
      <p className="mt-4 max-w-lg text-sm leading-6 text-brand-muted">{details.intro}</p>
      <ol className="mt-5 space-y-2 border-y border-brand-border py-4 text-sm">{details.items.map((item, index) => <li key={item} className="flex gap-3"><span className="mono text-xs text-brand-primary">0{index + 1}</span><span>{item}</span></li>)}</ol>
      <label className="mt-5 block text-sm font-medium">Checklist copiable<textarea readOnly aria-label="Checklist de configuración" value={checklist} className="mt-2 min-h-28 w-full resize-y border border-brand-border bg-brand-bg p-3 text-xs leading-5 text-brand-muted" onFocus={(event) => event.currentTarget.select()} /></label>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p aria-live="polite" className="text-xs text-brand-muted">{copied ? 'Checklist copiado.' : 'No se guarda ningún secreto en este CRM.'}</p><button type="button" onClick={copyChecklist} className="inline-flex items-center gap-2 bg-brand-text px-3 py-2 text-sm font-medium text-brand-bg hover:bg-brand-primary">{copied && <Check size={15} />}Copiar checklist</button></div>
    </section>
  </div>
}

function ConnectionCard({ icon, title, prerequisites, action, onAction }: { icon: ReactNode; title: string; prerequisites: string; action: string; onAction: () => void }) {
  return <article className="flex min-w-0 flex-col border border-brand-border bg-brand-surface-elevated p-4">
    <div className="flex items-start justify-between gap-3"><div className="grid size-9 place-items-center border border-brand-border bg-brand-bg text-brand-primary">{icon}</div><span className="mono border border-brand-border px-2 py-1 text-[10px] text-brand-muted">NO CONECTADO</span></div>
    <h3 className="mt-5 font-semibold">{title}</h3><p className="mt-2 text-sm leading-5 text-brand-muted">{prerequisites}</p>
    <button type="button" onClick={onAction} className="mt-5 inline-flex w-fit items-center gap-1 text-sm font-medium text-brand-primary underline underline-offset-4">{action}<ChevronRight size={15} /></button>
  </article>
}

export function AutomationCenter({ automations }: { automations: Automation[] }) {
  const endpointRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [eventType, setEventType] = useState('deal.won')
  const [connection, setConnection] = useState<Connection>(null)

  function prepareN8n() {
    setName('n8n · Oportunidad ganada')
    setEventType('deal.won')
    requestAnimationFrame(() => endpointRef.current?.focus())
  }

  return <>
    <section aria-labelledby="connections-title" className="mt-8 max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-brand-border pb-4"><div><p className="mono text-[10px] tracking-[.14em] text-brand-primary">INTEGRACIONES EXTERNAS</p><h2 id="connections-title" className="mt-2 text-xl font-semibold tracking-[-.035em]">Conexiones</h2></div><p className="max-w-sm text-sm leading-5 text-brand-muted">Disponibles para configurar después. Ninguna está conectada ni recibe datos todavía.</p></div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <ConnectionCard icon={<Network size={18} />} title="n8n" prerequisites="Necesitas una URL HTTPS de un nodo Webhook de n8n. El motor de entrega de este CRM aún no está conectado." action="Preparar evento n8n" onAction={prepareN8n} />
        <ConnectionCard icon={<MessageCircle size={18} />} title="WhatsApp Business API" prerequisites="Requiere una cuenta Meta aprobada, una app de WhatsApp Business API y un endpoint HTTPS verificado." action="Ver requisitos" onAction={() => setConnection('whatsapp')} />
        <ConnectionCard icon={<Bot size={18} />} title="Hermes AI" prerequisites="Requiere un endpoint de herramienta aprobado y autenticación gestionada fuera de este CRM." action="Ver requisitos" onAction={() => setConnection('hermes')} />
      </div>
    </section>

    <section aria-labelledby="webhook-setup-title" className="mt-8 max-w-3xl">
      <div><p className="mono text-[10px] tracking-[.14em] text-brand-primary">WEBHOOKS</p><h2 id="webhook-setup-title" className="mt-2 text-xl font-semibold tracking-[-.035em]">Configurar evento</h2><p className="mt-2 text-sm text-brand-muted">Guardar una URL deja la automatización configurada. La entrega no comenzará hasta conectar un motor de entrega.</p></div>
      <ActionFeedbackForm action={createAutomation} successMessage="Automatización guardada correctamente" className="mt-4 grid gap-3 border border-brand-border bg-brand-surface-elevated p-4 md:grid-cols-2">
        <label className="text-sm font-medium">Nombre<input name="name" required minLength={2} value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre" className="mt-1.5 w-full border border-brand-border bg-brand-bg p-3 font-normal" /></label>
        <label className="text-sm font-medium">Evento<select name="eventType" value={eventType} onChange={(event) => setEventType(event.target.value)} className="mt-1.5 w-full border border-brand-border bg-brand-bg p-3 font-normal"><option value="deal.won">Oportunidad ganada</option><option value="invoice.paid">Factura pagada</option><option value="task.completed">Tarea completada</option><option value="project.completed">Proyecto completado</option></select></label>
        <label className="text-sm font-medium md:col-span-2">Endpoint HTTPS<input ref={endpointRef} name="endpoint" type="url" required placeholder="https://tu-n8n.example/webhook/crm" className="mt-1.5 w-full border border-brand-border bg-brand-bg p-3 font-normal" /></label>
        <p className="text-sm text-brand-muted">Estado al guardar: configurado; motor de entrega no conectado.</p><ActionSubmitButton className="justify-self-start bg-brand-text px-4 py-2.5 text-sm font-medium text-brand-bg hover:bg-brand-primary">Guardar configuración</ActionSubmitButton>
      </ActionFeedbackForm>
    </section>

    <section aria-labelledby="configured-title" className="mt-8 max-w-3xl"><h2 id="configured-title" className="text-xl font-semibold tracking-[-.035em]">Configuraciones guardadas</h2>{automations.length === 0 ? <p className="mt-3 border border-dashed border-brand-border bg-brand-surface-elevated p-4 text-sm text-brand-muted">Aún no hay webhooks configurados.</p> : <div className="mt-3 space-y-3">{automations.map((automation) => <article key={automation.id} className="border border-brand-border bg-brand-surface-elevated p-4"><div className="flex flex-wrap items-center gap-2"><b>{automation.name}</b><span className="mono text-xs text-brand-muted">{automation.event_type}</span></div><p className="mt-2 text-sm text-brand-muted">{automation.webhook_url}</p><p className="mt-2 text-sm text-brand-warning">Configurado; motor de entrega no conectado.{automation.last_error ? ` Último error registrado: ${automation.last_error}` : ''}</p></article>)}</div>}</section>
    {connection && <ConnectionDialog connection={connection} onClose={() => setConnection(null)} />}
  </>
}
