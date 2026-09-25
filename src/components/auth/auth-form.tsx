import Link from 'next/link'
import { ActionSubmitButton } from '@/components/ui/action-submit-button'
import { LogoWrite } from '@/components/brand/logo-write'

const inputClass = 'mt-1.5 w-full rounded-xl border border-brand-border bg-brand-bg px-4 py-3 text-[15px] outline-none transition-colors focus:border-brand-primary focus:bg-white'

export function AuthForm({ action, mode, error, message }: { action: (formData: FormData) => void | Promise<void>; mode: 'login' | 'signup'; error?: string; message?: string }) {
  const signup = mode === 'signup'
  return <main className="grid min-h-[100dvh] bg-white lg:grid-cols-2">
    <aside className="relative isolate flex items-center justify-center overflow-hidden bg-[#edf8ff] px-8 py-14 lg:py-0">
      <div aria-hidden className="absolute -left-24 -top-24 -z-10 size-80 rounded-full bg-brand-primary/15 blur-3xl" />
      <div aria-hidden className="absolute -bottom-28 -right-16 -z-10 size-96 rounded-full bg-brand-accent/20 blur-3xl" />
      <div aria-hidden className="absolute bottom-1/4 left-1/5 -z-10 size-40 rounded-full bg-brand-orange/12 blur-3xl" />
      <LogoWrite className="w-[min(62vw,240px)] lg:w-[min(72%,460px)]" />
    </aside>

    <section className="flex items-center justify-center px-6 py-12 sm:px-12">
      <div className="w-full max-w-[380px]">
        <h1 className="text-[32px] font-extrabold leading-tight tracking-[-.04em]">{signup ? 'Crea tu acceso.' : 'Bienvenido de vuelta.'}</h1>
        <p className="mt-2 text-sm text-brand-muted">{signup ? 'Cuenta para el equipo AIDA.' : 'Ingresa con tu cuenta.'}</p>
        {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-brand-danger">{error}</p>}
        {message && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-brand-success">{message}</p>}
        <form action={action} className="mt-8 space-y-4">
          <label className="block text-sm font-semibold">Email<input required name="email" type="email" autoComplete="email" className={inputClass} /></label>
          <label className="block text-sm font-semibold">Contraseña<input required name="password" type="password" minLength={8} autoComplete={signup ? 'new-password' : 'current-password'} className={inputClass} /></label>
          <ActionSubmitButton pendingLabel={signup ? 'Creando cuenta…' : 'Ingresando…'} className="mt-6! min-h-12 w-full rounded-full text-sm font-extrabold!">{signup ? 'Crear cuenta' : 'Iniciar sesión'} <span aria-hidden>→</span></ActionSubmitButton>
        </form>
        <p className="mt-6 text-center text-sm text-brand-muted">{signup ? '¿Ya tienes acceso?' : '¿Aún no tienes cuenta?'} <Link className="font-semibold text-brand-primary underline-offset-4 hover:underline" href={signup ? '/login' : '/signup'}>{signup ? 'Inicia sesión' : 'Crear cuenta'}</Link></p>
      </div>
    </section>
  </main>
}
