import { describe, expect, it } from 'vitest'
import { assertStageBelongsToPipeline } from './stage-integrity'

describe('stage integrity', () => {
  it('rejects a stage from another pipeline', () => {
    expect(() => assertStageBelongsToPipeline('pipeline-a', 'pipeline-b')).toThrow('La etapa no pertenece al pipeline de la oportunidad.')
  })
})
