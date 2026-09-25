'use client'
/* eslint-disable @next/next/no-img-element -- logos pequeños ya optimizados en /public/crm */

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, useTransition } from 'react'
import { markNotificationsRead } from '@/lib/crm/actions'
import { searchAction, type SearchResults } from '@/lib/crm/search-action'
import { Avatar } from './ui'

const NAV = [
  { href: '/dashboard', label: 'Inicio', icon: 'home' },
  { href: '/leads', label: 'Leads', icon: 'users' },
  { href: '/clientes', label: 'Clientes', icon: 'briefcase' },
  { href: '/pipeline', label: 'Pipeline', icon: 'chart' },
  { href: '/proyectos', label: 'Proyectos', icon: 'folder' },
  { href: '/tareas', label: 'Tareas', icon: 'check' },
  { href: '/automatizaciones', label: 'Automatizaciones', icon: 'bolt' },
  { href: '/reportes', label: 'Reportes', icon: 'report' },
  { href: '/configuracion', label: 'Configuración', icon: 'settings' },
]

type Notification = { id: string; title: string; body: string | null; href: string | null; read: boolean; createdAt: string; ago: string }
type ShellMember = { name: string; role: string; avatar: string | null }

// Migas de pan: cada página puede fijar su propio texto (p. ej. "Clientes / Selfie Dental").
const CrumbContext = createContext<(label: string | null) => void>(() => {})
export function SetCrumb({ label }: { label: string }) {
  const set = useContext(CrumbContext)
  useEffect(() => { set(label); return () => set(null) }, [label, set])
  return null
}

// Avisos breves en la parte baja de la pantalla.
const ToastContext = createContext<(message: string) => void>(() => {})
export const useToast = () => useContext(ToastContext)

export function CrmShell({ member, notifications, children }: { member: ShellMember; notifications: Notification[]; children: React.ReactNode }) {
  const pathname = usePathname()
  const [crumb, setCrumb] = useState<string | null>(null)
  const [drawer, setDrawer] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const showToast = useCallback((message: string) => {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }, [])
  const active = NAV.find(n => pathname === n.href || pathname.startsWith(`${n.href}/`))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawer(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <CrumbContext.Provider value={setCrumb}>
      <ToastContext.Provider value={showToast}>
        <div className="app-shell">
          <aside className={`sidebar${drawer ? ' open' : ''}`} id="sidebar" aria-label="Navegación principal">
            <div className="side-top">
              <Link href="/dashboard" className="brand-home" aria-label="AIDA, inicio">
                <img className="brand-logo logo-dark" src="/crm/logo-dark.webp" width={480} height={162} alt="" />
                <img className="brand-logo logo-light" src="/crm/logo-light.webp" width={480} height={162} alt="" />
                <img className="brand-mark logo-dark" src="/crm/logo-mark-dark.webp" width={120} height={96} alt="" />
                <img className="brand-mark logo-light" src="/crm/logo-mark-light.webp" width={120} height={96} alt="" />
              </Link>
              <CollapseButton />
              <button className="drawer-close icon-btn" aria-label="Cerrar menú" onClick={() => setDrawer(false)} />
            </div>
            <nav className="nav" aria-label="Módulos">
              {NAV.map(n => (
                <Link key={n.href} href={n.href} onClick={() => setDrawer(false)} className={`nav-link${active?.href === n.href ? ' active' : ''}`} data-icon={n.icon} title={n.label} aria-current={active?.href === n.href ? 'page' : undefined}>
                  <span>{n.label}</span>
                </Link>
              ))}
            </nav>
            <div className="side-bottom">
              <section className="brand-callout">
                <span className="shape shape-blue" /><span className="shape shape-orange" />
                <p>Ideas digitales para<br />un mundo real.</p>
                <a className="circle-arrow" href="https://aida-website-fawn.vercel.app/" target="_blank" rel="noreferrer" aria-label="Abrir el sitio web de AIDA" title="Abrir el sitio web de AIDA">↗</a>
              </section>
              <div className="operator">
                <Avatar name={member.name} src={member.avatar} />
                <span><b>{member.name}</b><small>{member.role}</small></span>
                <Link className="more-btn" href="/configuracion" aria-label="Configuración y perfil" title="Configuración y perfil">•••</Link>
              </div>
            </div>
          </aside>
          <div className={`backdrop${drawer ? ' active' : ''}`} onClick={() => setDrawer(false)} />
          <header className="mobile-header">
            <button className="icon-btn menu-btn" aria-label="Abrir menú" aria-controls="sidebar" aria-expanded={drawer} onClick={() => setDrawer(true)} />
            <Link href="/dashboard" aria-label="AIDA, inicio">
              <img className="brand-logo logo-dark" src="/crm/logo-dark.webp" width={480} height={162} alt="" />
              <img className="brand-logo logo-light" src="/crm/logo-light.webp" width={480} height={162} alt="" />
            </Link>
            <ThemeButton />
            <NotificationBell notifications={notifications} />
          </header>
          <main className="main" id="contenido">
            <header className="topbar">
              <div className="crumb">{crumb ?? active?.label ?? 'Inicio'}</div>
              <GlobalSearch />
              <div className="top-actions">
                <ThemeButton />
                <NotificationBell notifications={notifications} />
                <Link className="profile" href="/configuracion" title="Tu perfil">
                  <Avatar name={member.name} src={member.avatar} />
                  <span><b>{member.name}</b><small>{member.role}</small></span>
                </Link>
              </div>
            </header>
            {children}
          </main>
        </div>
        <div className={`toast${toast ? ' show' : ''}`} role="status" aria-live="polite">{toast}</div>
      </ToastContext.Provider>
    </CrumbContext.Provider>
  )
}

