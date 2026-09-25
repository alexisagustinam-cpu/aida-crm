export default function DashboardLoading() {
  return <main aria-label="Cargando página" className="product-grid min-h-[calc(100dvh-72px)] p-5 md:p-8">
    <div className="h-3 w-32 animate-pulse rounded bg-brand-border" />
    <div className="mt-3 h-9 w-72 max-w-full animate-pulse rounded bg-brand-border" />
    <div className="mt-8 grid gap-5 lg:grid-cols-3">
      {[0, 1, 2].map((item) => <div key={item} className="h-44 animate-pulse rounded-xl border border-brand-border bg-brand-surface-elevated" />)}
    </div>
  </main>
}
