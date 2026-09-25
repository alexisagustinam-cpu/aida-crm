// Logo de AIDA que se "escribe": cada letra vive en su propia capa (public/brand/logo-*.webp)
// y la destapa una pluma que sigue su línea central con su mismo grosor, en orden de escritura.
// Al final entra el logo completo para asentar los bordes. Coordenadas del PNG original (600×250).
type Stroke = { d: string; width: number; delay: number; duration: number; ease?: string }

const letters: { layer: string; strokes: Stroke[] }[] = [
  { layer: 'a1', strokes: [
    // La "a" cursiva es un solo trazo: colita, arco, cruce, hojita y brazo
    { d: 'M32 172 C30.8 168.3 26.3 157.3 25 150 C23.7 142.7 23.3 135.7 24 128 C24.7 120.3 26.2 111.3 29 104 C31.8 96.7 35.8 90.2 41 84 C46.2 77.8 52.7 71.8 60 67 C67.3 62.2 76.7 57.8 85 55 C93.3 52.2 102 50.3 110 50 C118 49.7 126.8 51.2 133 53 C139.2 54.8 143.5 57.2 147 61 C150.5 64.8 151.7 71.5 154 76 C156.3 80.5 158.8 84 161 88 C163.2 92 165.8 95.2 167 100 C168.2 104.8 168.7 110.8 168 117 C167.3 123.2 165.5 130.8 163 137 C160.5 143.2 157.2 149.2 153 154 C148.8 158.8 143.7 163 138 166 C132.3 169 124.8 171.5 119 172 C113.2 172.5 106.8 171.8 103 169 C99.2 166.2 96.8 160.3 96 155 C95.2 149.7 96.2 142.8 98 137 C99.8 131.2 103 125.2 107 120 C111 114.8 116.2 109.7 122 106 C127.8 102.3 135.5 101 142 98 C148.5 95 156 91 161 88 C166 85 167.7 81.7 172 80 C176.3 78.3 181.8 79.3 187 78 C192.2 76.7 200.3 73 203 72', width: 46, delay: 0.2, duration: 1.5, ease: 'cubic-bezier(.35, 0, .5, 1)' },
  ] },
  { layer: 'i', strokes: [
    { d: 'M251 86 L251 170', width: 52, delay: 1.8, duration: 0.25 },
    { d: 'M251 30 L251 32', width: 52, delay: 2.12, duration: 0.1 },
  ] },
  { layer: 'd', strokes: [
    { d: 'M398.4 94.6 A53 53 0 0 0 311.6 155.4 A53 53 0 0 0 398.4 94.6', width: 46, delay: 2.3, duration: 0.45 },
    { d: 'M408 25 L408 150', width: 50, delay: 2.75, duration: 0.22 },
  ] },
  { layer: 'a2', strokes: [
    { d: 'M551.8 92.4 A53 53 0 0 0 468.2 157.6 A53 53 0 0 0 551.8 92.4', width: 46, delay: 3.05, duration: 0.45 },
    { d: 'M574 75 L574 173', width: 50, delay: 3.5, duration: 0.22 },
  ] },
]

export function LogoWrite({ id = 'aida-write', className = '' }: { id?: string; className?: string }) {
  return (
    <svg viewBox="0 0 600 250" role="img" aria-label="AIDA Digital Solutions" className={`logo-write ${className}`}>
      <defs>
        {letters.map(({ layer, strokes }) => (
          <mask key={layer} id={`${id}-m-${layer}`} maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="250">
            {strokes.map(({ d, width, delay, duration, ease }) => (
              <path key={d} d={d} pathLength={1} strokeWidth={width} className="lw-stroke" style={{ animationDelay: `${delay}s`, animationDuration: `${duration}s`, animationTimingFunction: ease }} />
            ))}
          </mask>
        ))}
        <mask id={`${id}-m-tag`} maskUnits="userSpaceOnUse" x="0" y="205" width="600" height="45">
          <rect x="0" y="205" width="600" height="45" fill="#fff" className="lw-tagline" />
        </mask>
      </defs>
      {letters.map(({ layer }) => <image key={layer} href={`/brand/logo-${layer}.webp`} width="600" height="250" mask={`url(#${id}-m-${layer})`} />)}
      <g className="lw-fill">
        {letters.map(({ layer }) => <image key={layer} href={`/brand/logo-${layer}.webp`} width="600" height="250" />)}
      </g>
      <image href="/brand/logo-tag.webp" width="600" height="250" mask={`url(#${id}-m-tag)`} />
    </svg>
  )
}
