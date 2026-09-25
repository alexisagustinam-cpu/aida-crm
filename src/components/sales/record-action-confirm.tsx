'use client'

import { ActionSubmitButton } from '@/components/ui/action-submit-button'
import { ActionFeedbackForm } from '@/components/ui/action-feedback-form'
import type { ActionResult } from '@/lib/actions/safe-action'

import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

type ServerAction = (formData: FormData) => ActionResult | Promise<ActionResult>

export function RecordActionConfirm({ id, label, message, action }: { id: string; label: string; message: string; action: ServerAction }) {
  const [open, setOpen] = useState(false)
  const reduced = useReducedMotion()
  return <div className="mt-3"><button type="button" onClick={() => setOpen(true)} className="text-sm text-red-700 underline">{label}</button><AnimatePresence>{open && <motion.section role="dialog" aria-modal="true" aria-label={`Confirmar ${label.toLowerCase()}`} initial={reduced ? false : { opacity: 0, y: 8 }} animate={reduced ? undefined : { opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0, y: 8 }} transition={{ duration: reduced ? 0 : 0.16 }} className="mt-3 border border-red-300 bg-red-50 p-3 text-sm"><p>{message}</p><ActionFeedbackForm action={action} successMessage={`${label} realizado correctamente`} className="mt-3 flex gap-3"><input type="hidden" name="id" value={id}/><ActionSubmitButton variant="danger">Confirmar</ActionSubmitButton><button type="button" onClick={() => setOpen(false)} className="underline">Cancelar</button></ActionFeedbackForm></motion.section>}</AnimatePresence></div>
}
