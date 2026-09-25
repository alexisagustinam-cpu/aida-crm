'use client'

import { ActionSubmitButton } from '@/components/ui/action-submit-button'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Activity, Bell, BriefcaseBusiness, Building2, ChevronLeft, ChevronRight, ClipboardCheck,
  CircleDollarSign, ClipboardList, ContactRound, Handshake, LayoutDashboard,
  ListTodo, Menu, ReceiptText, Search, Settings, UsersRound, X,
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Wordmark } from '@/components/brand/wordmark'
import { cn } from '@/lib/utils/cn'
import { logout } from '@/app/actions/auth'
import { CommandPalette } from './command-palette'
import { GLOBAL_SEARCH_OPEN_EVENT, isGlobalSearchOpenEvent, requestGlobalSearch } from './global-search'

const navigation = [
  { label: 'Inicio', items: [{ href: '/dashboard', label: 'Command Center', icon: LayoutDashboard }] },
  { label: 'Ventas', items: [
    { href: '/clients', label: 'Clientes', icon: UsersRound },
    { href: '/sales/pipeline', label: 'Pipeline', icon: Handshake },
    { href: '/sales/leads', label: 'Prospectos', icon: UsersRound },
    { href: '/sales/companies', label: 'Empresas', icon: Building2 },
    { href: '/sales/contacts', label: 'Contactos', icon: ContactRound },
    { href: '/sales/activities', label: 'Actividades', icon: Activity },
    { href: '/sales/diagnostics', label: 'Diagnósticos', icon: ClipboardCheck },
    { href: '/sales/analytics', label: 'Analítica', icon: CircleDollarSign },
  ] },
  { label: 'Trabajo', items: [
    { href: '/work/tasks', label: 'Tareas', icon: ListTodo },
    { href: '/work/projects', label: 'Proyectos', icon: BriefcaseBusiness }, { href: '/work/calendar', label: 'Calendario', icon: Activity },
  ] },
  { label: 'Comercial', items: [{ href: '/commercial/services', label: 'Servicios', icon: BriefcaseBusiness }, { href: '/commercial/proposals', label: 'Propuestas', icon: ClipboardList }, { href: '/commercial/contracts', label: 'Contratos', icon: Handshake }] },
  { label: 'Finanzas', items: [{ href: '/finance/invoices', label: 'Facturas', icon: ReceiptText }, { href: '/finance/mrr', label: 'MRR', icon: CircleDollarSign }, { href: '/finance/revenue', label: 'Ingresos', icon: CircleDollarSign }] },
  { label: 'Operaciones', items: [{ href: '/automations', label: 'Automatizaciones', icon: Activity }] },
]

