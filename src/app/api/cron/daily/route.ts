import { NextResponse } from 'next/server'
import { runDailyChecks } from '@/lib/crm/automations'

// Revisión diaria (vercel.json → crons, 7:00 hora de Ecuador). Vercel envía CRON_SECRET como Bearer.
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const ran = await runDailyChecks()
  return NextResponse.json({ ok: true, ejecutada: ran })
}
