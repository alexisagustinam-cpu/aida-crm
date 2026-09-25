import { requireMember } from '@/lib/auth/member'
import { getMembers } from '@/lib/crm/queries'
import { formatLongDate } from '@/lib/crm/format'
import { Avatar } from '@/components/crm/ui'

export default async function TeamPage() {
  const [member, members] = await Promise.all([requireMember(), getMembers()])
  return (
    <article className="panel settings-section">
      <h2>Equipo</h2><p>Personas que ya entraron al CRM. Para sumar a alguien, compártele el enlace del CRM y que cree su cuenta (o entre con Google). Sus correos reciben los avisos por correo.</p>
      <div className="list-rows">
        {members.map(m => (
          <div key={m.id} className="list-row"><Avatar name={m.name} src={m.avatar} /><span><b>{m.name}{m.id === member.id ? ' (tú)' : ''}</b><small>{m.email} · desde {formatLongDate(m.createdAt)}</small></span><span className="pill" style={{ marginLeft: 'auto' }}>{m.role}</span></div>
        ))}
      </div>
    </article>
  )
}
