import { signup } from '@/app/actions/auth'
import { AuthForm } from '@/components/auth/auth-form'
export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) { return <AuthForm action={signup} mode="signup" {...await searchParams} /> }
