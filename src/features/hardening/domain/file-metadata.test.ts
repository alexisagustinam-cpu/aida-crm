import { describe, expect, test } from 'vitest'
import { validateDocumentMetadata } from './file-metadata'

describe('document metadata validation', () => {
  test('only permits safe document types within the size limit', () => {
    expect(validateDocumentMetadata({ name: 'contract.pdf', type: 'application/pdf', size: 1024 })).toEqual({ ok: true })
    expect(validateDocumentMetadata({ name: 'script.exe', type: 'application/x-msdownload', size: 1024 }).ok).toBe(false)
    expect(validateDocumentMetadata({ name: 'large.pdf', type: 'application/pdf', size: 26 * 1024 * 1024 }).ok).toBe(false)
  })
})
