import { requireMember } from '@/lib/auth/member'

export default async function DataPage() {
  const member = await requireMember()
  if (member.role !== 'Administrador') return (
    <article className="panel settings-section">
      <h2>Datos</h2><p>Descargar una copia de todo el CRM es solo para administradores.</p>
    </article>
  )
  return (
    <article className="panel settings-section">
      <h2>Datos</h2><p>Descarga una copia de todo lo que hay en el CRM. Guárdala en un lugar seguro: incluye los datos de todos los clientes.</p>
      <div className="page-actions">
        <a className="outline-button" href="/api/export">Exportar todo (JSON)</a>
        <a className="outline-button" href="/api/export?formato=csv&tabla=clientes">Clientes (CSV)</a>
        <a className="outline-button" href="/api/export?formato=csv&tabla=oportunidades">Oportunidades (CSV)</a>
        <a className="outline-button" href="/api/export?formato=csv&tabla=tareas">Tareas (CSV)</a>
        <a className="outline-button" href="/api/export?formato=csv&tabla=facturas">Facturas (CSV)</a>
      </div>
    </article>
  )
}
