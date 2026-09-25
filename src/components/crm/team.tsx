'use client'

import { useState, useTransition } from 'react'
import * as T from '@/lib/crm/team-actions'
import type { ActionState } from '@/lib/crm/actions'
import { Avatar } from './ui'
import { useToast } from './shell'

export type TeamRow = {
  id: string; name: string; email: string; role: string; title: string | null; avatar: string | null; active: boolean; linked: boolean
  invitedBy: string | null; inviteExpiresAt: string | null; inviteExpired: boolean; lastSeenAt: string | null
}

const when = (iso: string) => new Date(iso).toLocaleString('es-EC', { timeZone: 'America/Guayaquil', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export function Team({ rows, meId, isAdmin }: { rows: TeamRow[]; meId: string; isAdmin: boolean }) {
  const [link, setLink] = useState<{ url: string; mailed: boolean } | null>(null)
  const [pending, start] = useTransition()
  const toast = useToast()
  const run = (fn: () => Promise<ActionState>, ok?: string) => start(async () => {
    const r = await fn()
    if (r?.error) return toast(r.error)
    const url = r?.message?.match(/(https?:\/\/\S+)$/)?.[1]
    if (url) setLink({ url, mailed: r!.message!.startsWith('Invitación enviada') })
    else if (ok) toast(ok)
  })
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); toast('Enlace copiado.') } catch { toast('No se pudo copiar.') } }
  return <>
    {isAdmin && (
      <form className="invite-form" onSubmit={e => { e.preventDefault(); const form = e.currentTarget; const fd = new FormData(form); run(async () => { const r = await T.inviteAction(fd); if (!r?.error) form.reset(); return r }) }}>
        <label>Correo<input name="email" type="email" required placeholder="nombre@correo.com" autoComplete="off" /></label>
        <label>Nombre<input name="name" placeholder="Opcional" autoComplete="off" /></label>
        <label>Permiso<select name="role" defaultValue="Equipo"><option value="Equipo">Equipo</option><option value="Administrador">Administrador</option></select></label>
        <button className="primary-button" disabled={pending}>{pending ? 'Invitando…' : 'Invitar'}</button>
      </form>
    )}
    {link && (
      <div className="key-reveal" role="status">
        <b>{link.mailed ? 'Le enviamos la invitación por correo. ' : ''}Comparte este enlace solo con esa persona: sirve una vez, vence en 7 días y no se volverá a mostrar.</b>
        <div className="code-box"><code>{link.url}</code><button type="button" className="icon-action" onClick={() => copy(link.url)}>Copiar</button></div>
        <small className="muted-text">Si su correo es de Google, también puede entrar directo con “Continuar con Google”.</small>
      </div>
    )}
    <div className="list-rows" style={{ marginTop: 14 }}>
      {rows.map(m => {
        const me = m.id === meId
        const pendingInvite = !m.linked
        const expired = pendingInvite && m.inviteExpired
        const status = !m.active ? <span className="pill red">Desactivado</span>
          : pendingInvite ? <span className={`pill ${expired ? 'red' : 'orange'}`}>{expired ? 'Invitación vencida' : 'Invitación pendiente'}</span>
          : <span className="pill green">Activo</span>
        const detail = pendingInvite
          ? `${m.email} · invitado por ${m.invitedBy ?? '—'}${m.inviteExpiresAt && !expired ? ` · vence ${when(m.inviteExpiresAt)}` : ''}`
          : `${m.email}${m.title ? ` · ${m.title}` : ''} · ${m.lastSeenAt ? `último acceso ${when(m.lastSeenAt)}` : 'sin accesos registrados'}`
        return (
          <div key={m.id} className={`list-row team-row${m.active ? '' : ' is-off'}`}>
            <Avatar name={m.name} src={m.avatar} />
            <span><b>{m.name}{me ? ' (tú)' : ''}</b><small>{detail}</small></span>
            <span className="team-row-side">
              {status}
              {isAdmin && !me && !pendingInvite && m.active ? (
                <select aria-label={`Permiso de ${m.name}`} value={m.role} disabled={pending} onChange={e => run(() => T.setRoleAction(m.id, e.target.value), 'Permiso actualizado.')}>
                  <option value="Equipo">Equipo</option><option value="Administrador">Administrador</option>
                </select>
              ) : <span className="pill">{m.role}</span>}
              {isAdmin && !me && (
                <span className="row-actions">
                  {pendingInvite && m.active && <button type="button" className="icon-action" disabled={pending} onClick={() => run(() => T.renewInviteAction(m.id))}>Nuevo enlace</button>}
                  {pendingInvite && <button type="button" className="icon-action danger" disabled={pending} onClick={() => { if (window.confirm(`¿Cancelar la invitación de ${m.email}?`)) run(() => T.cancelInviteAction(m.id), 'Invitación cancelada.') }}>Cancelar</button>}
                  {!pendingInvite && (m.active
                    ? <button type="button" className="icon-action danger" disabled={pending} onClick={() => { if (window.confirm(`¿Desactivar a ${m.name}? Pierde el acceso al CRM de inmediato.`)) run(() => T.setActiveAction(m.id, false), `${m.name} ya no tiene acceso.`) }}>Desactivar</button>
                    : <button type="button" className="icon-action" disabled={pending} onClick={() => run(() => T.setActiveAction(m.id, true), `${m.name} tiene acceso otra vez.`)}>Reactivar</button>)}
                </span>
              )}
            </span>
          </div>
        )
      })}
    </div>
  </>
}
