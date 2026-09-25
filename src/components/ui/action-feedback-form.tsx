'use client'

import { useActionState, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import type { ActionResult } from '@/lib/actions/safe-action'

type ServerAction = (formData: FormData) => ActionResult | Promise<ActionResult>
type MutationState = { kind: 'idle' | 'success' | 'error'; message?: string }

type ActionFeedbackFormProps = Omit<ComponentPropsWithoutRef<'form'>, 'action'> & {
  action: ServerAction
  successMessage: string
  children: ReactNode
}

const initialState: MutationState = { kind: 'idle' }

function messageFrom(error: unknown) {
  return error instanceof Error && error.message ? error.message : 'No se pudo guardar el cambio. No se aplicó ningún cambio.'
}

export function ActionFeedbackForm({ action, children, successMessage, ...props }: ActionFeedbackFormProps) {
  const [state, formAction] = useActionState(async (_previous: MutationState, formData: FormData): Promise<MutationState> => {
    try {
      const result = await action(formData)
      if (result && typeof result === 'object' && 'error' in result && result.error) {
        return { kind: 'error', message: result.error }
      }
      return { kind: 'success', message: successMessage }
    } catch (error) {
      // Red de seguridad para acciones que todavía no pasan por safeAction:
      // en producción Next.js ya habrá borrado el mensaje real de estas.
      const digest = typeof error === 'object' && error && 'digest' in error ? String(error.digest) : ''
      if (digest.startsWith('NEXT_REDIRECT')) throw error
      return { kind: 'error', message: messageFrom(error) }
    }
  }, initialState)

  return <form {...props} action={formAction}>
    {children}
    {state.kind === 'success' && <p role="status" aria-live="polite" className="mt-3 text-sm font-medium text-brand-success">{state.message}</p>}
    {state.kind === 'error' && <p role="alert" className="mt-3 text-sm font-medium text-brand-danger">{state.message}</p>}
  </form>
}
