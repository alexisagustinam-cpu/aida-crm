export type SearchEntity = 'company' | 'contact' | 'lead' | 'deal' | 'project' | 'invoice'

export function searchHref(entity: SearchEntity, id: string) {
  const encodedId = encodeURIComponent(id)
  if (entity === 'deal') return `/sales/pipeline/${encodedId}`
  if (entity === 'project') return `/work/projects/${encodedId}`
  if (entity === 'invoice') return `/finance/invoices/${encodedId}`
  return `/sales/${entity === 'company' ? 'companies' : entity === 'contact' ? 'contacts' : 'leads'}/${encodedId}`
}

export function selectedRecord<T extends { id: string }>(records: T[], requestedId?: string | null) {
  if (!requestedId) return { records, found: true }
  const record = records.find((item) => item.id === requestedId)
  return { records: record ? [record] : [], found: Boolean(record) }
}
