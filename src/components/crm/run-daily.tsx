'use client'

import { useTransition } from 'react'
import { runDailyNowAction } from '@/lib/crm/integration-actions'
import { useToast } from './shell'

export function RunDailyButton() {
  const [pending, start] = useTransition()
  const toast = useToast()
  return <button type="button" className="outline-button" disabled={pending} onClick={() => start(async () => { const r = await runDailyNowAction(); toast(r?.error ?? r?.message ?? 'Listo.') })}>{pending ? 'Ejecutando…' : 'Ejecutar revisión diaria ahora'}</button>
}
