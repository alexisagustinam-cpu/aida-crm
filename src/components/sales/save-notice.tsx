'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check } from 'lucide-react'

export function SaveNotice({ message }: { message?: string }) {
  const [visible, setVisible] = useState(Boolean(message))
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setVisible(false), 3600)
    return () => window.clearTimeout(timer)
  }, [message])

  return <AnimatePresence>
    {visible && message && <motion.div role="status" aria-live="polite" initial={reduced ? false : { opacity: 0, y: -10, scale: 0.98 }} animate={reduced ? undefined : { opacity: 1, y: 0, scale: 1 }} exit={reduced ? undefined : { opacity: 0, y: -8 }} transition={{ duration: reduced ? 0 : 0.16, ease: 'easeOut' }} className="fixed right-4 top-4 z-[60] flex max-w-sm items-center gap-3 border border-emerald-500 bg-emerald-950 px-4 py-3 text-sm font-medium text-emerald-50 shadow-xl">
      <span className="grid size-6 place-items-center rounded-full bg-emerald-500 text-emerald-950"><Check size={15} strokeWidth={3} aria-hidden="true" /></span>
      <span>{message}</span>
      <button type="button" aria-label="Cerrar confirmación" onClick={() => setVisible(false)} className="ml-1 text-emerald-200 hover:text-white">×</button>
    </motion.div>}
  </AnimatePresence>
}
