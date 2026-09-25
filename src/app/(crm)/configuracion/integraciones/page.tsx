import { requireMember } from '@/lib/auth/member'
import { listIntegrations } from '@/lib/crm/integrations'
import { IntegrationCard } from '@/components/crm/integrations'
import { INTEGRATION_DEFS } from '@/lib/crm/integration-defs'

export default async function IntegrationsPage() {
  const [member, { items, aiDefault }] = await Promise.all([requireMember(), listIntegrations()])
  const isAdmin = member.role === 'Administrador'
  const groups = [
    { title: 'Inteligencia artificial', text: 'Conecta una o varias; la predeterminada es la que usa el CRM para redactar mensajes y resumir clientes. Cada llave se prueba contra el servicio antes de guardarse y queda cifrada.', keys: ['claude', 'openai', 'gemini'] },
    { title: 'Mensajería', text: 'Para enviar WhatsApp y correos desde el CRM. Sin conectarlas, los botones siguen abriendo WhatsApp y tu correo con el mensaje listo.', keys: ['whatsapp', 'email'] },
    { title: 'Automatización', text: 'n8n recibe los eventos del CRM. Para que n8n (o Claude) lean y creen datos en el CRM, usa una llave de “API y MCP”.', keys: ['n8n'] },
  ]
  return <>
    {groups.map(g => (
      <article key={g.title} className="panel settings-section">
        <h2>{g.title}</h2><p>{g.text}</p>
        {INTEGRATION_DEFS.filter(d => g.keys.includes(d.key)).map(d => <IntegrationCard key={d.key} def={d} state={items[d.key]} aiDefault={aiDefault} isAdmin={isAdmin} />)}
      </article>
    ))}
    <article className="panel settings-section">
      <h2>Inicio de sesión</h2><p>El equipo entra con Google o con correo y contraseña.</p>
      <div className="integration"><span className="int-icon" style={{ background: '#ffffff', color: '#4285f4' }}>G</span><span><b>Google</b><small>Inicio de sesión con cuentas de Google.</small></span><span className="pill green">Conectado</span></div>
    </article>
  </>
}
