import { requireMember } from '@/lib/auth/member'
import { getTeam } from '@/lib/crm/team'
import { Team } from '@/components/crm/team'

const iso = (d: Date | null) => d?.toISOString() ?? null

export default async function TeamPage() {
  const [member, rows] = await Promise.all([requireMember(), getTeam()])
  const isAdmin = member.role === 'Administrador'
  const now = new Date()
  return (
    <article className="panel settings-section">
      <h2>Equipo y acceso</h2>
      <p>Solo entran al CRM las personas de esta lista. {isAdmin
        ? 'Invita a alguien con su correo: recibe un enlace para crear su contraseña, o entra con Google si su correo es de Google. Quien entre sin invitación queda bloqueado y te llega un aviso en la campana.'
        : 'Para sumar a alguien, pídele a un administrador que lo invite.'}</p>
      <Team rows={rows.map(({ inviteAcceptedAt, ...r }) => ({ ...r, inviteExpiresAt: iso(r.inviteExpiresAt), lastSeenAt: iso(r.lastSeenAt), inviteExpired: !inviteAcceptedAt && (!r.inviteExpiresAt || r.inviteExpiresAt < now) }))} meId={member.id} isAdmin={isAdmin} />
    </article>
  )
}
