import Image from 'next/image'

type WordmarkProps = {
  compact?: boolean
}

export function Wordmark({ compact = false }: WordmarkProps) {
  return (
    <span className="inline-flex items-center gap-2 align-middle">
      <Image src="/brand/aida-logo.webp" alt="AIDA Digital Solutions" width={400} height={167} priority className={compact ? 'h-7 w-auto' : 'h-9 w-auto'} />
      {!compact && <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.14em] text-brand-primary">CRM</span>}
    </span>
  )
}
