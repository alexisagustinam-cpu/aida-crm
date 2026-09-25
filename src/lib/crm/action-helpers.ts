import 'server-only'
import { revalidatePath } from 'next/cache'
import { requireMember, type Member } from '@/lib/auth/member'
import { IntegrationError } from './integrations'

export type ActionState = { ok?: boolean; error?: string; message?: string } | null

// ---------- utilidades ----------

export const str = (fd: FormData, k: string) => {
  const v = fd.get(k)
  return typeof v === 'string' && v.trim() ? v.trim() : null
}
export const req = (fd: FormData, k: string, label: string) => {
  const v = str(fd, k)
  if (!v) throw new UserError(`Falta ${label}.`)
  return v
}
// "14,500", "14500.50" o "$ 1.250" → centavos
export async function parseMoney(raw: string | null): Promise<number> {
  if (!raw) return 0
  const clean = raw.replace(/[^\d.,]/g, '')
  const normalized = /,\d{1,2}$/.test(clean) ? clean.replace(/\./g, '').replace(',', '.') : clean.replace(/,/g, '')
  const n = Number(normalized)
  if (!Number.isFinite(n) || n < 0) throw new UserError('El monto no es válido.')
  return Math.round(n * 100)
}
export const bool = (fd: FormData, k: string) => fd.get(k) === 'on' || fd.get(k) === 'true'
export const int = (fd: FormData, k: string, min = 0, max = 100) => Math.min(max, Math.max(min, Math.round(Number(fd.get(k)) || 0)))
// "2025-01-14" + "15:00" en hora de Ecuador → Date
export const localDateTime = (date: string, time: string | null) => new Date(`${date}T${time ?? '09:00'}:00-05:00`)

export class UserError extends Error {}

function refresh() { revalidatePath('/', 'layout') }

// Envuelve cada acción: exige sesión, traduce errores a un mensaje y refresca la vista.
export function action<A extends unknown[]>(fn: (member: Member, ...args: A) => Promise<ActionState | void>) {
  return async (...args: A): Promise<ActionState> => {
    const member = await requireMember()
    try {
      const result = await fn(member, ...args)
      refresh()
      return result ?? { ok: true }
    } catch (error) {
      if (error instanceof UserError || error instanceof IntegrationError) return { error: error.message }
      if (typeof error === 'object' && error && 'digest' in error && String((error as { digest: unknown }).digest).startsWith('NEXT_REDIRECT')) throw error
      console.error('crm/action:', error)
      return { error: 'No se pudo guardar. Intenta de nuevo.' }
    }
  }
}

