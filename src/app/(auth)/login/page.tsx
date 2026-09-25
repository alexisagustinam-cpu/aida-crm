import { login } from '@/app/actions/auth'
import { AuthForm } from '@/components/auth/auth-form'
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) { const params = await searchParams; return <AuthForm action={login} mode="login" {...params} /> }
