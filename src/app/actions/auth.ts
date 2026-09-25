'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { auth } from '@/lib/auth/server'

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

export async function signup(formData: FormData) {
  const parsed = values(formData)
  if (!parsed.success) redirect('/signup?error=Usa+un+email+y+contraseña+de+8+caracteres')
  // El formulario solo pide email y contraseña; Neon Auth exige además un
  // nombre. Se usa la parte local del correo como nombre provisional — se
  // podrá editar más adelante desde Configuración del equipo.
  const name = parsed.data.email.split('@')[0]
  const { error } = await auth.signUp.email({ ...parsed.data, name })
  if (error) {
    console.error('auth/signup:', error.code ?? '', error.message)
    redirect('/signup?error=No+se+pudo+crear+la+cuenta')
  }
  redirect('/login?message=Cuenta+creada.+Ya+puedes+iniciar+sesión')
}
