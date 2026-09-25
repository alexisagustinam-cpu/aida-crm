import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/server'
import { readWorkspace, writeWorkspace } from '@/lib/crm/store'

export const dynamic = 'force-dynamic'

const MAX_BYTES = 1_000_000

export async function GET() {
  const { data: session } = await auth.getSession()
  if (!session?.user) return NextResponse.json({ error: 'Sin sesión' }, { status: 401 })
  try {
    return NextResponse.json({ data: await readWorkspace() })
  } catch (error) {
    console.error('crm/read:', error)
    return NextResponse.json({ error: 'No se pudieron leer los datos' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const { data: session } = await auth.getSession()
  if (!session?.user) return NextResponse.json({ error: 'Sin sesión' }, { status: 401 })
  const body = await request.text()
  if (body.length > MAX_BYTES) return NextResponse.json({ error: 'Datos demasiado grandes' }, { status: 413 })
  let data: unknown
  try { data = JSON.parse(body) } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  if (!data || typeof data !== 'object' || !Array.isArray((data as { clients?: unknown }).clients)) {
    return NextResponse.json({ error: 'Formato inválido' }, { status: 400 })
  }
  try {
    await writeWorkspace(data, session.user.email ?? session.user.id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('crm/write:', error)
    return NextResponse.json({ error: 'No se pudieron guardar los datos' }, { status: 500 })
  }
}
