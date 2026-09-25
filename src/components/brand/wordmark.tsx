type WordmarkProps = {
  compact?: boolean
}

export function Wordmark({ compact = false }: WordmarkProps) {
  return (
    <span className="font-semibold tracking-[-0.055em] text-brand-text" aria-label="AutomAI Labs">
      automai<span className="wordmark-labs">labs</span>
      {!compact && <sup className="mono ml-0.5 text-[0.42em] tracking-normal">®</sup>}
    </span>
  )
}
