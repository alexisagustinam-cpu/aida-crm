import Link from 'next/link'
import { ActionSubmitButton } from '@/components/ui/action-submit-button'
import { LogoWrite } from '@/components/brand/logo-write'
import { GoogleButton } from '@/components/auth/google-button'
import { PasswordField } from '@/components/auth/password-field'

const inputClass = 'mt-1.5 w-full rounded-xl border border-brand-border bg-brand-bg px-4 py-3 text-[15px] outline-none transition-colors focus:border-brand-primary focus:bg-white'

// En signup solo se muestra el formulario con una invitación válida: el correo viene de la invitación.
export function AuthForm({ action, mode, error, message, invite }: { action: (formData: FormData) => void | Promise<void>; mode: 'login' | 'signup'; error?: string; message?: string; invite?: { token: string; email: string; name: string } | null }) {
  const signup = mode === 'signup'
  const closed = signup && !invite
  return <main className="grid min-h-[100dvh] bg-white lg:grid-cols-[min(100dvh,60vw)_1fr]">
    <aside className="auth-brand relative h-[300px] overflow-hidden lg:h-auto">
      {/* Variante 5 del logo (sin el logo) como fondo; el logo animado va encima en su misma posición */}
      <div className="auth-art">
        <LogoWrite className="auth-art-logo" />
      </div>
    </aside>

    <section className="flex items-center justify-center px-6 py-12 sm:px-12">
      <div className="w-full max-w-[380px]">
        <h1 className="text-[32px] font-extrabold leading-tight tracking-[-.04em]">{closed ? 'Necesitas una invitación.' : signup ? `Hola, ${invite!.name}.` : 'Bienvenido de vuelta.'}</h1>
        <p className="mt-2 text-sm text-brand-muted">{closed ? 'El CRM de AIDA es solo para el equipo. Pide a un administrador que te invite; te llegará un enlace para crear tu acceso.' : signup ? 'Crea tu contraseña para entrar al CRM de AIDA.' : 'Ingresa con tu cuenta.'}</p>
        {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-brand-danger">{error}</p>}
        {message && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-brand-success">{message}</p>}
        {!closed && <>
        <div className="mt-8"><GoogleButton /></div>
        {signup && <p className="mt-3 text-xs text-brand-muted">Con Google, usa la cuenta de {invite!.email}.</p>}
        <p className="my-6 flex items-center gap-3 text-xs font-semibold text-brand-muted before:h-px before:flex-1 before:bg-brand-border after:h-px after:flex-1 after:bg-brand-border">o con tu email</p>
        <form action={action} className="space-y-4">
          {signup && <input type="hidden" name="invitacion" value={invite!.token} />}
          <label className="block text-sm font-semibold">Email<input required name="email" type="email" autoComplete="email" className={inputClass} {...(signup ? { value: invite!.email, readOnly: true } : {})} /></label>
          <PasswordField className={inputClass} autoComplete={signup ? 'new-password' : 'current-password'} />
          <ActionSubmitButton pendingLabel={signup ? 'Creando cuenta…' : 'Ingresando…'} className="mt-6! min-h-12 w-full rounded-full text-sm font-extrabold!">{signup ? 'Crear cuenta' : 'Iniciar sesión'} <span aria-hidden>→</span></ActionSubmitButton>
        </form>
        </>}
        <p className="mt-6 text-center text-sm text-brand-muted">{signup ? <>¿Ya tienes acceso? <Link className="font-semibold text-brand-primary underline-offset-4 hover:underline" href="/login">Inicia sesión</Link></> : 'El acceso es solo por invitación del equipo.'}</p>
      </div>
    </section>
  </main>
}
