'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const SECTIONS = [
  ['perfil', 'Perfil'], ['apariencia', 'Apariencia'], ['integraciones', 'Integraciones'], ['api', 'API y MCP'], ['equipo', 'Equipo'], ['datos', 'Datos'],
] as const

export function SettingsNav() {
  const path = usePathname()
  return (
    <nav className="settings-nav" aria-label="Secciones de configuración">
      {SECTIONS.map(([id, label]) => {
        const href = `/configuracion/${id}`
        const active = path === href
        return <Link key={id} href={href} className={active ? 'active' : undefined} aria-current={active ? 'page' : undefined}>{label}</Link>
      })}
    </nav>
  )
}
