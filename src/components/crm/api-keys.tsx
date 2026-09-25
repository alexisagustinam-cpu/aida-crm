'use client'

import { useState, useTransition } from 'react'
import { createApiKeyAction, revokeApiKeyAction } from '@/lib/crm/integration-actions'
import { useToast } from './shell'

type Key = { id: string; name: string; prefix: string; createdBy: string | null; createdAt: string; lastUsedAt: string | null }

export function ApiKeys({ keys, mcpUrl, isAdmin }: { keys: Key[]; mcpUrl: string; isAdmin: boolean }) {
  const [token, setToken] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const toast = useToast()
  const copy = async (t: string, what: string) => { try { await navigator.clipboard.writeText(t); toast(`${what} copiado.`) } catch { toast('No se pudo copiar.') } }
  const claudeCode = `claude mcp add --transport http aida ${mcpUrl} --header "Authorization: Bearer ${token ?? 'TU_LLAVE'}"`
  const desktop = JSON.stringify({ mcpServers: { aida: { command: 'npx', args: ['-y', 'mcp-remote', mcpUrl, '--header', `Authorization: Bearer ${token ?? 'TU_LLAVE'}`] } } }, null, 2)
  return <>
    {isAdmin && (
      <form className="inline-add" onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); const form = e.currentTarget; start(async () => { const r = await createApiKeyAction(fd); if (r?.error) toast(r.error); else { setToken(r?.message ?? null); form.reset() } }) }}>
        <input name="name" required placeholder="Nombre de la llave (p. ej. Claude de Agustín, n8n)" aria-label="Nombre de la llave" />
        <button className="primary-button" disabled={pending}>{pending ? 'Creando…' : 'Crear llave'}</button>
      </form>
    )}
    {token && (
      <div className="key-reveal" role="status">
        <b>Copia la llave ahora: no se volverá a mostrar.</b>
        <div className="code-box"><code>{token}</code><button type="button" className="icon-action" onClick={() => copy(token, 'Llave')}>Copiar</button></div>
      </div>
    )}
    <div className="list-rows" style={{ marginTop: 14 }}>
      {keys.length === 0 && <p className="muted-text">Todavía no hay llaves.</p>}
      {keys.map(k => (
        <div key={k.id} className="list-row">
          <span><b>{k.name}</b><small>{k.prefix}… · creada por {k.createdBy ?? '—'} · {k.lastUsedAt ? `último uso ${new Date(k.lastUsedAt).toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })}` : 'sin usar'}</small></span>
          {isAdmin && <span className="row-actions"><button type="button" className="icon-action danger" onClick={() => { if (window.confirm(`¿Revocar “${k.name}”? Lo que la use dejará de funcionar.`)) start(async () => { const r = await revokeApiKeyAction(k.id); toast(r?.error ?? 'Llave revocada.') }) }}>Revocar</button></span>}
        </div>
      ))}
    </div>
    <h3 className="sub-title">Conectar Claude u otra IA por MCP</h3>
    <p className="muted-text">Con esto, Claude puede consultar el resumen del negocio, buscar y ver clientes, listar y crear leads, mover oportunidades, crear y completar tareas, agendar reuniones y agregar notas.</p>
    <div className="code-box"><code>{mcpUrl}</code><button type="button" className="icon-action" onClick={() => copy(mcpUrl, 'Enlace')}>Copiar</button></div>
    <p className="muted-text" style={{ marginTop: 12 }}><b>Claude Code</b> (terminal):</p>
    <div className="code-box"><code>{claudeCode}</code><button type="button" className="icon-action" onClick={() => copy(claudeCode, 'Comando')}>Copiar</button></div>
    <p className="muted-text" style={{ marginTop: 12 }}><b>Claude Desktop, Cursor u otras apps</b> (archivo de configuración de MCP):</p>
    <div className="code-box"><pre>{desktop}</pre><button type="button" className="icon-action" onClick={() => copy(desktop, 'Configuración')}>Copiar</button></div>
  </>
}
