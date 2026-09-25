import { redirect } from 'next/navigation'
import { getAccess, type Denied } from '@/lib/auth/member'
import { LogoWrite } from '@/components/brand/logo-write'

export const dynamic = 'force-dynamic'

const REASONS: Record<Denied, { title: string; text: string }> = {
  'sin-invitacion': { title: 'Esta cuenta no tiene acceso.', text: 'El CRM de AIDA es solo para el equipo. Si eres parte del equipo, pide a un administrador que te invite con este correo.' },
  'desactivado': { title: 'Tu acceso está desactivado.', text: 'Un administrador desactivó esta cuenta. Si crees que es un error, habla con él.' },
  'sin-verificar': { title: 'Falta confirmar tu correo.', text: 'Para entrar con correo y contraseña tienes que crear la cuenta con el enlace de invitación que te enviaron. Si tu correo es de Google, entra con “Continuar con Google”.' },
  'invitacion-vencida': { title: 'Tu invitación venció.', text: 'Pide a un administrador un enlace nuevo desde Configuración → Equipo.' },
}

export default async function NoAccessPage() {
  const access = await getAccess()
  if (!access) redirect('/login')
  if ('member' in access) redirect('/dashboard')
  const reason = REASONS[access.denied]
  return <main className="grid min-h-[100dvh] bg-white lg:grid-cols-[min(100dvh,60vw)_1fr]">
    <aside className="auth-brand relative h-[300px] overflow-hidden lg:h-auto">
      <div className="auth-art"><LogoWrite className="auth-art-logo" /></div>
    </aside>
    <section className="flex items-center justify-center px-6 py-12 sm:px-12">
      <div className="w-full max-w-[380px]">
        <h1 className="text-[32px] font-extrabold leading-tight tracking-[-.04em]">{reason.title}</h1>
        <p className="mt-3 text-sm text-brand-muted">{reason.text}</p>
        <p className="mt-6 rounded-xl border border-brand-border bg-brand-bg p-3 text-sm">Entraste como <b>{access.email}</b></p>
        <form action="/logout" method="post" className="mt-6">
          <button className="min-h-12 w-full rounded-full bg-brand-primary text-sm font-extrabold text-white">Usar otra cuenta <span aria-hidden>→</span></button>
        </form>
      </div>
    </section>
  </main>
}
