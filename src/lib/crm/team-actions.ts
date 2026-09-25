'use server'

import { action, req, str, UserError, type ActionState } from './action-helpers'
import { cancelInvite, inviteMember, renewInvite, setActive, setRole } from './team'
import type { Member } from '@/lib/auth/member'

// Todo lo del equipo (invitar, permisos, desactivar) es solo para administradores.
const adminOnly = (member: Member) => { if (member.role !== 'Administrador') throw new UserError('Solo un administrador puede cambiar el equipo.') }
const linkMessage = (link: string, mailed: boolean) => `${mailed ? 'Invitación enviada por correo. ' : ''}${link}`

export const inviteAction = action(async (member, fd: FormData): Promise<ActionState> => {
  adminOnly(member)
  const { link, mailed } = await inviteMember({ email: req(fd, 'email', 'el correo'), name: str(fd, 'name'), role: str(fd, 'role') ?? 'Equipo' }, member.name)
  return { ok: true, message: linkMessage(link, mailed) }
})

export const renewInviteAction = action(async (member, id: string): Promise<ActionState> => {
  adminOnly(member)
  const { link, mailed } = await renewInvite(id, member.name)
  return { ok: true, message: linkMessage(link, mailed) }
})

export const cancelInviteAction = action(async (member, id: string) => {
  adminOnly(member)
  await cancelInvite(id)
})

export const setRoleAction = action(async (member, id: string, role: string) => {
  adminOnly(member)
  await setRole(id, role, member.id)
})

export const setActiveAction = action(async (member, id: string, active: boolean) => {
  adminOnly(member)
  await setActive(id, active, member.id)
})
