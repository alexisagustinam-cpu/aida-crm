import type { Metadata } from 'next'
import { requireMember } from '@/lib/auth/member'
import { runDailyChecks } from '@/lib/crm/automations'
import { getNotifications } from '@/lib/crm/queries'
import { formatAgo } from '@/lib/crm/format'
import { CrmShell } from '@/components/crm/shell'
import './mockup.css'
import './theme-light.css'
import './ui.css'
import './app.css'

export const metadata: Metadata = { title: 'AIDA · CRM' }
export const dynamic = 'force-dynamic'

// Aplica el tema y el menú plegado guardados antes de pintar, para que no parpadee.
const bootScript = `try{var t=localStorage.getItem('aida-theme');if(t==='system')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;if(localStorage.getItem('aida-sidebar')==='collapsed')document.documentElement.dataset.sidebar='collapsed'}catch(e){}`

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const member = await requireMember()
  await runDailyChecks()
  const notifications = (await getNotifications(member.id)).map(n => ({ ...n, createdAt: n.createdAt.toISOString(), ago: formatAgo(n.createdAt) }))
  return <>
    <script dangerouslySetInnerHTML={{ __html: bootScript }} />
    <CrmShell member={{ name: member.name, role: member.role, avatar: member.avatar }} notifications={notifications}>{children}</CrmShell>
  </>
}
