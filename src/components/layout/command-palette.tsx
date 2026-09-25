'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

type SearchResult = { label: string; href: string; kind: string }

type CommandPaletteProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  returnFocusRef?: React.RefObject<HTMLElement | null>
}

export function CommandPalette({ open, onOpenChange, returnFocusRef }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const listboxId = useId()
  const reduceMotion = useReducedMotion()
  const overlayTransition = { duration: 0.12, ease: [0.16, 1, 0.3, 1] as const }
  const dialogTransition = { type: 'spring' as const, stiffness: 520, damping: 38, mass: 0.45 }

  const close = () => {
    onOpenChange(false)
    window.setTimeout(() => returnFocusRef?.current?.focus(), 0)
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        onOpenChange(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onOpenChange])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open || query.trim().length < 2) return

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setStatus('loading')
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        if (!response.ok) throw new Error('Search request failed')
        const data = await response.json() as { results?: SearchResult[] }
        setResults(data.results ?? [])
        setActiveIndex(0)
        setStatus('idle')
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setResults([])
        setStatus('error')
      }
    }, 150)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [open, query])

  const select = (result: SearchResult) => {
    router.push(result.href)
    close()
  }

  return (
    <AnimatePresence initial={false}>
      {open && <motion.div initial={reduceMotion ? false : { opacity: 0 }} animate={reduceMotion ? undefined : { opacity: 1 }} exit={reduceMotion ? undefined : { opacity: 0 }} transition={overlayTransition} className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-3 pt-[12dvh] backdrop-blur-sm sm:p-6 sm:pt-[16dvh]" onMouseDown={close}>
      <motion.section initial={reduceMotion ? false : { opacity: 0, y: -12, scale: 0.985 }} animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }} exit={reduceMotion ? undefined : { opacity: 0, y: -6, scale: 0.99 }} transition={dialogTransition} role="dialog" aria-modal="true" aria-label="Buscar CRM" className="w-full max-w-2xl overflow-hidden rounded-xl border border-white/15 bg-[#151515] shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <label className="sr-only" htmlFor="command-search">Buscar CRM</label>
        <motion.div initial={reduceMotion ? false : { opacity: 0, y: -4 }} animate={reduceMotion ? undefined : { opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -2 }} transition={reduceMotion ? undefined : { ...overlayTransition, delay: 0.025 }}>
        <input
          ref={inputRef}
          id="command-search"
          role="combobox"
          aria-label="Buscar CRM"
          aria-controls={listboxId}
          aria-expanded={results.length > 0}
          aria-activedescendant={results[activeIndex] ? `${listboxId}-${activeIndex}` : undefined}
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value
            setQuery(nextQuery)
            if (nextQuery.trim().length < 2) {
              setResults([])
              setStatus('idle')
              setActiveIndex(0)
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') { event.preventDefault(); close() }
            if (event.key === 'ArrowDown' && results.length > 0) { event.preventDefault(); setActiveIndex((index) => (index + 1) % results.length) }
            if (event.key === 'ArrowUp' && results.length > 0) { event.preventDefault(); setActiveIndex((index) => (index - 1 + results.length) % results.length) }
            if (event.key === 'Enter' && results[activeIndex]) { event.preventDefault(); select(results[activeIndex]) }
          }}
          placeholder="Buscar empresas, contactos, oportunidades…"
          className="w-full border-b border-white/10 bg-transparent px-4 py-4 text-base text-white outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-inset focus:ring-brand-primary sm:px-5"
        />
        </motion.div>
        <motion.div initial={reduceMotion ? false : { opacity: 0, y: 4 }} animate={reduceMotion ? undefined : { opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: 2 }} transition={reduceMotion ? undefined : { ...overlayTransition, delay: 0.05 }} id={listboxId} role="listbox" aria-label="Resultados de búsqueda" className="max-h-[min(50dvh,360px)] overflow-y-auto p-2">
          {status === 'loading' && <p role="status" className="px-3 py-4 text-sm text-zinc-300">Buscando…</p>}
          {status === 'error' && <p role="alert" className="px-3 py-4 text-sm text-red-300">No pudimos completar la búsqueda. Inténtalo de nuevo.</p>}
          {status === 'idle' && query.trim().length < 2 && <p className="px-3 py-4 text-sm text-zinc-400">Escribe al menos 2 caracteres para buscar empresas, contactos u oportunidades.</p>}
          {status === 'idle' && query.trim().length >= 2 && results.length === 0 && <p className="px-3 py-4 text-sm text-zinc-400">No se encontraron resultados.</p>}
          {results.map((result, index) => <button key={`${result.kind}-${result.href}`} id={`${listboxId}-${index}`} role="option" aria-label={`${result.label} ${result.kind}`} aria-selected={index === activeIndex} onMouseEnter={() => setActiveIndex(index)} onClick={() => select(result)} className={`flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm text-zinc-100 ${index === activeIndex ? 'bg-white/12' : 'hover:bg-white/8'}`}><span>{result.label}</span><span className="mono text-xs text-zinc-400">{result.kind}</span></button>)}
        </motion.div>
        <motion.p initial={reduceMotion ? false : { opacity: 0 }} animate={reduceMotion ? undefined : { opacity: 1 }} exit={reduceMotion ? undefined : { opacity: 0 }} transition={reduceMotion ? undefined : { ...overlayTransition, delay: 0.07 }} className="border-t border-white/10 px-4 py-2 text-xs text-zinc-500">↑↓ navegar · Enter abrir · Esc cerrar</motion.p>
      </motion.section>
    </motion.div>}
    </AnimatePresence>
  )
}
