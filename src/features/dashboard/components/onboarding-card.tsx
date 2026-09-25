'use client'

import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { X } from 'lucide-react'
import { useSyncExternalStore } from 'react'

const DISMISSED_KEY = 'automai:dashboard-onboarding-dismissed'

export function OnboardingCard({ initiallyEmpty }: { initiallyEmpty: boolean }) {
  const dismissed = useSyncExternalStore(
    (notify) => { window.addEventListener('automai:onboarding-dismissed', notify); return () => window.removeEventListener('automai:onboarding-dismissed', notify) },
    () => localStorage.getItem(DISMISSED_KEY) === 'true',
    () => false,
  )
  const reduceMotion = useReducedMotion()
  if (!initiallyEmpty) return null
  return <AnimatePresence initial={false}>{!dismissed && <motion.section initial={reduceMotion ? false : { opacity: 0, height: 0 }} animate={reduceMotion ? undefined : { opacity: 1, height: 'auto' }} exit={reduceMotion ? undefined : { opacity: 0, height: 0 }} transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }} className="mt-8 overflow-hidden border border-brand-primary/40 bg-brand-surface-elevated"><div className="relative p-5"><button type="button" aria-label="Cerrar primeros pasos" onClick={() => { localStorage.setItem(DISMISSED_KEY, 'true'); window.dispatchEvent(new Event('automai:onboarding-dismissed')) }} className="absolute right-3 top-3 rounded p-2 text-brand-muted hover:bg-brand-surface hover:text-brand-text focus-visible:outline-2 focus-visible:outline-brand-primary"><X size={16} /></button><p className="mono text-[10px] uppercase tracking-[0.14em] text-brand-primary">Primeros pasos</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.04em]">Cómo empezar hoy</h2><ol className="mt-4 grid gap-3 text-sm text-brand-muted md:grid-cols-4"><li><Link className="text-brand-text underline underline-offset-4" href="/sales/companies">1. Crear empresa o contacto</Link></li><li><Link className="text-brand-text underline underline-offset-4" href="/sales/leads">2. Registrar prospecto</Link></li><li><Link className="text-brand-text underline underline-offset-4" href="/sales/pipeline">3. Convertir en oportunidad</Link></li><li><Link className="text-brand-text underline underline-offset-4" href="/commercial/proposals">4. Registrar propuesta o cobro</Link></li></ol></div></motion.section>}</AnimatePresence>
}
