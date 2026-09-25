// Logo de AIDA que se "escribe": cada trazo de la máscara destapa el PNG real
// en orden de escritura; al final entra el logo completo para dejar bordes nítidos.
// [recorrido, grosor, inicio (s), duración (s)] en coordenadas del PNG (600×250).
const strokes: [string, number, number, number][] = [
  ['M40 184 C16 150 22 95 60 62 C95 32 150 30 178 55 C200 78 196 130 170 160 C145 188 100 190 88 165 C76 140 92 105 125 88 C155 72 185 62 212 58', 60, 0.2, 1.05],
  ['M112 150 C122 128 138 114 150 110', 42, 1.1, 0.2],
  ['M250 84 L250 176', 50, 1.3, 0.25],
  ['M250 30 L250 34', 58, 1.58, 0.12],
  ['M400 95 C385 70 338 68 316 95 C296 122 303 170 338 182 C374 192 402 170 406 145', 56, 1.75, 0.45],
  ['M408 22 L408 186', 48, 2.15, 0.28],
  ['M572 92 C555 62 500 60 474 88 C448 118 452 170 490 184 C530 196 566 175 576 145', 58, 2.48, 0.45],
  ['M576 78 L576 184', 62, 2.88, 0.26],
]

export function LogoWrite({ id = 'aida-write', className = '' }: { id?: string; className?: string }) {
  return (
    <svg viewBox="0 0 600 250" role="img" aria-label="AIDA Digital Solutions" className={`logo-write ${className}`}>
      <defs>
        <mask id={`${id}-letters`} maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="210">
          {strokes.map(([d, width, delay, duration]) => (
            <path key={d} d={d} pathLength={1} strokeWidth={width} className="lw-stroke" style={{ animationDelay: `${delay}s`, animationDuration: `${duration}s` }} />
          ))}
        </mask>
        <mask id={`${id}-tagline`} maskUnits="userSpaceOnUse" x="0" y="210" width="600" height="40">
          <rect x="0" y="210" width="600" height="40" fill="#fff" className="lw-tagline" />
        </mask>
      </defs>
      <image href="/brand/aida-logo.png" width="600" height="250" mask={`url(#${id}-letters)`} />
      <image href="/brand/aida-logo.png" width="600" height="250" mask={`url(#${id}-tagline)`} />
      <image href="/brand/aida-logo.png" width="600" height="250" className="lw-final" />
    </svg>
  )
}
