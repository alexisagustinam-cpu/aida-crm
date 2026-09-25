// Insignia con el nombre del cliente en dos líneas ("Selfie / Dental"), como en la maqueta.
export function ClientMark({ name }: { name: string }) {
  const words = name.split(/\s+/)
  return words.length > 1 ? <>{words[0]}<br />{words.slice(1).join(' ')}</> : <>{name}</>
}
