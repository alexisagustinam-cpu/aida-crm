'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

// Campo de contraseña con botón de ojo para mostrar u ocultar lo escrito.
export function PasswordField({ className, autoComplete }: { className: string; autoComplete: string }) {
  const [visible, setVisible] = useState(false)
  return (
    <label className="block text-sm font-semibold">Contraseña
      <span className="relative block">
        <input required name="password" type={visible ? 'text' : 'password'} minLength={8} autoComplete={autoComplete} className={`${className} pr-12`} />
        <button type="button" onClick={() => setVisible(v => !v)} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible} className="absolute right-1.5 top-1/2 mt-[3px] grid size-10 -translate-y-1/2 place-items-center rounded-lg text-brand-muted transition-colors hover:text-brand-text">
          {visible ? <EyeOff aria-hidden className="size-[18px]" /> : <Eye aria-hidden className="size-[18px]" />}
        </button>
      </span>
    </label>
  )
}
