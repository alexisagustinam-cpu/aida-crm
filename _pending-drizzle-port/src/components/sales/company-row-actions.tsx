'use client'

import { ActionSubmitButton } from '@/components/ui/action-submit-button'
import { ActionFeedbackForm } from '@/components/ui/action-feedback-form'
import type { ActionResult } from '@/lib/actions/safe-action'

import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Archive, Pencil, Trash2, X } from 'lucide-react'

type ServerAction = (formData: FormData) => ActionResult | Promise<ActionResult>
type Company = { id: string; name: string; industry: string | null }

const iconButton = 'grid size-9 place-items-center rounded-lg border border-brand-border text-brand-muted transition-colors hover:border-brand-primary hover:bg-brand-surface-elevated hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary'

export function CompanyRowActions({ company, updateAction, archiveAction, deleteAction }: { company: Company; updateAction: ServerAction; archiveAction: ServerAction; deleteAction: ServerAction }) {
  const [dialog, setDialog] = useState<'edit' | 'archive' | 'delete' | null>(null)
  const reduced = useReducedMotion()
  const transition = { duration: reduced ? 0 : 0.16, ease: 'easeOut' as const }
  const isDanger = dialog === 'delete'

  return <>
    <div className="flex shrink-0 items-center gap-1" onClick={(event) => event.preventDefault()}>
      <button type="button" aria-label={`Editar ${company.name}`} title={`Editar ${company.name}`} onClick={() => setDialog('edit')} className={iconButton}><Pencil size={16} aria-hidden="true" /></button>
      <button type="button" aria-label={`Archivar ${company.name}`} title={`Archivar ${company.name}`} onClick={() => setDialog('archive')} className={iconButton}><Archive size={16} aria-hidden="true" /></button>
      <button type="button" aria-label={`Eliminar ${company.name}`} title={`Eliminar ${company.name}`} onClick={() => setDialog('delete')} className={`${iconButton} hover:border-red-500 hover:text-red-600`}><Trash2 size={16} aria-hidden="true" /></button>
    </div>
    <AnimatePresence>
      {dialog && <motion.div className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-3 sm:place-items-center" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition} onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null) }}>
        <motion.section role="dialog" aria-modal="true" aria-label={`${dialog === 'edit' ? 'Editar' : dialog === 'archive' ? 'Archivar' : 'Eliminar'} ${company.name}`} className="w-full max-w-md border border-brand-border bg-brand-bg p-5 shadow-2xl" initial={reduced ? false : { opacity: 0, y: 14, scale: 0.985 }} animate={reduced ? undefined : { opacity: 1, y: 0, scale: 1 }} exit={reduced ? undefined : { opacity: 0, y: 10 }} transition={transition}>
          <div className="flex items-start justify-between gap-4"><h2 className="text-lg font-semibold">{dialog === 'edit' ? 'Editar empresa' : dialog === 'archive' ? 'Archivar empresa' : 'Eliminar empresa'}</h2><button type="button" aria-label="Cerrar" onClick={() => setDialog(null)} className={iconButton}><X size={16} aria-hidden="true" /></button></div>
          {dialog === 'edit' ? <ActionFeedbackForm action={updateAction} successMessage="Empresa guardada correctamente" className="mt-5 grid gap-3"><input type="hidden" name="id" value={company.id} /><label className="text-sm">Nombre<input required name="name" defaultValue={company.name} className="mt-1 w-full border border-brand-border bg-brand-surface-elevated p-2.5" /></label><label className="text-sm">Industria<input name="industry" defaultValue={company.industry ?? ''} className="mt-1 w-full border border-brand-border bg-brand-surface-elevated p-2.5" /></label><ActionSubmitButton className="mt-2">Guardar cambios</ActionSubmitButton></ActionFeedbackForm> : <ActionFeedbackForm action={dialog === 'archive' ? archiveAction : deleteAction} successMessage={dialog === 'archive' ? 'Empresa archivada correctamente' : 'Empresa eliminada correctamente'} className="mt-4"><input type="hidden" name="id" value={company.id} /><p className="text-sm text-brand-muted">{dialog === 'archive' ? 'La empresa saldrá de la lista activa y conservará sus datos.' : 'Solo se eliminará si no tiene oportunidades, proyectos, facturas ni contactos vinculados. Si existen, archívala.'}</p><div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setDialog(null)} className="px-3 py-2 text-sm text-brand-muted">Cancelar</button><ActionSubmitButton variant={isDanger ? 'danger' : 'primary'}>{dialog === 'archive' ? 'Archivar empresa' : 'Eliminar permanentemente'}</ActionSubmitButton></div></ActionFeedbackForm>}
        </motion.section>
      </motion.div>}
    </AnimatePresence>
  </>
}
