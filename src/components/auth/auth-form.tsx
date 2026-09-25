import Image from 'next/image'
import Link from 'next/link'
import { ActionSubmitButton } from '@/components/ui/action-submit-button'
import { Wordmark } from '@/components/brand/wordmark'

const highlights = ['Leads de la web y del calendario en un solo lugar', 'Seguimiento de cada cliente y proyecto', 'Acceso solo para el equipo AIDA']

const inputClass = 'mt-1.5 w-full rounded-xl border border-brand-border bg-brand-bg px-4 py-3 text-[15px] outline-none transition-colors focus:border-brand-primary focus:bg-white'

export function AuthForm({ action, mode, error, message }: { action: (formData: FormData) => void | Promise<void>; mode: 'login' | 'signup'; error?: string; message?: string }) {
  const signup = mode === 'signup'
  return <main className="grid min-h-[100dvh] bg-brand-bg lg:grid-cols-[1.05fr_1fr]">
    <aside className="relative isolate hidden overflow-hidden bg-brand-navy p-12 text-white lg:flex lg:flex-col lg:justify-end">
      <Image src="/brand/hero-1672.webp" alt="" fill priority sizes="50vw" className="-z-20 object-cover" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-brand-navy via-brand-navy/80 to-brand-navy/30" />
      <p className="text-xs font-bold uppercase tracking-[.18em] text-white/70">AIDA Digital Solutions</p>
      <h2 className="mt-4 max-w-md text-[44px] font-extrabold leading-[1.08] tracking-[-.04em]">El centro de operaciones de <em className="not-italic text-brand-orange">AIDA</em>.</h2>
      <ul className="mt-8 space-y-3 text-[15px] text-white/85">
        {highlights.map((item) => <li key={item} className="flex items-center gap-3"><span aria-hidden className="size-2 shrink-0 rounded-full bg-brand-accent" />{item}</li>)}
      </ul>
    </aside>

    <section className="product-grid grid place-items-center p-5 sm:p-10">
      <div className="w-full max-w-[420px] rounded-3xl border border-brand-border bg-white p-7 shadow-[0_24px_60px_-30px_rgb(6_29_57/35%)] sm:p-9">
        <Wordmark />
        <h1 className="mt-8 text-[30px] font-extrabold leading-tight tracking-[-.04em]">{signup ? 'Crea tu acceso.' : 'Bienvenido de vuelta.'}</h1>
        <p className="mt-2 text-sm text-brand-muted">{signup ? 'Crea tu cuenta del equipo AIDA.' : 'Ingresa al CRM de AIDA.'}</p>
        {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-brand-danger">{error}</p>}
        {message && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-brand-success">{message}</p>}
        <form action={action} className="mt-7 space-y-4">
          <label className="block text-sm font-semibold">Email<input required name="email" type="email" autoComplete="email" className={inputClass} /></label>
          <label className="block text-sm font-semibold">Contraseña<input required name="password" type="password" minLength={8} autoComplete={signup ? 'new-password' : 'current-password'} className={inputClass} /></label>
          <ActionSubmitButton pendingLabel={signup ? 'Creando cuenta…' : 'Ingresando…'} className="mt-6! min-h-12 w-full rounded-full text-sm font-extrabold!">{signup ? 'Crear cuenta' : 'Iniciar sesión'} <span aria-hidden>→</span></ActionSubmitButton>
        </form>
        <p className="mt-6 text-center text-sm text-brand-muted">{signup ? '¿Ya tienes acceso?' : '¿Aún no tienes cuenta?'} <Link className="font-semibold text-brand-primary underline-offset-4 hover:underline" href={signup ? '/login' : '/signup'}>{signup ? 'Inicia sesión' : 'Crear cuenta'}</Link></p>
      </div>
    </section>
  </main>
}
