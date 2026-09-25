'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { auth } from '@/lib/auth/server'
import { acceptInvite, findInvite } from '@/lib/crm/team'

const credentials = z.object({ email: z.string().trim().email(), password: z.string().min(8).max(128) })
function values(formData: FormData) { return credentials.safeParse({ email: formData.get('email'), password: formData.get('password') }) }

export async function login(formData: FormData) {
  const parsed = values(formData)
  if (!parsed.success) redirect('/login?error=Credenciales+inválidas')
  const { error } = await auth.signIn.email(parsed.data)
  if (error) {
    // El detalle va al log del servidor (Vercel → Logs), no a la pantalla.
    console.error('auth/login:', error.code ?? '', error.message)
    redirect('/login?error=No+se+pudo+iniciar+sesión')
  }
  redirect('/dashboard')
}

// Solo con una invitación vigente: el correo sale de la invitación, no de lo que se escriba.
// Neon Auth no permite dos cuentas con el mismo correo, así que la cuenta creada aquí es la
// única que puede tomar la invitación (ver getAccess en lib/auth/member.ts).
export async function signup(formData: FormData) {
  const token = String(formData.get('invitacion') ?? '')
  const invite = await findInvite(token)
  if (!invite) redirect('/signup?error=Necesitas+un+enlace+de+invitación+vigente')
  const back = `/signup?invitacion=${encodeURIComponent(token)}`
  const password = z.string().min(8).max(128).safeParse(formData.get('password'))
  if (!password.success) redirect(`${back}&error=La+contraseña+debe+tener+al+menos+8+caracteres`)
  const { error } = await auth.signUp.email({ email: invite.email, password: password.data, name: invite.name })
  if (error) {
    console.error('auth/signup:', error.code ?? '', error.message)
    if (!/exist/i.test(`${error.code ?? ''} ${error.message ?? ''}`)) redirect(`${back}&error=No+se+pudo+crear+la+cuenta.+Intenta+de+nuevo`)
    // Ya existía una cuenta con este correo (creada antes de las invitaciones): si la contraseña
    // es la de esa cuenta, es suya y puede tomar la invitación.
    const existing = await auth.signIn.email({ email: invite.email, password: password.data })
    if (existing.error) redirect(`${back}&error=Ya+existe+una+cuenta+con+este+correo.+Escribe+su+contraseña+o+entra+con+Google`)
    await acceptInvite(invite.id)
    redirect('/dashboard')
  }
  await acceptInvite(invite.id)
  redirect('/login?message=Cuenta+creada.+Ya+puedes+iniciar+sesión')
}
