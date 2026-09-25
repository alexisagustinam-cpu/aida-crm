import { describe, expect, it } from 'vitest'
import { searchHref, selectedRecord } from './search-routes'

describe('global search routes', () => {
  it('builds only existing destination routes for searchable records', () => {
    expect(searchHref('lead', 'lead-1')).toBe('/sales/leads/lead-1')
    expect(searchHref('deal', 'deal-1')).toBe('/sales/pipeline/deal-1')
    expect(searchHref('project', 'project-1')).toBe('/work/projects/project-1')
    expect(searchHref('invoice', 'invoice-1')).toBe('/finance/invoices/invoice-1')
  })

  it('selects just the requested organization-scoped record and reports a missing result', () => {
    expect(selectedRecord([{ id: 'a' }, { id: 'b' }], 'b')).toEqual({ records: [{ id: 'b' }], found: true })
    expect(selectedRecord([{ id: 'a' }], 'missing')).toEqual({ records: [], found: false })
  })
})
