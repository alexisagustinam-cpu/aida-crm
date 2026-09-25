import { signup } from '@/app/actions/auth'
import { AuthForm } from '@/components/auth/auth-form'
import { findInvite } from '@/lib/crm/team'

export const dynamic = 'force-dynamic'

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string; invitacion?: string }> }) {
  const { error, invitacion } = await searchParams
  const invite = await findInvite(invitacion)
  return <AuthForm action={signup} mode="signup" error={invitacion && !invite ? 'Este enlace de invitación no es válido o ya venció. Pide uno nuevo.' : error} invite={invite && invitacion ? { token: invitacion, email: invite.email, name: invite.name } : null} />
}
