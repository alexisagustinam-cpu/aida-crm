'use client'

import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return <html lang="es"><body className="bg-zinc-950 text-zinc-100"><main className="grid min-h-screen place-items-center p-6"><section role="alert" className="max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-6"><h1 className="text-xl font-semibold">Algo salió mal.</h1><p className="mt-2 text-sm text-zinc-300">No pudimos completar la solicitud. Inténtalo nuevamente.</p><button type="button" onClick={reset} className="mt-5 rounded bg-white px-4 py-2 text-sm font-medium text-zinc-950">Reintentar</button></section></main></body></html>
}