type AppShellProps = { children: React.ReactNode }

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const reduceMotion = useReducedMotion()
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false)
  const searchTriggerRef = useRef<HTMLButtonElement>(null)
  const searchReturnFocusRef = useRef<HTMLElement | null>(null)
  const openSearch = useCallback((returnFocusTo: HTMLElement | null) => {
    searchReturnFocusRef.current = returnFocusTo
    setSearchOpen(true)
  }, [])

  useEffect(() => {
    const onGlobalSearchOpen = (event: Event) => {
      if (isGlobalSearchOpenEvent(event)) openSearch(event.detail.returnFocusTo)
    }
    window.addEventListener(GLOBAL_SEARCH_OPEN_EVENT, onGlobalSearchOpen)
    return () => window.removeEventListener(GLOBAL_SEARCH_OPEN_EVENT, onGlobalSearchOpen)
  }, [openSearch])

  return (
    <div className="min-h-[100dvh] bg-brand-bg lg:grid" style={{ gridTemplateColumns: collapsed ? '72px minmax(0, 1fr)' : '248px minmax(0, 1fr)' }}>
      <motion.aside
        animate={reduceMotion ? undefined : { width: collapsed ? 72 : 248 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="sticky top-0 z-30 hidden h-[100dvh] overflow-hidden border-r border-brand-border bg-brand-surface-elevated lg:flex lg:flex-col"
      >
        <div className="flex h-[72px] items-center justify-between border-b border-brand-border px-5">
          <Link href="/dashboard" className={cn('min-w-0 text-[22px] leading-none', collapsed && 'sr-only')}><Wordmark /></Link>
          <button type="button" aria-label={collapsed ? 'Expandir navegación' : 'Colapsar navegación'} onClick={() => setCollapsed((value) => !value)} className="grid size-8 shrink-0 place-items-center rounded-full border border-brand-border text-brand-muted transition-colors hover:border-brand-text hover:text-brand-text">
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>
        <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto px-3 py-5">
          {navigation.map((group) => (
            <section key={group.label} className="mb-5">
              {!collapsed && <p className="mono mb-1 px-2 text-[10px] uppercase tracking-[0.16em] text-brand-muted">{group.label}</p>}
              <div className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || pathname.startsWith(`${href}/`)
                  return <Link key={href} href={href} title={collapsed ? label : undefined} className={cn('group flex items-center gap-3 rounded-[8px] px-2.5 py-2.5 text-sm transition-colors', active ? 'bg-brand-text text-brand-bg' : 'text-brand-muted hover:bg-brand-surface hover:text-brand-text')}>
                    <Icon size={16} strokeWidth={1.7} className="shrink-0" />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </Link>
                })}
              </div>
            </section>
          ))}
        </nav>
        <div className="border-t border-brand-border p-3">
          <Link href="/settings" title={collapsed ? 'Configuración' : undefined} className="flex items-center gap-3 rounded-[8px] px-2.5 py-2.5 text-sm text-brand-muted transition-colors hover:bg-brand-surface hover:text-brand-text">
            <Settings size={16} strokeWidth={1.7} />{!collapsed && 'Configuración'}
          </Link>
          <form action={logout}><ActionSubmitButton className="mt-1 w-full rounded-[8px] px-2.5 py-2 text-left text-sm text-brand-muted hover:bg-brand-surface hover:text-brand-text">Cerrar sesión</ActionSubmitButton></form>
        </div>
      </motion.aside>
      <div className="min-w-0"><CommandPalette open={searchOpen} onOpenChange={setSearchOpen} returnFocusRef={searchReturnFocusRef} />
        <header className="sticky top-0 z-20 flex h-[72px] items-center gap-3 border-b border-brand-border bg-brand-bg/95 px-4 backdrop-blur md:px-7">
          <Link href="/dashboard" className="mr-auto text-xl lg:hidden"><Wordmark compact /></Link>
          <button type="button" aria-label={mobileNavigationOpen ? 'Cerrar navegación' : 'Abrir navegación'} aria-expanded={mobileNavigationOpen} onClick={() => setMobileNavigationOpen((value) => !value)} className="grid size-10 place-items-center rounded-full border border-brand-border text-brand-muted lg:hidden"><span className="sr-only">{mobileNavigationOpen ? 'Cerrar' : 'Abrir'} navegación</span>{mobileNavigationOpen ? <X size={18} /> : <Menu size={18} />}</button>
          <button ref={searchTriggerRef} type="button" aria-label="Buscar en el CRM" onClick={(event) => requestGlobalSearch(event.currentTarget)} className="group flex h-10 min-w-10 max-w-lg flex-1 items-center gap-2 rounded-lg border border-[#3b3935] bg-[#242321] px-3 text-left text-sm text-zinc-300 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_8px_18px_rgba(20,19,17,0.08)] transition-[border-color,background-color,box-shadow] hover:border-[#5a5751] hover:bg-[#2a2926] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary sm:gap-3">
            <Search size={15} strokeWidth={1.7} className="text-zinc-400 transition-colors group-hover:text-zinc-100" /><span className="hidden flex-1 truncate sm:inline">Buscar en el CRM</span><kbd className="mono ml-auto hidden border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400 md:inline">⌘ K</kbd>
          </button>
          <Link href="/notifications" aria-label="Notificaciones" className="grid size-10 place-items-center rounded-full border border-brand-border text-brand-muted transition-colors hover:border-brand-text hover:text-brand-text"><Bell size={16} strokeWidth={1.7} /></Link>
          <span className="mono hidden text-xs text-brand-muted sm:inline">AIDA / INTERNO</span>
        </header>
        {mobileNavigationOpen && <div className="fixed inset-x-0 top-[72px] z-40 max-h-[calc(100dvh-72px)] overflow-y-auto border-b border-brand-border bg-brand-surface-elevated p-4 lg:hidden"><nav aria-label="Navegación móvil"><div className="grid gap-1">{navigation.flatMap((group) => group.items).map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileNavigationOpen(false)} className="flex items-center gap-3 rounded-[8px] px-3 py-3 text-sm text-brand-text hover:bg-brand-surface"><Icon size={16} />{label}</Link>)}<Link href="/settings" onClick={() => setMobileNavigationOpen(false)} className="flex items-center gap-3 rounded-[8px] px-3 py-3 text-sm text-brand-text hover:bg-brand-surface"><Settings size={16} />Configuración</Link></div></nav></div>}
        <main>{children}</main>
      </div>
    </div>
  )
}
