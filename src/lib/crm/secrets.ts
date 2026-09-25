import 'server-only'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

// Cifrado de las claves de integraciones (AES-256-GCM). La llave sale de INTEGRATIONS_KEY o,
// si no existe, se deriva del secreto de cookies de Neon Auth (que ya vive en Vercel).
function key() {
  const source = process.env.INTEGRATIONS_KEY ?? process.env.NEON_AUTH_COOKIE_SECRET
  if (!source) throw new Error('Falta INTEGRATIONS_KEY para cifrar las integraciones')
  return createHash('sha256').update(`aida-integrations:${source}`).digest()
}

export function encrypt(value: object): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join('.')
}

export function decrypt<T>(payload: string): T {
  const [, iv, tag, data] = payload.split('.')
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv!, 'base64'))
  decipher.setAuthTag(Buffer.from(tag!, 'base64'))
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(data!, 'base64')), decipher.final()]).toString('utf8')) as T
}

export const sha256 = (text: string) => createHash('sha256').update(text).digest('hex')
export const randomToken = (bytes = 24) => randomBytes(bytes).toString('base64url')

// "sk-ant-api03-abcd…wxyz" → "sk-ant…wxyz"
export const maskSecret = (s: string) => (s.length <= 10 ? '••••' : `${s.slice(0, 6)}…${s.slice(-4)}`)
