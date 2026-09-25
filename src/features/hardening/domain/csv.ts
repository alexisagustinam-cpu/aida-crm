export type ImportEntity = 'companies' | 'contacts' | 'deals'
export type ImportRow = Record<string, string>
export type ValidatedImportRow = { row: ImportRow; errors: string[] }

export function csvEscape(value: unknown): string {
  const string = String(value ?? '')
  const safe = /^[=+\-@]/.test(string) ? `'${string}` : string
  return /[",\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe
}

export function toCsv(headers: string[], rows: ImportRow[]): string { return [headers.join(','), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(','))].join('\r\n') }

export function parseImportCsv(content: string): ImportRow[] {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim())
  const parse = (line: string) => Array.from(line.matchAll(/(?:^|,)(?:"((?:[^"]|"")*)"|([^",]*))/g)).map((match) => (match[1] ?? match[2] ?? '').replaceAll('""', '"').trim())
  const headers = parse(lines.shift() ?? '').map((header) => header.toLowerCase())
  return lines.map((line) => Object.fromEntries(headers.map((header, index) => [header, parse(line)[index] ?? ''])))
}

export function validateImportRows(entity: ImportEntity, rows: ImportRow[]) {
  const invalid: ValidatedImportRow[] = []
  const valid: ImportRow[] = []
  for (const row of rows) {
    const errors: string[] = []
    if (entity === 'companies' && !row.name) errors.push('name es obligatorio')
    if (entity === 'contacts' && !row.first_name) errors.push('first_name es obligatorio')
    if (entity === 'deals' && !row.name) errors.push('name es obligatorio')
    if (entity === 'deals' && !row.pipeline_id) errors.push('pipeline_id es obligatorio')
    if (entity === 'deals' && !row.stage_id) errors.push('stage_id es obligatorio')
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push('email no es válido')
    if (errors.length) invalid.push({ row, errors }); else valid.push(row)
  }
  return { valid, invalid }
}
