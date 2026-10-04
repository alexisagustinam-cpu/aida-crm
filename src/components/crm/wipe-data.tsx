'use client'

import { useState, useTransition } from 'react'
import { wipeCrmDataAction } from '@/lib/crm/integration-actions'
import { useToast } from './shell'

// Vacía el CRM (datos de ejemplo) tras escribir VACIAR. No se puede deshacer.
export function WipeData() {
  const [text, setText] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const toast = useToast()
  const ready = text.trim().toUpperCase() === 'VACIAR'
  return <>
    <div className="page-actions">
      <input value={text} onChange={e => setText(e.target.value)} placeholder="Escribe VACIAR" aria-label="Confirmación" autoComplete="off" style={{ maxWidth: 200 }} />
      <button type="button" className="outline-button danger-text" disabled={!ready || pending} onClick={() => {
        if (!window.confirm('Se borrarán todos los clientes, leads, proyectos, tareas, reuniones y facturas. No se puede deshacer. ¿Continuar?')) return
        start(async () => { const r = await wipeCrmDataAction(text); toast(r?.error ?? r?.message ?? 'Listo.'); if (!r?.error) { setResult(r?.message ?? null); setText('') } })
      }}>{pending ? 'Vaciando…' : 'Vaciar el CRM'}</button>
    </div>
    {result && <p className="form-ok">{result}</p>}
  </>
}
