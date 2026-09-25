export default function DataPage() {
  return (
    <article className="panel settings-section">
      <h2>Datos</h2><p>Descarga una copia de todo lo que hay en el CRM.</p>
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
