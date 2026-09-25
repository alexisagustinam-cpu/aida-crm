import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AppShell } from './app-shell'

vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard', useRouter: () => ({ push: vi.fn() }) }))
vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    aside: ({ children, ...props }: React.ComponentProps<'aside'>) => <aside {...props}>{children}</aside>,
    div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
    section: ({ children, ...props }: React.ComponentProps<'section'>) => <section {...props}>{children}</section>,
  },
  useReducedMotion: () => true,
}))

describe('AppShell', () => {
  it('opens an accessible mobile navigation with the required module links', async () => {
    const user = userEvent.setup()
    render(<AppShell><p>Contenido</p></AppShell>)

    await user.click(screen.getByRole('button', { name: /abrir navegación/i }))

    expect(screen.getByRole('navigation', { name: /navegación móvil/i })).toBeVisible()
    const mobileNavigation = screen.getByRole('navigation', { name: /navegación móvil/i })
    expect(within(mobileNavigation).getByRole('link', { name: 'Configuración' })).toHaveAttribute('href', '/settings')
    expect(within(mobileNavigation).getByRole('link', { name: 'Contratos' })).toHaveAttribute('href', '/commercial/contracts')
    expect(within(mobileNavigation).getByRole('link', { name: 'Propuestas' })).toHaveAttribute('href', '/commercial/proposals')
    expect(within(mobileNavigation).getByRole('link', { name: 'Servicios' })).toHaveAttribute('href', '/commercial/services')
    expect(within(mobileNavigation).getByRole('link', { name: 'Tareas' })).toHaveAttribute('href', '/work/tasks')
  })
})
