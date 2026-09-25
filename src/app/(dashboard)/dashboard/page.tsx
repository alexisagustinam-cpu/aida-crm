import { auth } from '@/lib/auth/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// Panel provisional del checkpoint 1: confirma que el login con Neon Auth
// funciona de punta a punta. Los módulos reales (leads, pipeline, clientes,
// finanzas…) se reincorporan uno a uno sobre Drizzle en el checkpoint 2 —
// hoy viven, sin usarse, en _pending-drizzle-port/.
export default async function DashboardPage() {
  const { data: session } = await auth.getSession()
  if (!session?.user) redirect('/login')
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold tracking-[-.03em]">Hola, {session.user.name ?? session.user.email}.</h1>
      <p className="mt-2 text-sm text-brand-muted">
        El login con Neon Auth ya funciona. Los módulos del CRM (leads, pipeline, clientes…) se están migrando y vuelven a aparecer aquí en los próximos avances.
      </p>
    </div>
  )
}
