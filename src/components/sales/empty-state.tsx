import type { ReactNode } from 'react'
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) { return <div className="border border-dashed border-brand-border bg-brand-surface-elevated p-8 text-center"><p className="font-medium">{title}</p>{children && <div className="mt-5">{children}</div>}</div> }
