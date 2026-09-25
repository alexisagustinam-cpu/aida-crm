'use client'

import { Search } from 'lucide-react'
import { requestGlobalSearch } from '@/components/layout/global-search'

export function GlobalSearchAction() {
  return <button
    type="button"
    aria-label="Buscar en el CRM"
    onClick={(event) => requestGlobalSearch(event.currentTarget)}
    className="mt-6 flex w-full items-center gap-3 border border-brand-bg/30 bg-brand-bg/8 px-4 py-3 text-left text-sm text-brand-bg transition-colors hover:border-brand-accent hover:bg-brand-bg/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
  >
    <span className="grid size-8 place-items-center border border-brand-bg/20"><Search size={16} strokeWidth={1.7} /></span>
    <span className="flex-1 font-medium">Buscar en el CRM</span>
    <kbd className="mono border border-brand-bg/25 px-1.5 py-0.5 text-[10px]">⌘ K</kbd>
  </button>
}
