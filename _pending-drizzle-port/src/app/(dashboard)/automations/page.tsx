import { getOrganizationContext } from '@/lib/supabase/context'
import { AutomationCenter } from '@/components/operations/automation-center'

type Automation = {
  id: string
  name: string
  event_type: string
  webhook_url: string
  status: string
  last_error: string | null
}

export default async function AutomationsPage() {
  const { supabase, organizationId } = await getOrganizationContext()
  const { data } = organizationId
    ? await supabase.from('automations').select('id,name,event_type,webhook_url,status,last_error,created_at').eq('organization_id', organizationId).order('created_at', { ascending: false })
    : { data: [] }
  const automations = (data ?? []) as unknown as Automation[]

  return <main className="product-grid min-h-[calc(100dvh-72px)] px-5 py-8 md:px-8">
    <p className="mono text-xs uppercase text-brand-primary">Operaciones / automatizaciones</p>
    <h1 className="mt-2 text-3xl font-bold">Automation Center</h1>
    <p className="mt-2 max-w-2xl text-brand-muted">Define destinos externos con claridad: hoy no hay un motor de entrega conectado, por lo que ningún webhook envía eventos.</p>
    <AutomationCenter automations={automations} />
  </main>
}
