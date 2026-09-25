'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { useFormStatus } from 'react-dom'
import type { ActionState } from '@/lib/crm/actions'
import { initials } from '@/lib/crm/format'

export function Avatar({ name, src, size }: { name: string; src: string | null; size?: number }) {
  const style = size ? { width: size, height: size, fontSize: Math.round(size * 0.36) } : undefined
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img className="avatar" src={src} alt="" style={style} referrerPolicy="no-referrer" /> : <span className="avatar avatar-initials" style={style} aria-hidden>{initials(name)}</span>
}

type FormAction = (fd: FormData) => Promise<ActionState>

// Diálogo con formulario: se cierra solo cuando la acción termina bien.
export function FormDialog({ trigger, title, eyebrow, action, children, submitLabel = 'Guardar', triggerClassName = 'primary-button', onDone, open: controlledOpen, onOpenChange, footerStart }: {
  trigger?: React.ReactNode; title: string; eyebrow?: string; action: FormAction; children: React.ReactNode; submitLabel?: string
  triggerClassName?: string; onDone?: () => void; open?: boolean; onOpenChange?: (open: boolean) => void; footerStart?: React.ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [innerOpen, setInnerOpen] = useState(false)
  const open = controlledOpen ?? innerOpen
  const setOpen = onOpenChange ?? setInnerOpen
  const [state, formAction] = useActionState(async (_prev: ActionState, fd: FormData) => {
    const result = await action(fd)
    if (!result?.error) { setOpen(false); onDone?.() }
    return result
  }, null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return <>
    {trigger && <button type="button" className={triggerClassName} onClick={() => setOpen(true)}>{trigger}</button>}
    <dialog ref={ref} onClose={() => setOpen(false)} aria-label={title}>
      {open && (
        <form action={formAction}>
          <header className="dialog-head">
            <div>{eyebrow && <p>{eyebrow}</p>}<h2>{title}</h2></div>
            <button type="button" className="icon-btn dialog-close" onClick={() => setOpen(false)} aria-label="Cerrar" />
          </header>
          <div className="form-grid">{children}</div>
          {state?.error && <p className="form-error" role="alert">{state.error}</p>}
          <footer className="dialog-foot">
            {footerStart && <span className="dialog-foot-start">{footerStart}</span>}
            <button type="button" className="quiet-button" onClick={() => setOpen(false)}>Cancelar</button>
            <SubmitButton>{submitLabel}</SubmitButton>
          </footer>
        </form>
      )}
    </dialog>
  </>
}

export function SubmitButton({ children, className = 'primary-button' }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus()
  return <button className={className} disabled={pending} aria-busy={pending}>{pending ? 'Guardando…' : children}</button>
}

// Formulario en línea (sin diálogo): muestra el error o el mensaje de la acción.
export function InlineForm({ action, children, className, resetOnSuccess = true }: { action: FormAction; children: React.ReactNode; className?: string; resetOnSuccess?: boolean }) {
  const ref = useRef<HTMLFormElement>(null)
  const [state, formAction] = useActionState(async (_prev: ActionState, fd: FormData) => {
    const result = await action(fd)
    if (!result?.error && resetOnSuccess) ref.current?.reset()
    return result
  }, null)
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {state?.error && <p className="form-error" role="alert">{state.error}</p>}
      {state?.message && <p className="form-ok" role="status">{state.message}</p>}
    </form>
  )
}

// Botón que ejecuta una acción directa (con confirmación opcional).
export function ActionButton({ run, confirm: confirmText, children, className = 'outline-button', title, disabled }: {
  run: () => Promise<ActionState>; confirm?: string; children: React.ReactNode; className?: string; title?: string; disabled?: boolean
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return <>
    <button type="button" className={className} title={title} aria-label={title} disabled={pending || disabled} aria-busy={pending}
      onClick={() => { if (confirmText && !window.confirm(confirmText)) return; start(async () => { const r = await run(); setError(r?.error ?? null) }) }}>
      {children}
    </button>
    {error && <span className="form-error" role="alert">{error}</span>}
  </>
}

export function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return <label className={full ? 'full' : undefined}>{label}{children}</label>
}

export function Select({ name, options, defaultValue, placeholder, required }: { name: string; options: (string | { value: string; label: string })[]; defaultValue?: string | null; placeholder?: string; required?: boolean }) {
  return (
    <select name={name} defaultValue={defaultValue ?? ''} required={required}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map(o => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}
