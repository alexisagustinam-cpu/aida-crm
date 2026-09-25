'use client'

import { useFormStatus } from 'react-dom'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ActionSubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger'
  pendingLabel?: ReactNode
}

const variants = {
  primary: 'bg-brand-text text-brand-bg hover:bg-brand-primary',
  secondary: 'border border-brand-border bg-brand-surface-elevated text-brand-text hover:border-brand-text',
  danger: 'bg-red-700 text-white hover:bg-red-800',
}

export function ActionSubmitButton({
  children,
  className = '',
  disabled,
  pendingLabel = 'Guardando…',
  type = 'submit',
  variant = 'primary',
  ...props
}: ActionSubmitButtonProps) {
  const { pending } = useFormStatus()
  const label = pending ? pendingLabel : children

  return <>
    <button
      {...props}
      type={type}
      disabled={disabled || pending}
      aria-disabled={disabled || pending}
      className={`inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
    >
      {label}
    </button>
    {pending && <span role="status" aria-live="polite" className="sr-only">{pendingLabel}</span>}
  </>
}
