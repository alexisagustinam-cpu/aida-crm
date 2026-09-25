import { NextResponse } from 'next/server'
import { getCurrentMember } from '@/lib/auth/member'
import { getDb, schema as s } from '@/db'
import { todayKey } from '@/lib/crm/format'

export const dynamic = 'force-dynamic'

const TABLES = {
  clientes: s.clients, contactos: s.contacts, oportunidades: s.opportunities, proyectos: s.projects, partes_de_proyecto: s.projectComponents,
  tareas: s.tasks, reuniones: s.meetings, servicios_mensuales: s.retainers, facturas: s.invoices, resultados: s.clientMetrics,
  notas: s.notes, archivos: s.files, actividad: s.activity, automatizaciones: s.automations,
} as const

const csvCell = (v: unknown) => {
  const text = v instanceof Date ? v.toISOString() : v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

// Exporta los datos del CRM: todo en JSON, o una tabla en CSV (?formato=csv&tabla=facturas).
export async function GET(request: Request) {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: 'Sin sesión' }, { status: 401 })
  // Descargar toda la base es solo para administradores.
  if (member.role !== 'Administrador') return NextResponse.json({ error: 'Solo un administrador puede exportar los datos' }, { status: 403 })
  const url = new URL(request.url)
  const db = await getDb()
  const table = url.searchParams.get('tabla') as keyof typeof TABLES | null
  if (url.searchParams.get('formato') === 'csv' && table && TABLES[table]) {
    const rows = await db.select().from(TABLES[table])
    const cols = rows[0] ? Object.keys(rows[0]) : []
    const csv = [cols.join(','), ...rows.map(r => cols.map(c => csvCell((r as Record<string, unknown>)[c])).join(','))].join('\n')
    return new NextResponse(`﻿${csv}`, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="aida-${table}-${todayKey()}.csv"` } })
  }
  const data = Object.fromEntries(await Promise.all(Object.entries(TABLES).map(async ([name, t]) => [name, await db.select().from(t)] as const)))
  return new NextResponse(JSON.stringify({ exportado: new Date().toISOString(), ...data }, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="aida-crm-${todayKey()}.json"` },
  })
}
