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
  <script>try{var t=localStorage.getItem('aida-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;if(localStorage.getItem('aida-sidebar')==='collapsed')document.documentElement.dataset.sidebar='collapsed'}catch(e){}</script>
  <link rel="stylesheet" href="/crm/styles.css?v=2">
  <link rel="stylesheet" href="/crm/theme-light.css?v=2">
  <link rel="stylesheet" href="/crm/ui.css?v=2">
</head>
<body>
  <div class="app-shell">
    <aside class="sidebar" id="sidebar" aria-label="Navegación principal">
      <div class="side-top"><img class="brand-logo logo-dark" src="/crm/logo-dark.webp" width="480" height="162" alt="AIDA"><img class="brand-logo logo-light" src="/crm/logo-light.webp" width="480" height="162" alt="AIDA"><img class="brand-mark logo-dark" src="/crm/logo-mark-dark.webp" width="120" height="96" alt="AIDA"><img class="brand-mark logo-light" src="/crm/logo-mark-light.webp" width="120" height="96" alt="AIDA"><button class="collapse-btn" type="button" data-collapse aria-label="Ocultar menú" aria-expanded="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg></button><button class="drawer-close icon-btn" aria-label="Cerrar menú" data-close-drawer></button></div>
      <nav class="nav" aria-label="Módulos">
        <button class="nav-link" data-view="dashboard" data-icon="home" title="Inicio"><span>Inicio</span></button><button class="nav-link" data-view="leads" data-icon="users" title="Leads"><span>Leads</span></button><button class="nav-link" data-view="clients" data-icon="briefcase" title="Clientes"><span>Clientes</span></button><button class="nav-link" data-view="pipeline" data-icon="chart" title="Pipeline"><span>Pipeline</span></button><button class="nav-link" data-view="projects" data-icon="folder" title="Proyectos"><span>Proyectos</span></button><button class="nav-link" data-view="tasks" data-icon="check" title="Tareas"><span>Tareas</span></button><button class="nav-link" data-view="automations" data-icon="bolt" title="Automatizaciones"><span>Automatizaciones</span></button><button class="nav-link" data-view="reports" data-icon="report" title="Reportes"><span>Reportes</span></button><button class="nav-link" data-view="settings" data-icon="settings" title="Configuración"><span>Configuración</span></button>
      </nav>
      <div class="side-bottom"><section class="brand-callout"><span class="shape shape-blue"></span><span class="shape shape-orange"></span><p>Ideas digitales para<br>un mundo real.</p><button class="circle-arrow" aria-label="Más sobre AIDA">↗</button></section><div class="operator"><img src="/crm/agustin.webp" alt=""><span><b>Agustín Mejías</b><small>Administrador</small></span><button class="more-btn" data-view="settings" aria-label="Configuración y cerrar sesión">•••</button></div></div>
    </aside>
    <div class="backdrop" id="backdrop"></div>
    <header class="mobile-header"><button class="icon-btn menu-btn" id="menuButton" aria-label="Abrir menú" aria-controls="sidebar" aria-expanded="false"></button><img class="brand-logo logo-dark" src="/crm/logo-dark.webp" width="480" height="162" alt="AIDA"><img class="brand-logo logo-light" src="/crm/logo-light.webp" width="480" height="162" alt="AIDA"><button class="theme-btn" type="button" data-theme-toggle aria-label="Cambiar entre modo claro y oscuro"><svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg><svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg></button><button class="notification" aria-label="Notificaciones"></button></header>
    <main class="main"><header class="topbar"><div class="crumb" id="crumb"></div><label class="search"><span class="search-symbol"></span><input id="searchInput" type="search" placeholder="Buscar clientes, leads, proyectos…" aria-label="Buscar clientes, leads, proyectos"><kbd>⌘ K</kbd></label><div class="top-actions"><button class="theme-btn" type="button" data-theme-toggle aria-label="Cambiar entre modo claro y oscuro"><svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg><svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg></button><button class="notification" aria-label="Notificaciones"></button><button class="profile" data-view="settings"><img src="/crm/agustin.webp" alt=""><span><b>Agustín Mejías</b><small>Administrador</small></span></button></div></header><div id="viewContent"></div></main>
  </div>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
  <dialog id="editDialog" aria-labelledby="editTitle"><form id="editForm"><header class="dialog-head"><div><p>CLIENTE</p><h2 id="editTitle">Editar cliente</h2></div><button type="button" class="icon-btn dialog-close" data-close-dialog aria-label="Cerrar"></button></header><div class="form-grid"><label>Nombre<input name="name" required></label><label>Estado<select name="status"><option>Activo</option><option>En pausa</option><option>Prospecto</option></select></label><label>Contacto<input name="contact"></label><label>Correo<input type="email" name="email"></label><label>Teléfono<input name="phone"></label><label>Ciudad<input name="location"></label><label class="full">Descripción<textarea name="description"></textarea></label></div><footer class="dialog-foot"><button type="button" class="quiet-button" data-close-dialog>Cancelar</button><button class="primary-button">Guardar cambios</button></footer></form></dialog>
  <script src="/crm/app.js?v=2"></script>
</body>
</html>
`
