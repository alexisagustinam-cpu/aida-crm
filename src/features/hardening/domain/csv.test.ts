import { describe, expect, test } from 'vitest'
import { csvEscape, parseImportCsv, validateImportRows } from './csv'

describe('CSV hardening', () => {
  test('escapes spreadsheet-sensitive values and quotes', () => {
    expect(csvEscape('=SUM("a,b")')).toBe("\"'=SUM(\"\"a,b\"\")\"")
  })

  test('validates a company preview without creating data', () => {
    const rows = parseImportCsv('name,email\nAutomAI,hello@automai.dev\n,missing@example.com')
    const result = validateImportRows('companies', rows)
    expect(result.valid).toHaveLength(1)
    expect(result.invalid[0]?.errors).toContain('name es obligatorio')
  })

  test('requires persisted pipeline and stage identifiers for deal imports', () => {
    const result = validateImportRows('deals', [{ name: 'Implementation', pipeline_id: '', stage_id: '' }])
    expect(result.invalid[0]?.errors).toContain('pipeline_id es obligatorio')
  })
})
