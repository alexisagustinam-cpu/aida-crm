'use client'

import { ActionSubmitButton } from '@/components/ui/action-submit-button'
import { ActionFeedbackForm } from '@/components/ui/action-feedback-form'
import type { ActionResult } from '@/lib/actions/safe-action'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { INDUSTRIES } from '@/features/sales/domain/industry-catalog'

type CompanyOption = { id: string; name: string }
type ServerAction = (formData: FormData) => ActionResult | Promise<ActionResult>

const inputClass = 'mt-1 w-full border border-brand-border bg-brand-surface-elevated p-2.5'

export function CrmCreateDialog({ entity, action, companies }: { entity: 'company' | 'contact'; action: ServerAction; companies: CompanyOption[] }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const initialFocusRef = useRef<HTMLInputElement>(null)
  const reducedMotion = useReducedMotion()
  const isCompany = entity === 'company'
  const title = isCompany ? 'Nueva empresa' : 'Nuevo contacto'
  const transition = { duration: reducedMotion ? 0 : 0.16, ease: 'easeOut' as const }

  const close = () => setOpen(false)

  useEffect(() => {
    if (open) {
      initialFocusRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open])

  return <>
    <button ref={triggerRef} type="button" onClick={() => setOpen(true)} className="rounded-full bg-brand-text px-4 py-2.5 text-sm font-medium text-brand-bg transition-colors hover:bg-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary">+ {title.toLowerCase()}</button>
    <AnimatePresence onExitComplete={() => triggerRef.current?.focus()}>
      {open && <motion.div data-testid="crm-dialog-backdrop" className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-3 sm:place-items-center" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition}>
        <motion.section role="dialog" aria-modal="true" aria-labelledby={`${entity}-dialog-title`} className="w-full max-w-lg border border-brand-border bg-brand-bg p-5 shadow-2xl" onMouseDown={(event) => event.stopPropagation()} initial={{ opacity: 0, y: 18, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.99 }} transition={transition}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mono text-[10px] uppercase tracking-[.14em] text-brand-primary">CRM</p>
              <h2 id={`${entity}-dialog-title`} className="mt-1 text-xl font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-brand-muted">{isCompany ? 'Una empresa es una cuenta de negocio.' : 'Un contacto es una persona que todavía no está vinculada a una empresa, es independiente o tiene una relación externa.'}</p>
            </div>
            <button type="button" onClick={close} aria-label={`Cerrar ${title.toLowerCase()}`} className="text-sm text-brand-muted underline">Cerrar</button>
          </div>
          <ActionFeedbackForm action={action} successMessage={`${isCompany ? 'Empresa' : 'Contacto'} guardado correctamente`} className="mt-5 space-y-3">
            {isCompany ? <CompanyFields initialFocusRef={initialFocusRef} /> : <ContactFields initialFocusRef={initialFocusRef} companies={companies} />}
            <ActionSubmitButton className="w-full">Guardar {isCompany ? 'empresa' : 'contacto'}</ActionSubmitButton>
          </ActionFeedbackForm>
        </motion.section>
      </motion.div>}
    </AnimatePresence>
  </>
}

function CompanyFields({ initialFocusRef }: { initialFocusRef: React.RefObject<HTMLInputElement | null> }) {
  return <>
    <label className="block text-sm">Nombre de la empresa<input ref={initialFocusRef} required name="name" className={inputClass} /></label>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm">Industria<select name="industry" className={inputClass}><option value="">Selecciona una industria</option>{INDUSTRIES.map((industry) => <option key={industry} value={industry}>{industry}</option>)}</select></label>
      <label className="block text-sm">WhatsApp o teléfono<input name="phone" type="tel" className={inputClass} /></label>
    </div>
    <label className="block text-sm">Ciudad<input name="city" className={inputClass} /></label>
    <AdditionalFields>
      <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm">Email<input name="email" type="email" className={inputClass} /></label><label className="block text-sm">Sitio web<input name="website" type="url" className={inputClass} /></label></div>
      <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm">Razón social<input name="legalName" className={inputClass} /></label><label className="block text-sm">RUC<input name="taxId" className={inputClass} /></label></div>
      <div className="grid gap-3 sm:grid-cols-3"><label className="block text-sm">Instagram<input name="instagramUrl" type="url" className={inputClass} /></label><label className="block text-sm">Facebook<input name="facebookUrl" type="url" className={inputClass} /></label><label className="block text-sm">LinkedIn<input name="linkedinUrl" type="url" className={inputClass} /></label></div>
    </AdditionalFields>
  </>
}

function ContactFields({ initialFocusRef, companies }: { initialFocusRef: React.RefObject<HTMLInputElement | null>; companies: CompanyOption[] }) {
  return <>
    <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm">Nombre<input ref={initialFocusRef} required name="firstName" className={inputClass} /></label><label className="block text-sm">Apellido<input name="lastName" className={inputClass} /></label></div>
    <label className="block text-sm">Empresa asociada (opcional)<select name="companyId" className={inputClass}><option value="">Sin empresa asociada</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
    <label className="block text-sm">Email<input name="email" type="email" className={inputClass} /></label>
    <AdditionalFields>
      <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm">Teléfono<input name="phone" type="tel" className={inputClass} /></label><label className="block text-sm">WhatsApp<input name="whatsapp" type="tel" className={inputClass} /></label></div>
      <label className="block text-sm">Canal de contacto preferido<select name="preferredChannel" className={inputClass}><option value="">Sin preferencia</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="phone">Teléfono</option><option value="linkedin">LinkedIn</option></select></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm">Cargo<input name="jobTitle" className={inputClass} /></label><label className="block text-sm">Rol e influencia<select name="influence" className={inputClass}><option value="">Sin especificar</option><option value="decision_maker">Decisor/a</option><option value="influencer">Influyente</option><option value="user">Usuario/a</option><option value="other">Otro</option></select></label></div>
    </AdditionalFields>
  </>
}

function AdditionalFields({ children }: { children: React.ReactNode }) {
  return <details className="border-t border-brand-border pt-3">
    <summary className="cursor-pointer text-sm text-brand-primary underline underline-offset-4">Información adicional (opcional)</summary>
    <div className="mt-3 space-y-3">{children}</div>
  </details>
}
