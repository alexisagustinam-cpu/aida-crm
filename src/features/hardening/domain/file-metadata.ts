const allowedMimeTypes = new Set(['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'])
const maxBytes = 25 * 1024 * 1024
export function validateDocumentMetadata(file: { name: string; type: string; size: number }): { ok: true } | { ok: false; error: string } {
  if (!file.name || file.name.includes('/') || file.name.includes('..')) return { ok: false, error: 'Nombre de archivo inválido.' }
  if (!allowedMimeTypes.has(file.type)) return { ok: false, error: 'Tipo de archivo no permitido.' }
  if (!Number.isFinite(file.size) || file.size < 0 || file.size > maxBytes) return { ok: false, error: 'El archivo supera el límite de 25 MB.' }
  return { ok: true }
}
export { allowedMimeTypes, maxBytes }