const subscribeSidebar = (cb: () => void) => { const o = new MutationObserver(cb); o.observe(document.documentElement, { attributes: true, attributeFilter: ['data-sidebar'] }); return () => o.disconnect() }

function CollapseButton() {
  const collapsed = useSyncExternalStore(subscribeSidebar, () => document.documentElement.dataset.sidebar === 'collapsed', () => false)
  const toggle = () => {
    const root = document.documentElement
    const next = !collapsed
    if (next) root.dataset.sidebar = 'collapsed'; else delete root.dataset.sidebar
    try { localStorage.setItem('aida-sidebar', next ? 'collapsed' : 'open') } catch {}
  }
  return (
    <button className="collapse-btn" type="button" onClick={toggle} aria-label={collapsed ? 'Mostrar menú' : 'Ocultar menú'} aria-expanded={!collapsed} title={collapsed ? 'Mostrar menú' : 'Ocultar menú'}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m15 18-6-6 6-6" /></svg>
    </button>
  )
}

export function ThemeButton() {
  const toggle = () => {
    const root = document.documentElement
    const next = root.dataset.theme === 'light' ? 'dark' : 'light' // el botón fija un tema explícito (deja de seguir al sistema)
    root.dataset.theme = next
    try { localStorage.setItem('aida-theme', next) } catch {}
  }
  return (
    <button className="theme-btn" type="button" onClick={toggle} aria-label="Cambiar entre modo claro y oscuro" title="Modo claro / oscuro">
      <svg className="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      <svg className="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" /></svg>
    </button>
  )
}

function NotificationBell({ notifications }: { notifications: Notification[] }) {
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)
  const unread = notifications.filter(n => !n.read)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close); document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])
  const markAll = () => startTransition(async () => { await markNotificationsRead(unread.map(n => n.id)) })
  return (
    <div className="bell-wrap" ref={ref}>
      <button className="bell-btn" type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label={unread.length ? `Notificaciones: ${unread.length} sin leer` : 'Notificaciones'} title="Notificaciones">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></svg>
        {unread.length > 0 && <span className="bell-count">{unread.length > 9 ? '9+' : unread.length}</span>}
      </button>
      {open && (
        <div className="popover notif-panel" role="dialog" aria-label="Notificaciones">
          <header><b>Notificaciones</b>{unread.length > 0 && <button className="link-button" onClick={markAll}>Marcar todo como leído</button>}</header>
          {notifications.length === 0 ? <p className="popover-empty">No hay notificaciones todavía. Aquí verás leads nuevos, tareas que vencen y oportunidades ganadas.</p> : (
            <ul>
              {notifications.map(n => (
                <li key={n.id} className={n.read ? '' : 'unread'}>
                  <Link href={n.href ?? '/dashboard'} onClick={() => { setOpen(false); if (!n.read) startTransition(async () => { await markNotificationsRead([n.id]) }) }}>
                    <b>{n.title}</b>{n.body && <small>{n.body}</small>}<time>{n.ago}</time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

const RESULT_GROUPS: { key: keyof SearchResults; label: string; href: (id: string) => string }[] = [
  { key: 'clients', label: 'Clientes', href: id => `/clientes/${id}` },
  { key: 'opportunities', label: 'Oportunidades', href: id => `/pipeline?abrir=${id}` },
  { key: 'projects', label: 'Proyectos', href: id => `/proyectos#p-${id}` },
  { key: 'tasks', label: 'Tareas', href: () => '/tareas?filtro=todas' },
]

function GlobalSearch() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); inputRef.current?.focus() }
      if (e.key === 'Escape') setOpen(false)
    }
    const close = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('keydown', onKey); document.addEventListener('mousedown', close)
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', close) }
  }, [])
  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) return
    const t = setTimeout(async () => { setResults(await searchAction(term)); setOpen(true) }, 180)
    return () => clearTimeout(t)
  }, [q])
  const flat = results ? RESULT_GROUPS.flatMap(g => results[g.key].map(r => ({ ...r, group: g.label, href: g.href(r.id) }))) : []
  const go = (href: string) => { setOpen(false); setQ(''); router.push(href) }
  return (
    <div className="search-wrap" ref={wrapRef}>
      <label className="search">
        <span className="search-symbol" />
        <input ref={inputRef} type="search" value={q} onChange={e => { setQ(e.target.value); if (e.target.value.trim().length < 2) { setResults(null); setOpen(false) } }} onFocus={() => results && setOpen(true)}
          onKeyDown={e => { if (e.key === 'Enter' && flat[0]) go(flat[0].href) }}
          placeholder="Buscar clientes, leads, proyectos…" aria-label="Buscar clientes, leads, proyectos" />
        <kbd>⌘ K</kbd>
      </label>
      {open && results && (
        <div className="popover search-results" role="listbox">
          {flat.length === 0 ? <p className="popover-empty">Sin resultados para “{q}”.</p> : RESULT_GROUPS.map(g => results[g.key].length > 0 && (
            <section key={g.key}>
              <h4>{g.label}</h4>
              {results[g.key].map(r => (
                <button key={r.id} type="button" onClick={() => go(g.href(r.id))}><b>{r.name}</b>{r.detail && <small>{r.detail}</small>}</button>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
