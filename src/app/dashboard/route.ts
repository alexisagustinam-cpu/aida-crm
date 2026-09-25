import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/server'
import { crmPageHtml } from '@/lib/crm/page-html'

export const dynamic = 'force-dynamic'

// El CRM de AIDA: la maqueta original, solo con sesión iniciada.
export async function GET(request: Request) {
  const { data: session } = await auth.getSession()
  if (!session?.user) return NextResponse.redirect(new URL('/login', request.url))
  return new NextResponse(crmPageHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store' } })
}
