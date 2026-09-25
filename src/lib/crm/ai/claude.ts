import 'server-only'
import Anthropic from '@anthropic-ai/sdk'

export const CLAUDE_DEFAULT_MODEL = 'claude-opus-5'

// Verifica la llave y devuelve los modelos disponibles para esa cuenta.
export async function claudeModels(apiKey: string): Promise<string[]> {
  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 20_000 })
  const ids: string[] = []
  for await (const model of client.models.list({ limit: 50 })) ids.push(model.id)
  return ids
}

export async function claudeComplete(apiKey: string, model: string, system: string, prompt: string): Promise<string> {
  const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 90_000 })
  // Con el modelo por defecto se activan los reintentos del servidor en otro modelo si hubiera un rechazo.
  const fallback = model === CLAUDE_DEFAULT_MODEL ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}
  const response = await client.beta.messages.create({
    model,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'low' },
    system,
    messages: [{ role: 'user', content: prompt }],
    ...fallback,
  })
  if (response.stop_reason === 'refusal') throw new Error('Claude no pudo responder a esta solicitud.')
  return response.content.flatMap(b => (b.type === 'text' ? [b.text] : [])).join('\n').trim()
}
