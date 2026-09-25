'use client'

import { useEffect } from 'react'

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return <main className="product-grid grid min-h-[calc(100dvh-72px)] place-items-center p-5 md:p-8">
    <section role="alert" className="max-w-md rounded-xl border border-brand-border bg-brand-surface-elevated p-6">
      <h1 className="text-xl font-semibold">No pudimos cargar esta sección.</h1>
      <p className="mt-2 text-sm text-brand-muted">Tus datos no se modificaron. Intenta de nuevo en unos segundos.</p>
      <button type="button" onClick={reset} className="mt-5 rounded bg-brand-text px-4 py-2 text-sm font-medium text-brand-bg">Reintentar</button>
    </section>
  </main>
}
