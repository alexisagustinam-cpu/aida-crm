import { headers } from 'next/headers'
import * as A from '@/lib/crm/actions'
import { requireMember } from '@/lib/auth/member'
import { getMembers, getSetting } from '@/lib/crm/queries'
import { formatLongDate } from '@/lib/crm/format'
import { AppearanceSettings, AvatarUploader, IntakeKey } from '@/components/crm/settings-parts'
import { Avatar, InlineForm, SubmitButton } from '@/components/crm/ui'

const SECTIONS = [['perfil', 'Perfil'], ['apariencia', 'Apariencia'], ['integraciones', 'Integraciones'], ['equipo', 'Equipo'], ['region', 'Idioma y región'], ['datos', 'Datos'], ['sesion', 'Sesión']] as const

export default async function SettingsPage() {
  const member = await requireMember()
  const [members, intakeKey, h] = await Promise.all([getMembers(), getSetting<string>('intake_key'), headers()])
  const origin = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`
  const isAdmin = member.role === 'Administrador'
  return (
    <div className="view">
      <section className="page-head"><div><h1>Configuración</h1><p>Tu perfil, la apariencia del CRM y sus conexiones.</p></div></section>
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Secciones de configuración">{SECTIONS.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>
        <div>
          <article id="perfil" className="panel settings-section">
            <h2>Perfil</h2><p>Así te ve el equipo en el CRM: en el menú, en las tareas y en la actividad.</p>
            <AvatarUploader name={member.name} avatar={member.avatar} />
            <InlineForm action={A.updateProfile} className="settings-form" resetOnSuccess={false}>
              <label>Nombre<input name="name" required defaultValue={member.name} /></label>
              <label>Cargo<input name="role" defaultValue={member.role} list="aida-roles" /></label>
              <datalist id="aida-roles"><option value="Administrador" /><option value="Ventas" /><option value="Diseño" /><option value="Desarrollo" /><option value="Equipo" /></datalist>
              <label className="full">Correo de la cuenta<input value={member.email} readOnly disabled /></label>
              <div className="form-actions"><SubmitButton>Guardar perfil</SubmitButton></div>
            </InlineForm>
          </article>

          <article id="apariencia" className="panel settings-section">
            <h2>Apariencia</h2><p>Se guarda en este navegador.</p>
            <AppearanceSettings />
          </article>

          <article id="integraciones" className="panel settings-section">
            <h2>Integraciones</h2><p>Qué está conectado hoy y qué falta por conectar.</p>
            <div className="integration"><span className="int-icon" style={{ background: '#ffffff', color: '#4285f4' }}>G</span><span><b>Inicio de sesión con Google</b><small>El equipo entra con su cuenta de Google o con correo y contraseña.</small></span><span className="pill green">Conectado</span></div>
            <div className="integration"><span className="int-icon" style={{ background: '#123e35', color: '#66e0ba' }}>W</span><span><b>WhatsApp</b><small>“Enviar mensaje” abre el chat del cliente en WhatsApp con un saludo listo. Los envíos automáticos requieren WhatsApp Business API.</small></span><span className="pill blue">Enlaces directos</span></div>
            <div className="integration"><span className="int-icon" style={{ background: '#163d7c', color: '#8fb8ff' }}>@</span><span><b>Correo</b><small>Los botones de correo abren tu aplicación de correo con el destinatario listo.</small></span><span className="pill blue">Enlaces directos</span></div>
            <div className="integration"><span className="int-icon" style={{ background: '#382d61', color: '#bda4ff' }}>M</span><span><b>Google Meet y Calendar</b><small>Pega el enlace de Meet en cada reunión y el botón “Unirse” lo abre. La sincronización automática con Google Calendar aún no está conectada.</small></span><span className="pill orange">Parcial</span></div>
            <div className="integration" style={{ display: 'block' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}><span className="int-icon" style={{ background: '#61351e', color: '#ffae75' }}>↘</span><span><b>Leads desde la web de AIDA</b><small>Cualquier formulario puede crear un lead enviando sus datos a este enlace con la llave. Entran al pipeline como “Lead” y avisan al equipo.</small></span><span className="pill green" style={{ marginLeft: 'auto' }}>Listo para usar</span></div>
              {intakeKey && <IntakeKey endpoint={`${origin}/api/intake/lead`} intakeKey={intakeKey} canRegenerate={isAdmin} />}
            </div>
          </article>

          <article id="equipo" className="panel settings-section">
            <h2>Equipo</h2><p>Personas que ya entraron al CRM. Para sumar a alguien, compártele el enlace del CRM y que cree su cuenta.</p>
            <div className="list-rows">
              {members.map(m => (
                <div key={m.id} className="list-row"><Avatar name={m.name} src={m.avatar} /><span><b>{m.name}{m.id === member.id ? ' (tú)' : ''}</b><small>{m.email} · desde {formatLongDate(m.createdAt)}</small></span><span className="pill" style={{ marginLeft: 'auto' }}>{m.role}</span></div>
              ))}
            </div>
          </article>

          <article id="region" className="panel settings-section">
            <h2>Idioma y región</h2><p>El CRM trabaja en español, con horario de Ecuador y montos en dólares.</p>
            <div className="toggle-row"><span><b>Idioma</b><small>Español</small></span></div>
            <div className="toggle-row"><span><b>Zona horaria</b><small>Ecuador (GMT−5). Las fechas “Hoy”, “Mañana” y las reuniones usan esta hora.</small></span></div>
            <div className="toggle-row"><span><b>Moneda</b><small>Dólares estadounidenses (USD)</small></span></div>
          </article>

          <article id="datos" className="panel settings-section">
            <h2>Datos</h2><p>Descarga una copia de todo lo que hay en el CRM.</p>
            <div className="page-actions"><a className="outline-button" href="/api/export">Exportar todo (JSON)</a><a className="outline-button" href="/api/export?formato=csv&tabla=clientes">Clientes (CSV)</a><a className="outline-button" href="/api/export?formato=csv&tabla=oportunidades">Oportunidades (CSV)</a><a className="outline-button" href="/api/export?formato=csv&tabla=facturas">Facturas (CSV)</a></div>
          </article>

          <article id="sesion" className="panel settings-section">
            <h2>Sesión</h2><p>Estás dentro como {member.email}.</p>
            <form action="/logout" method="post"><button className="outline-button">Cerrar sesión</button></form>
          </article>
        </div>
      </div>
    </div>
  )
}
