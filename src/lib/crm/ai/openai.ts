import 'server-only'

// OpenAI por su API REST (el SDK de Anthropic no aplica aquí).
export async function openaiModels(apiKey: string): Promise<string[]> {
  const r = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(20_000) })
  if (!r.ok) throw new Error(r.status === 401 ? 'La llave de OpenAI no es válida.' : `OpenAI respondió ${r.status}.`)
  const { data } = (await r.json()) as { data: { id: string; created: number }[] }
  return data.filter(m => /^(gpt|o\d|chatgpt)/.test(m.id) && !/(audio|realtime|transcribe|tts|image|search|embedding)/.test(m.id))
    .sort((a, b) => b.created - a.created).map(m => m.id)
}

export async function openaiComplete(apiKey: string, model: string, system: string, prompt: string): Promise<string> {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', signal: AbortSignal.timeout(90_000),
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] }),
  })
  const body = (await r.json()) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } }
  if (!r.ok) throw new Error(body.error?.message ?? `OpenAI respondió ${r.status}.`)
  return body.choices?.[0]?.message?.content?.trim() ?? ''
}
