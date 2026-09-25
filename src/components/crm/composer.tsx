'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { clientSummaryAction, draftMessageAction, saveSummaryAsNoteAction, sendMessageAction } from '@/lib/crm/integration-actions'
import { useToast } from './shell'

export type Capabilities = { whatsapp: boolean; email: boolean; ai: string | null }
const AI_NAMES: Record<string, string> = { claude: 'Claude', openai: 'OpenAI', gemini: 'Gemini' }

function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); if (!open && d.open) d.close() }, [open])
  return { ref, onClose }
}

// Redactar (a mano o con IA) y enviar un WhatsApp o un correo al cliente.
export function Composer({ open, onClose, clientId, name, phone, email, caps, initialChannel = 'whatsapp' }: {
  open: boolean; onClose: () => void; clientId: string; name: string; phone: string | null; email: string | null; caps: Capabilities; initialChannel?: 'whatsapp' | 'email'
}) {
  const { ref } = useDialog(open, onClose)
  const [channel, setChannel] = useState<'whatsapp' | 'email'>(initialChannel)
  const [to, setTo] = useState(initialChannel === 'email' ? email ?? '' : phone ?? '')
  const [subject, setSubject] = useState('AIDA Digital Solutions')
  const [body, setBody] = useState('')
  const [intent, setIntent] = useState('')
  const [pending, start] = useTransition()
  const [drafting, startDraft] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()
  const viaApi = channel === 'whatsapp' ? caps.whatsapp : caps.email
  const switchTo = (c: 'whatsapp' | 'email') => { setChannel(c); setTo(c === 'email' ? email ?? '' : phone ?? '') }
  const draft = () => startDraft(async () => {
    const fd = new FormData(); fd.set('clientId', clientId); fd.set('channel', channel); fd.set('intent', intent)
    const r = await draftMessageAction(fd)
    if (r?.error) setError(r.error); else { setError(null); setBody(r?.message ?? '') }
  })
  const send = () => {
    if (!viaApi) {
      const url = channel === 'whatsapp' ? `https://wa.me/${to.replace(/\D/g, '')}?text=${encodeURIComponent(body)}` : `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      window.open(url, '_blank', 'noopener'); onClose(); return
    }
    start(async () => {
      const fd = new FormData(); fd.set('channel', channel); fd.set('to', to); fd.set('subject', subject); fd.set('body', body); fd.set('clientId', clientId)
      const r = await sendMessageAction(fd)
      if (r?.error) setError(r.error); else { toast(r?.message ?? 'Enviado.'); setBody(''); onClose() }
    })
  }
  return (
    <dialog ref={ref} onClose={onClose} aria-label={`Mensaje para ${name}`} className="composer">
      {open && <div>
        <header className="dialog-head"><div><p>MENSAJE</p><h2>Escribir a {name}</h2></div><button type="button" className="icon-btn dialog-close" onClick={onClose} aria-label="Cerrar" /></header>
        <div className="form-grid">
          <div className="full segmented" role="radiogroup" aria-label="Canal">
            <button type="button" role="radio" aria-checked={channel === 'whatsapp'} className={channel === 'whatsapp' ? 'active' : ''} onClick={() => switchTo('whatsapp')}>WhatsApp</button>
            <button type="button" role="radio" aria-checked={channel === 'email'} className={channel === 'email' ? 'active' : ''} onClick={() => switchTo('email')}>Correo</button>
          </div>
          <label>{channel === 'whatsapp' ? 'Número' : 'Correo'}<input value={to} onChange={e => setTo(e.target.value)} required /></label>
          {channel === 'email' ? <label>Asunto<input value={subject} onChange={e => setSubject(e.target.value)} /></label> : <span />}
          {caps.ai ? (
            <div className="full ai-box">
              <label>Redactar con {AI_NAMES[caps.ai]}<input value={intent} onChange={e => setIntent(e.target.value)} placeholder="Ej.: recordarle la reunión del viernes y pedirle las fotos" /></label>
              <button type="button" className="outline-button" disabled={drafting || !intent.trim()} onClick={draft}>{drafting ? 'Redactando…' : '✦ Redactar'}</button>
            </div>
          ) : <p className="full muted-text">Conecta Claude, OpenAI o Gemini en Configuración → Integraciones para redactar con IA.</p>}
          <label className="full">Mensaje<textarea value={body} onChange={e => setBody(e.target.value)} rows={7} required /></label>
          <p className="full muted-text">{viaApi ? `Se envía directamente por ${channel === 'whatsapp' ? 'la API de WhatsApp' : 'Resend'} y queda en la actividad del cliente.` : `${channel === 'whatsapp' ? 'WhatsApp' : 'El correo'} no está conectado: se abrirá ${channel === 'whatsapp' ? 'WhatsApp' : 'tu app de correo'} con el mensaje listo.`}</p>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <footer className="dialog-foot"><button type="button" className="quiet-button" onClick={onClose}>Cancelar</button><button type="button" className="primary-button" disabled={pending || !body.trim() || !to.trim()} onClick={send}>{pending ? 'Enviando…' : viaApi ? 'Enviar' : `Abrir en ${channel === 'whatsapp' ? 'WhatsApp' : 'correo'}`}</button></footer>
      </div>}
    </dialog>
  )
}

export function SummaryDialog({ open, onClose, clientId, name, ai }: { open: boolean; onClose: () => void; clientId: string; name: string; ai: string | null }) {
  const { ref } = useDialog(open, onClose)
  const [text, setText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const toast = useToast()
  const generate = () => start(async () => { const r = await clientSummaryAction(clientId); if (r?.error) setError(r.error); else { setError(null); setText(r?.message ?? '') } })
  useEffect(() => { if (open && !text && !error && ai) generate() }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <dialog ref={ref} onClose={onClose} aria-label={`Resumen de ${name}`}>
      {open && <div>
        <header className="dialog-head"><div><p>RESUMEN CON {ai ? AI_NAMES[ai]?.toUpperCase() : 'IA'}</p><h2>{name}</h2></div><button type="button" className="icon-btn dialog-close" onClick={onClose} aria-label="Cerrar" /></header>
        <div className="summary-body">
          {!ai && <p className="muted-text">Conecta Claude, OpenAI o Gemini en Configuración → Integraciones.</p>}
          {pending && <p className="muted-text">Leyendo la ficha del cliente…</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          {text && !pending && <div className="ai-text">{text}</div>}
        </div>
        <footer className="dialog-foot">
          {text && <button type="button" className="quiet-button" disabled={pending} onClick={generate}>Volver a generar</button>}
          {text && <button type="button" className="outline-button" onClick={() => start(async () => { const r = await saveSummaryAsNoteAction(clientId, text); toast(r?.error ?? 'Guardado como nota.'); if (!r?.error) onClose() })}>Guardar como nota</button>}
          <button type="button" className="primary-button" onClick={onClose}>Listo</button>
        </footer>
      </div>}
    </dialog>
  )
}
