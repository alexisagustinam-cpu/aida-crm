import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

// Todo el espacio del CRM (clientes, pipeline, tareas, KPIs) se guarda como un solo
// documento JSON, igual que lo guardaba la maqueta en el navegador. Es un espacio
// compartido por todo el equipo de AIDA.
const WORKSPACE_ID = 'aida'

function db(): NeonQueryFunction<false, false> {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('Falta DATABASE_URL')
  return neon(url)
}

async function ensureTable(sql: NeonQueryFunction<false, false>) {
  await sql`create table if not exists crm_workspace (
    id text primary key,
    data jsonb not null,
    updated_at timestamptz not null default now(),
    updated_by text
  )`
}

export async function readWorkspace(): Promise<unknown | null> {
  const sql = db()
  await ensureTable(sql)
  const rows = await sql`select data from crm_workspace where id = ${WORKSPACE_ID}`
  return (rows[0] as { data: unknown } | undefined)?.data ?? null
}

export async function writeWorkspace(data: unknown, updatedBy: string) {
  const sql = db()
  await ensureTable(sql)
  await sql`insert into crm_workspace (id, data, updated_by) values (${WORKSPACE_ID}, ${JSON.stringify(data)}::jsonb, ${updatedBy})
    on conflict (id) do update set data = excluded.data, updated_at = now(), updated_by = excluded.updated_by`
}
