// Maqueta original del CRM de AIDA (antes en _old-static/index.html), servida tal cual
// desde /dashboard. Estilos, script e imágenes viven en public/crm/.
export const crmPageHtml = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="CRM interno de AIDA Digital Solutions.">
  <title>AIDA · CRM</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="icon" href="/favicon.ico">
  <link rel="stylesheet" href="/crm/styles.css?v=1">
</head>
<body>
  <div class="app-shell">
    <aside class="sidebar" id="sidebar" aria-label="Navegación principal">
      <div class="side-top"><img class="aida-logo" src="/crm/aida-logo.webp" alt="AIDA"><button class="drawer-close icon-btn" aria-label="Cerrar menú" data-close-drawer></button></div>
      <nav class="nav" aria-label="Módulos">
        <button class="nav-link" data-view="dashboard" data-icon="home">Inicio</button><button class="nav-link" data-view="leads" data-icon="users">Leads</button><button class="nav-link" data-view="clients" data-icon="briefcase">Clientes</button><button class="nav-link" data-view="pipeline" data-icon="chart">Pipeline</button><button class="nav-link" data-view="projects" data-icon="folder">Proyectos</button><button class="nav-link" data-view="tasks" data-icon="check">Tareas</button><button class="nav-link" data-view="automations" data-icon="bolt">Automatizaciones</button><button class="nav-link" data-view="reports" data-icon="report">Reportes</button><button class="nav-link" data-view="settings" data-icon="settings">Configuración</button>
      </nav>
      <div class="side-bottom"><section class="brand-callout"><span class="shape shape-blue"></span><span class="shape shape-orange"></span><p>Ideas digitales para<br>un mundo real.</p><button class="circle-arrow" aria-label="Más sobre AIDA">↗</button></section><div class="operator"><img src="/crm/agustin.webp" alt=""><span><b>Agustín Mejías</b><small>Administrador</small></span><button class="more-btn" data-view="settings" aria-label="Configuración y cerrar sesión">•••</button></div></div>
    </aside>
    <div class="backdrop" id="backdrop"></div>
    <header class="mobile-header"><button class="icon-btn menu-btn" id="menuButton" aria-label="Abrir menú" aria-controls="sidebar" aria-expanded="false"></button><img class="aida-logo" src="/crm/aida-logo.webp" alt="AIDA"><button class="notification" aria-label="Notificaciones"></button></header>
    <main class="main"><header class="topbar"><div class="crumb" id="crumb"></div><label class="search"><span class="search-symbol"></span><input id="searchInput" type="search" placeholder="Buscar clientes, leads, proyectos…" aria-label="Buscar clientes, leads, proyectos"><kbd>⌘ K</kbd></label><div class="top-actions"><button class="notification" aria-label="Notificaciones"></button><button class="profile" data-view="settings"><img src="/crm/agustin.webp" alt=""><span><b>Agustín Mejías</b><small>Administrador</small></span></button></div></header><div id="viewContent"></div></main>
  </div>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
  <dialog id="editDialog" aria-labelledby="editTitle"><form id="editForm"><header class="dialog-head"><div><p>CLIENTE</p><h2 id="editTitle">Editar cliente</h2></div><button type="button" class="icon-btn dialog-close" data-close-dialog aria-label="Cerrar"></button></header><div class="form-grid"><label>Nombre<input name="name" required></label><label>Estado<select name="status"><option>Activo</option><option>En pausa</option><option>Prospecto</option></select></label><label>Contacto<input name="contact"></label><label>Correo<input type="email" name="email"></label><label>Teléfono<input name="phone"></label><label>Ciudad<input name="location"></label><label class="full">Descripción<textarea name="description"></textarea></label></div><footer class="dialog-foot"><button type="button" class="quiet-button" data-close-dialog>Cancelar</button><button class="primary-button">Guardar cambios</button></footer></form></dialog>
  <script src="/crm/app.js?v=1"></script>
</body>
</html>
`
