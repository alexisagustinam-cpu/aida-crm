import { AppearanceSettings } from '@/components/crm/settings-parts'

export default function AppearancePage() {
  return <>
    <article className="panel settings-section">
      <h2>Apariencia</h2><p>Se guarda en este navegador.</p>
      <AppearanceSettings />
    </article>
    <article className="panel settings-section">
      <h2>Idioma y región</h2><p>El CRM trabaja en español, con horario de Ecuador y montos en dólares.</p>
      <div className="toggle-row"><span><b>Idioma</b><small>Español</small></span></div>
      <div className="toggle-row"><span><b>Zona horaria</b><small>Ecuador (GMT−5). “Hoy”, “Mañana”, las reuniones y la revisión diaria usan esta hora.</small></span></div>
      <div className="toggle-row"><span><b>Moneda</b><small>Dólares estadounidenses (USD)</small></span></div>
    </article>
  </>
}
