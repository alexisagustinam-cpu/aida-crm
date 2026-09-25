import 'server-only'

// Gemini (Google AI Studio) por su API REST.
const BASE = 'https://generativelanguage.googleapis.com/v1beta'

export async function geminiModels(apiKey: string): Promise<string[]> {
  const r = await fetch(`${BASE}/models?pageSize=100`, { headers: { 'x-goog-api-key': apiKey }, signal: AbortSignal.timeout(20_000) })
  if (!r.ok) throw new Error(r.status === 400 || r.status === 403 ? 'La llave de Gemini no es válida.' : `Gemini respondió ${r.status}.`)
  const { models } = (await r.json()) as { models: { name: string; supportedGenerationMethods?: string[] }[] }
  return models.filter(m => m.supportedGenerationMethods?.includes('generateContent') && /gemini/.test(m.name))
    .map(m => m.name.replace(/^models\//, '')).sort().reverse()
}

export async function geminiComplete(apiKey: string, model: string, system: string, prompt: string): Promise<string> {
  const r = await fetch(`${BASE}/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST', signal: AbortSignal.timeout(90_000),
    headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
  })
  const body = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[]; error?: { message?: string } }
  if (!r.ok) throw new Error(body.error?.message ?? `Gemini respondió ${r.status}.`)
  return body.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('').trim() ?? ''
}
