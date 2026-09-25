import { SettingsNav } from '@/components/crm/settings-nav'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="view">
      <section className="page-head"><div><h1>Configuración</h1><p>Tu perfil, la apariencia del CRM y sus conexiones con otras herramientas.</p></div></section>
      <div className="settings-layout"><SettingsNav /><div>{children}</div></div>
    </div>
  )
}
