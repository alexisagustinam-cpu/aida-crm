import { describe, expect, it } from 'vitest'
import { conversionDestination } from './conversion-destination'

describe('conversionDestination', () => {
  it('takes the user to the exact newly created opportunity instead of an unanchored pipeline', () => {
    expect(conversionDestination('11111111-1111-1111-1111-111111111111')).toBe('/sales/pipeline?deal=11111111-1111-1111-1111-111111111111&notice=converted')
  })
})
