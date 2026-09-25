'use client'

import { useState, useTransition } from 'react'
import * as I from '@/lib/crm/integration-actions'
import type { ActionState } from '@/lib/crm/actions'
import { InlineForm, SubmitButton } from './ui'
import { useToast } from './shell'
import type { IntegrationDef as Def } from '@/lib/crm/integration-defs'

type Status = { status: string; lastError: string | null; settings: Record<string, string>; masked: string | null; connectedBy: string | null; connectedAt: string; signingSecret: string | null }

export function IntegrationCard({ def, state, aiDefault, isAdmin }: { def: Def; state?: Status; aiDefault: string | null; isAdmin: boolean }) {
  const [editing, setEditing] = useState(!state)
  const [result, setResult] = useState<ActionState>(null)
  const [pending, start] = useTransition()
  const toast = useToast()
  const isAi = def.key === 'claude' || def.key === 'openai' || def.key === 'gemini'
  const models: string[] = state?.settings.models ? JSON.parse(state.settings.models) : []
  const run = (fn: () => Promise<ActionState>, ok?: string) => start(async () => { const r = await fn(); setResult(r); if (r?.error) toast(r.error); else if (ok) toast(ok) })
  const connected = !!state
  return (
    <article className="integration integration-card">
      <div className="int-head">
        <span className="int-icon" style={{ background: def.color[0], color: def.color[1] }}>{def.icon}</span>
        <span><b>{def.name}</b><small>{def.what}</small></span>
        {connected ? <span className={`pill ${state.status === 'error' ? 'red' : 'green'}`}>{state.status === 'error' ? 'Con error' : 'Conectado'}</span> : <span className="pill">No conectado</span>}
      </div>
      {connected && (
        <div className="int-body">
          <p className="muted-text">
            {state.masked && <>Llave {state.masked} · </>}
            {def.key === 'whatsapp' && <>Número: {state.settings.display || state.settings.phoneNumberId} · </>}
            {def.key === 'email' && <>Envía como {state.settings.from} · </>}
            {def.key === 'n8n' && <>Webhook: {state.settings.url} · </>}
            Conectado por {state.connectedBy ?? '—'}
          </p>
          {state.status === 'error' && state.lastError && <p className="form-error" style={{ margin: '8px 0 0' }}>Último error: {state.lastError}</p>}
          {isAi && (
            <div className="int-row">
              <label>Modelo
                <select value={state.settings.model} disabled={!isAdmin || pending} onChange={e => run(() => I.setAiModelAction(def.key as 'claude', e.target.value), 'Modelo actualizado.')}>
                  {models.map(m => <option key={m}>{m}</option>)}
                </select>
              </label>
              <label className="radio-line"><input type="radio" name="ai-default" checked={aiDefault === def.key} disabled={!isAdmin || pending} onChange={() => run(() => I.setAiDefaultAction(def.key as 'claude'), `${def.name} es la IA predeterminada.`)} /> IA predeterminada del CRM</label>
            </div>
          )}
          {def.key === 'n8n' && state.signingSecret && <p className="muted-text" style={{ marginTop: 8 }}>Cada envío lleva la cabecera <code>x-aida-signature: sha256=…</code> (HMAC con el secreto <code>{state.signingSecret.slice(0, 6)}…</code>) para que n8n verifique que viene del CRM.</p>}
          <div className="page-actions" style={{ marginTop: 12 }}>
            <button type="button" className="outline-button" disabled={pending} onClick={() => run(() => I.testIntegrationAction(def.key))}>{pending ? 'Probando…' : 'Probar'}</button>
            {isAdmin && <button type="button" className="quiet-button" onClick={() => setEditing(e => !e)}>{editing ? 'Cancelar' : 'Cambiar datos'}</button>}
            {isAdmin && <button type="button" className="quiet-button danger-text" disabled={pending} onClick={() => { if (window.confirm(`¿Desconectar ${def.name}?`)) run(() => I.disconnectAction(def.key), 'Desconectado.') }}>Desconectar</button>}
          </div>
          {result?.message && !result.error && <p className="form-ok">{result.message}</p>}
        </div>
      )}
      {editing && isAdmin && (
        <InlineForm action={async fd => { const r = await I.connectAction(fd); if (!r?.error) setEditing(false); return r }} className="settings-form int-form" resetOnSuccess={false}>
          <input type="hidden" name="key" value={def.key} />
          {def.fields.map(f => (
            <label key={f.name} className={def.fields.length === 1 ? 'full' : undefined}>{f.label}
              <input name={f.name} type={f.type ?? 'text'} required placeholder={f.placeholder} autoComplete="off" defaultValue={f.type === 'password' ? '' : state?.settings[f.name] ?? ''} />
              {f.hint && <span className="hint">{f.hint}</span>}
            </label>
          ))}
          <div className="form-actions"><SubmitButton>{connected ? 'Guardar y probar' : 'Conectar y probar'}</SubmitButton><a className="link-button" href={def.help.url} target="_blank" rel="noreferrer">{def.help.label} ↗</a></div>
        </InlineForm>
      )}
      {!isAdmin && !connected && <p className="muted-text" style={{ marginTop: 10 }}>Pide a un administrador que la conecte.</p>}
    </article>
  )
}
