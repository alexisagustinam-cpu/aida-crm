import { ActionSubmitButton } from '@/components/ui/action-submit-button'
import { ActionFeedbackForm } from '@/components/ui/action-feedback-form'
import { markNotificationRead } from '@/app/actions/operations'
import { getOrganizationContext } from '@/lib/supabase/context'
import Link from 'next/link'

type Notification = {
  id: string
  title: string
  body: string | null
  read_at: string | null
}

function NotificationList({ notifications }: { notifications: Notification[] }) {
  return <div className="mt-8 space-y-3">
    {notifications.map((notification) => <article key={notification.id} className="rounded-xl border border-brand-border p-4">
      <b>{notification.title}</b>
      <p className="mt-1 text-brand-muted">{notification.body}</p>
      {!notification.read_at && <ActionFeedbackForm action={markNotificationRead} successMessage="Notificación marcada como leída" className="mt-3">
        <input type="hidden" name="id" value={notification.id} />
        <ActionSubmitButton className="text-sm">Marcar como leída</ActionSubmitButton>
      </ActionFeedbackForm>}
    </article>)}
  </div>
}

export default async function NotificationsPage() {
  const { supabase, user, organizationId } = await getOrganizationContext()
  const { data } = organizationId
    ? await supabase.from('notifications').select('id,title,body,kind,read_at,created_at').eq('organization_id', organizationId).eq('recipient_id', user.id).order('created_at', { ascending: false })
    : { data: [] }
  const notifications = (data ?? []) as unknown as Notification[]

  return <div className="px-6 py-10 md:px-8">
    <p className="mono text-xs uppercase text-brand-primary">Operaciones</p>
    <h1 className="mt-2 text-3xl font-bold">Notificaciones</h1>
    {notifications.length ? <NotificationList notifications={notifications} /> : <div className="mt-8 border border-dashed border-brand-border bg-brand-surface-elevated p-8 text-center"><p className="font-medium">No hay notificaciones todavía.</p><p className="mt-2 text-sm text-brand-muted">Este espacio se completa con alertas generadas por el sistema, como seguimientos vencidos, facturas pendientes y tareas.</p><Link href="/dashboard" className="mt-4 inline-block text-sm text-brand-primary underline underline-offset-4">Ver elementos pendientes en Command Center</Link></div>}
  </div>
}
