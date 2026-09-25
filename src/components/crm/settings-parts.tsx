'use client'

import { useRef, useState, useSyncExternalStore, useTransition } from 'react'
import { regenerateIntakeKey, updateAvatar } from '@/lib/crm/actions'
import { Avatar } from './ui'
import { useToast } from './shell'

// Foto de perfil: se recorta al centro y se reduce a 256 px en el navegador antes de guardarla.
export function AvatarUploader({ name, avatar }: { name: string; avatar: string | null }) {
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState(avatar)
  const [pending, start] = useTransition()
  const toast = useToast()
  const onFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast('Elige una imagen (JPG, PNG o WebP).'); return }
    const bitmap = await createImageBitmap(file)
    const side = Math.min(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 256
    canvas.getContext('2d')!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 256, 256)
    const dataUrl = canvas.toDataURL('image/webp', 0.85)
    setPreview(dataUrl)
    start(async () => { const r = await updateAvatar(dataUrl); toast(r?.error ?? 'Foto actualizada.') })
  }
  return (
    <div className="avatar-edit">
      <Avatar name={name} src={preview} size={84} />
      <div className="page-actions">
        <button type="button" className="outline-button" disabled={pending} onClick={() => input.current?.click()}>{pending ? 'Guardando…' : 'Cambiar foto'}</button>
        {preview && <button type="button" className="quiet-button" disabled={pending} onClick={() => { setPreview(null); start(async () => { await updateAvatar(null); toast('Foto quitada.') }) }}>Quitar</button>}
        <input ref={input} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
      </div>
    </div>
  )
}

const subscribeRoot = (cb: () => void) => { const o = new MutationObserver(cb); o.observe(document.documentElement, { attributes: true }); return () => o.disconnect() }
const readPref = (key: string, fallback: string) => { try { return localStorage.getItem(key) ?? fallback } catch { return fallback } }

function setTheme(t: string) {
  try { localStorage.setItem('aida-theme', t) } catch {}
  const light = t === 'light' || (t === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches)
  document.documentElement.dataset.theme = light ? 'light' : 'dark'
}
function setSidebar(v: string) {
  try { localStorage.setItem('aida-sidebar', v) } catch {}
  if (v === 'collapsed') document.documentElement.dataset.sidebar = 'collapsed'; else delete document.documentElement.dataset.sidebar
}

// Tema y menú: preferencias de este navegador.
export function AppearanceSettings() {
  const theme = useSyncExternalStore(subscribeRoot, () => readPref('aida-theme', 'dark'), () => 'dark')
  const sidebar = useSyncExternalStore(subscribeRoot, () => (document.documentElement.dataset.sidebar === 'collapsed' ? 'collapsed' : 'open'), () => 'open')
  return <>
    <div className="toggle-row">
      <span><b>Tema</b><small>“Sistema” sigue la configuración de tu computadora o celular.</small></span>
      <div className="segmented" role="radiogroup" aria-label="Tema">
        {[['dark', 'Oscuro'], ['light', 'Claro'], ['system', 'Sistema']].map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={theme === v} className={theme === v ? 'active' : ''} onClick={() => setTheme(v)}>{l}</button>)}
      </div>
    </div>
    <div className="toggle-row">
      <span><b>Menú lateral</b><small>Plegado deja solo los íconos para aprovechar la pantalla.</small></span>
      <div className="segmented" role="radiogroup" aria-label="Menú lateral">
        {[['open', 'Expandido'], ['collapsed', 'Plegado']].map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={sidebar === v} className={sidebar === v ? 'active' : ''} onClick={() => setSidebar(v)}>{l}</button>)}
      </div>
    </div>
  </>
}

export function IntakeKey({ endpoint, intakeKey, canRegenerate }: { endpoint: string; intakeKey: string; canRegenerate: boolean }) {
  const [shown, setShown] = useState(false)
  const [pending, start] = useTransition()
  const toast = useToast()
  const copy = async (text: string, what: string) => { try { await navigator.clipboard.writeText(text); toast(`${what} copiado.`) } catch { toast('No se pudo copiar.') } }
  const example = `fetch('${endpoint}', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-aida-key': '${shown ? intakeKey : 'TU_LLAVE'}' }, body: JSON.stringify({ name, email, phone, service, message }) })`
  return <>
    <div className="code-box"><code>{endpoint}</code><button type="button" className="icon-action" onClick={() => copy(endpoint, 'Enlace')}>Copiar</button></div>
    <div className="code-box">
      <code>{shown ? intakeKey : '•'.repeat(24)}</code>
      <button type="button" className="icon-action" onClick={() => setShown(s => !s)}>{shown ? 'Ocultar' : 'Mostrar'}</button>
      <button type="button" className="icon-action" onClick={() => copy(intakeKey, 'Llave')}>Copiar</button>
      {canRegenerate && <button type="button" className="icon-action" disabled={pending} onClick={() => { if (window.confirm('Si cambias la llave, los formularios que usan la anterior dejarán de enviar leads. ¿Continuar?')) start(async () => { const r = await regenerateIntakeKey(); toast(r?.error ?? 'Llave nueva generada.') }) }}>Cambiar</button>}
    </div>
    <div className="code-box"><code>{example}</code><button type="button" className="icon-action" onClick={() => copy(example, 'Ejemplo')}>Copiar</button></div>
  </>
}
