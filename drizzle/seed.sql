-- Datos de ejemplo del CRM de AIDA (los de la maqueta original), con fechas relativas a hoy
-- en la zona horaria de Ecuador. scripts/migrate.mjs los carga solo si la base está vacía.
-- Cada sentencia va separada por la marca de abajo porque Neon (HTTP) ejecuta una a la vez.

INSERT INTO clients (id, name, status, category, industry, location, description, contact_name, email, phone, owner, client_since) VALUES
('00000000-0000-4000-8000-000000000001', 'Selfie Dental', 'Activo', 'Clínica dental', 'Salud y Bienestar', 'Quito, Ecuador', 'Clínica dental enfocada en una experiencia cercana, moderna y memorable.', 'Nathaly Pérez', 'hola@selfiedental.ec', '+593 99 241 4871', 'Nathaly Pérez', '2024-01-08'),
('00000000-0000-4000-8000-000000000002', 'Casa Lirio', 'Activo', 'Tienda de decoración', 'Retail', 'Cumbayá, Ecuador', 'Tienda de decoración y hogar con venta en línea.', 'Lucía Andrade', 'hola@casalirio.ec', '+593 98 410 2231', 'Jeremy', current_date - 13),
('00000000-0000-4000-8000-000000000003', 'Roca Bikes', 'Activo', 'Tienda de bicicletas', 'Retail', 'Quito, Ecuador', 'Venta y taller de bicicletas de montaña y ruta.', 'Andrés Roca', 'ventas@rocabikes.ec', '+593 99 872 1140', 'Ricardo', current_date - 16),
('00000000-0000-4000-8000-000000000004', 'Futura Labs', 'Activo', 'Laboratorio de software', 'Servicios', 'Guayaquil, Ecuador', 'Estudio de software a medida para empresas.', 'Carla Mendoza', 'hola@futuralabs.ec', '+593 96 331 7780', 'Agustín Mejías', current_date - 18),
('00000000-0000-4000-8000-000000000005', 'Andes Legal', 'Activo', 'Estudio jurídico', 'Servicios', 'Quito, Ecuador', 'Asesoría legal para empresas y emprendedores.', 'Martín Salazar', 'contacto@andeslegal.ec', '+593 99 118 5520', 'Nathaly Pérez', '2024-05-20'),
('00000000-0000-4000-8000-000000000006', 'Pilates Aura', 'Activo', 'Estudio de pilates', 'Salud y Bienestar', 'Quito, Ecuador', 'Estudio boutique de pilates y bienestar.', 'Daniela Vega', 'hola@pilatesaura.ec', '+593 98 227 6093', 'Jeremy', '2024-08-02'),
('00000000-0000-4000-8000-000000000007', 'Nativa Tours', 'Activo', 'Agencia de viajes', 'Turismo', 'Otavalo, Ecuador', 'Experiencias de turismo comunitario en la Sierra norte.', 'Pablo Cabascango', 'reservas@nativatours.ec', '+593 99 640 3317', 'Ricardo', '2024-10-14'),
('00000000-0000-4000-8000-000000000008', 'Verde Vivo Café', 'En pausa', 'Cafetería', 'Gastronomía', 'Quito, Ecuador', 'Cafetería de especialidad con tostaduría propia.', 'Sofía Torres', 'hola@verdevivo.ec', '+593 98 553 0912', 'Agustín Mejías', '2024-03-11');
--> statement-breakpoint
INSERT INTO contacts (client_id, name, role, email, phone) VALUES
('00000000-0000-4000-8000-000000000001', 'Nathaly Pérez', 'Gerente general', 'hola@selfiedental.ec', '+593 99 241 4871'),
('00000000-0000-4000-8000-000000000001', 'Dr. Esteban Ruiz', 'Director clínico', 'esteban@selfiedental.ec', '+593 99 530 2210'),
('00000000-0000-4000-8000-000000000002', 'Lucía Andrade', 'Propietaria', 'hola@casalirio.ec', '+593 98 410 2231'),
('00000000-0000-4000-8000-000000000003', 'Andrés Roca', 'Gerente', 'ventas@rocabikes.ec', '+593 99 872 1140'),
('00000000-0000-4000-8000-000000000004', 'Carla Mendoza', 'Directora de operaciones', 'hola@futuralabs.ec', '+593 96 331 7780');
--> statement-breakpoint
INSERT INTO channels (client_id, name, active, position)
SELECT c.id, ch.name, ch.active, ch.pos FROM clients c
CROSS JOIN (VALUES ('Website', true, 0), ('WhatsApp', true, 1), ('CRM', true, 2), ('SEO', true, 3)) AS ch(name, active, pos)
WHERE c.id = '00000000-0000-4000-8000-000000000001'
UNION ALL
SELECT c.id, ch.name, ch.active, ch.pos FROM clients c
CROSS JOIN (VALUES ('Website', true, 0), ('WhatsApp', false, 1), ('CRM', false, 2), ('SEO', true, 3)) AS ch(name, active, pos)
WHERE c.id <> '00000000-0000-4000-8000-000000000001';
--> statement-breakpoint
INSERT INTO opportunities (company, client_id, service, value_cents, stage, contact_name, source, next_action_at, position, stage_changed_at, created_at) VALUES
('Nómada Travel', NULL, 'Branding', 1450000, 'Lead', 'Valeria Ortiz', 'Web', NULL, 0, now() - interval '2 hours', now() - interval '2 hours'),
('Café Monte', NULL, 'Redes sociales', 820000, 'Lead', 'Jorge Monteros', 'Instagram', NULL, 1, now() - interval '1 day', now() - interval '1 day'),
('Estudio Norte', NULL, 'Sitio web', 1200000, 'Lead', 'Paula Núñez', 'Referido', NULL, 2, now() - interval '2 days', now() - interval '2 days'),
('Clínica Vitalis', NULL, 'Sitio web', 1850000, 'Contactado', 'Dra. Inés Carrera', 'Web', NULL, 0, now() - interval '1 hour', now() - interval '3 days'),
('Luma Arquitectura', NULL, 'Branding', 980000, 'Contactado', 'Tomás Luna', 'Referido', NULL, 1, now() - interval '1 day', now() - interval '5 days'),
('Bamboo Store', NULL, 'E-commerce', 1640000, 'Contactado', 'Camila Bravo', 'WhatsApp', NULL, 2, now() - interval '3 days', now() - interval '6 days'),
('Constructora Delta', NULL, 'CRM', 3200000, 'Reunión', 'Ing. Raúl Delgado', 'Referido', (date_trunc('day', now() AT TIME ZONE 'America/Guayaquil') + interval '15 hours') AT TIME ZONE 'America/Guayaquil', 0, now() - interval '2 days', now() - interval '9 days'),
('Marea Hotel', NULL, 'SEO', 1400000, 'Reunión', 'Gabriela Mora', 'Web', (date_trunc('day', now() AT TIME ZONE 'America/Guayaquil') + interval '1 day 10 hours') AT TIME ZONE 'America/Guayaquil', 1, now() - interval '3 days', now() - interval '10 days'),
('Nido Studio', NULL, 'Web', 1120000, 'Reunión', 'Martina Nido', 'Instagram', (date_trunc('day', now() AT TIME ZONE 'America/Guayaquil') + interval '3 days 10 hours') AT TIME ZONE 'America/Guayaquil', 2, now() - interval '4 days', now() - interval '12 days'),
('Alba Cosmetics', NULL, 'E-commerce', 2260000, 'Propuesta', 'Renata Alba', 'Web', NULL, 0, now() - interval '3 hours', now() - interval '14 days'),
('Métrica Legal', NULL, 'Sitio web', 1500000, 'Propuesta', 'Diego Paredes', 'Referido', NULL, 1, now() - interval '1 day', now() - interval '15 days'),
('Viento Sur', NULL, 'Branding', 790000, 'Propuesta', 'Emilia Sur', 'Redes sociales', NULL, 2, now() - interval '4 days', now() - interval '16 days'),
('Casa Lirio', '00000000-0000-4000-8000-000000000002', 'Sitio web', 1980000, 'Ganado', 'Lucía Andrade', 'Referido', NULL, 0, now() - interval '13 days', now() - interval '30 days'),
('Roca Bikes', '00000000-0000-4000-8000-000000000003', 'CRM', 2640000, 'Ganado', 'Andrés Roca', 'Web', NULL, 1, now() - interval '16 days', now() - interval '35 days'),
('Futura Labs', '00000000-0000-4000-8000-000000000004', 'SEO', 1230000, 'Ganado', 'Carla Mendoza', 'Web', NULL, 2, now() - interval '18 days', now() - interval '40 days');
--> statement-breakpoint
INSERT INTO projects (id, client_id, name, description, status, image, due_date) VALUES
('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', 'Sitio web corporativo', 'Diseño, desarrollo y contenido del sitio principal.', 'En curso', '/crm/selfie-dental-mockup.webp', current_date + 21),
('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000002', 'Tienda en línea', 'Catálogo, pagos en línea y envíos para la tienda.', 'En curso', NULL, current_date + 35),
('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000003', 'CRM de ventas y taller', 'Registro de clientes, órdenes de taller y seguimiento por WhatsApp.', 'En curso', NULL, current_date + 28),
('00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000004', 'Posicionamiento SEO', 'Auditoría técnica, contenidos y reportes mensuales.', 'En curso', NULL, current_date + 60);
--> statement-breakpoint
INSERT INTO project_components (project_id, name, progress, color, position) VALUES
('00000000-0000-4000-8000-000000000101', 'Web', 80, '#0866ff', 0),
('00000000-0000-4000-8000-000000000101', 'CRM', 60, '#a77bff', 1),
('00000000-0000-4000-8000-000000000101', 'WhatsApp', 70, '#12c6b4', 2),
('00000000-0000-4000-8000-000000000101', 'SEO', 40, '#ff7a1a', 3),
('00000000-0000-4000-8000-000000000102', 'Diseño', 90, '#0866ff', 0),
('00000000-0000-4000-8000-000000000102', 'Catálogo', 45, '#12c6b4', 1),
('00000000-0000-4000-8000-000000000102', 'Pagos', 20, '#ff7a1a', 2),
('00000000-0000-4000-8000-000000000103', 'Clientes', 70, '#a77bff', 0),
('00000000-0000-4000-8000-000000000103', 'Taller', 35, '#12c6b4', 1),
('00000000-0000-4000-8000-000000000104', 'Auditoría', 100, '#0866ff', 0),
('00000000-0000-4000-8000-000000000104', 'Contenidos', 30, '#ff7a1a', 1);
--> statement-breakpoint
INSERT INTO tasks (title, priority, due_date, done, completed_at, client_id, project_id, assignee, created_at) VALUES
('Enviar propuesta a Alba Cosmetics', 'Alta', current_date, false, NULL, NULL, NULL, 'Agustín Mejías', now() - interval '2 days'),
('Revisión de avances con Selfie Dental', 'Media', current_date + 2, false, NULL, '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'Nathaly Pérez', now() - interval '3 days'),
('Preparar reporte SEO mensual', 'Media', current_date + 4, false, NULL, '00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000104', 'Ricardo', now() - interval '3 days'),
('Llamada de seguimiento con Nómada', 'Alta', current_date + 6, false, NULL, NULL, NULL, 'Jeremy', now() - interval '1 day'),
('Actualizar brief de Marea Hotel', 'Baja', current_date + 7, false, NULL, NULL, NULL, 'Jeremy', now() - interval '1 day'),
('Actualizar brief de Casa Lirio', 'Media', current_date - 1, true, now() - interval '5 hours', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000102', 'Jeremy', now() - interval '6 days'),
('Validar fotografías del sitio', 'Media', current_date - 3, true, now() - interval '3 days', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'Nathaly Pérez', now() - interval '8 days');
--> statement-breakpoint
INSERT INTO meetings (title, starts_at, location, link, client_id) VALUES
('Revisión de avances web', (date_trunc('day', now() AT TIME ZONE 'America/Guayaquil') + interval '2 days 10 hours') AT TIME ZONE 'America/Guayaquil', 'Google Meet', NULL, '00000000-0000-4000-8000-000000000001'),
('Seguimiento Nómada Travel', (date_trunc('day', now() AT TIME ZONE 'America/Guayaquil') + interval '1 day 11 hours') AT TIME ZONE 'America/Guayaquil', 'Llamada', NULL, NULL),
('Propuesta Constructora Delta', (date_trunc('day', now() AT TIME ZONE 'America/Guayaquil') + interval '3 days 16 hours') AT TIME ZONE 'America/Guayaquil', 'Oficina del cliente', NULL, NULL);
--> statement-breakpoint
INSERT INTO retainers (client_id, service, monthly_cents, started_at) VALUES
('00000000-0000-4000-8000-000000000001', 'Mantenimiento web', 45000, current_date - 170),
('00000000-0000-4000-8000-000000000001', 'Gestión de WhatsApp', 35000, current_date - 110),
('00000000-0000-4000-8000-000000000002', 'SEO mensual', 60000, current_date - 13),
('00000000-0000-4000-8000-000000000003', 'Soporte CRM', 80000, current_date - 16),
('00000000-0000-4000-8000-000000000004', 'SEO y contenidos', 120000, current_date - 18),
('00000000-0000-4000-8000-000000000005', 'Mantenimiento web', 30000, current_date - 150),
('00000000-0000-4000-8000-000000000006', 'Redes sociales', 50000, current_date - 80),
('00000000-0000-4000-8000-000000000007', 'Mantenimiento web', 40000, current_date - 50);
--> statement-breakpoint
-- Una factura pagada por cada mes de cada servicio recurrente (últimos 6 meses), más proyectos puntuales.
INSERT INTO invoices (client_id, number, concept, amount_cents, issued_on, status, paid_on)
SELECT r.client_id, 'A' || lpad((row_number() OVER (ORDER BY m.month, r.client_id))::text, 4, '0'), r.service, r.monthly_cents,
       (m.month + interval '4 days')::date, 'Pagado', (m.month + interval '9 days')::date
FROM retainers r
CROSS JOIN LATERAL (SELECT generate_series(date_trunc('month', current_date) - interval '5 months', date_trunc('month', current_date), interval '1 month')::date AS month) m
WHERE m.month >= date_trunc('month', r.started_at) AND (m.month + interval '4 days')::date <= current_date;
--> statement-breakpoint
INSERT INTO invoices (client_id, number, concept, amount_cents, issued_on, status, paid_on) VALUES
('00000000-0000-4000-8000-000000000001', 'A0042', 'Sitio web corporativo · anticipo', 125000, current_date - 12, 'Pagado', current_date - 10),
('00000000-0000-4000-8000-000000000001', 'P0101', 'Sitio web corporativo · diseño', 240000, current_date - 155, 'Pagado', current_date - 150),
('00000000-0000-4000-8000-000000000008', 'P0107', 'Sitio web de la cafetería', 380000, current_date - 130, 'Pagado', current_date - 125),
('00000000-0000-4000-8000-000000000006', 'P0108', 'Branding del estudio', 520000, current_date - 100, 'Pagado', current_date - 95),
('00000000-0000-4000-8000-000000000001', 'P0102', 'Sitio web corporativo · desarrollo', 620000, current_date - 75, 'Pagado', current_date - 70),
('00000000-0000-4000-8000-000000000007', 'P0109', 'Sitio web de reservas', 350000, current_date - 70, 'Pagado', current_date - 65),
('00000000-0000-4000-8000-000000000005', 'P0110', 'Portal de clientes', 450000, current_date - 45, 'Pagado', current_date - 40),
('00000000-0000-4000-8000-000000000007', 'P0111', 'Motor de reservas en línea', 700000, current_date - 40, 'Pagado', current_date - 35),
('00000000-0000-4000-8000-000000000002', 'P0103', 'Tienda en línea · anticipo', 495000, current_date - 12, 'Pagado', current_date - 11),
('00000000-0000-4000-8000-000000000003', 'P0104', 'CRM de ventas · anticipo', 660000, current_date - 15, 'Pagado', current_date - 14),
('00000000-0000-4000-8000-000000000004', 'P0105', 'Auditoría SEO', 615000, current_date - 17, 'Pagado', current_date - 16),
('00000000-0000-4000-8000-000000000003', 'P0106', 'CRM de ventas · segundo pago', 660000, current_date + 10, 'Pendiente', NULL);
--> statement-breakpoint
-- Resultados de Selfie Dental: los últimos 3 meses contra los 3 anteriores dan +180% visitas, +65% leads, +42% conversión.
INSERT INTO client_metrics (client_id, month, visits, leads, conversions)
SELECT '00000000-0000-4000-8000-000000000001', (date_trunc('month', current_date) - (m.n || ' months')::interval)::date, m.visits, m.leads, m.conv
FROM (VALUES (1, 2480, 62, 17), (2, 2150, 55, 14), (3, 1890, 48, 13), (4, 880, 40, 11), (5, 760, 34, 10), (6, 690, 26, 10)) AS m(n, visits, leads, conv);
--> statement-breakpoint
INSERT INTO notes (client_id, body, pinned, author) VALUES
('00000000-0000-4000-8000-000000000001', 'El cliente prioriza una navegación tranquila y confianza desde la primera visita. Validar fotografías antes de publicar.', true, 'Nathaly Pérez');
--> statement-breakpoint
INSERT INTO activity (kind, title, detail, client_id, actor, created_at) VALUES
('project', 'Proyecto actualizado', 'Sitio web corporativo · 63%', '00000000-0000-4000-8000-000000000001', 'Nathaly Pérez', now() - interval '26 hours'),
('task', 'Tarea completada', 'Brief de Casa Lirio actualizado', '00000000-0000-4000-8000-000000000002', 'Jeremy', now() - interval '5 hours'),
('proposal', 'Propuesta enviada', 'Alba Cosmetics · $22,600', NULL, 'Agustín Mejías', now() - interval '3 hours'),
('meeting', 'Reunión programada', 'Revisión de avances con Selfie Dental', '00000000-0000-4000-8000-000000000001', 'Nathaly Pérez', now() - interval '2 hours'),
('lead', 'Nuevo lead agregado', 'Clínica Vitalis entró al pipeline', NULL, 'Agustín Mejías', now() - interval '1 hour'),
('payment', 'Pago registrado', 'Invoice #A0042 marcada como pagada', '00000000-0000-4000-8000-000000000001', 'Agustín Mejías', now() - interval '10 days'),
('project', 'Mockup validado', 'Diseño web revisado con el equipo.', '00000000-0000-4000-8000-000000000001', 'Nathaly Pérez', now() - interval '12 days');
--> statement-breakpoint
INSERT INTO automations (key, name, description, active) VALUES
('won_to_client', 'Oportunidad ganada → cliente', 'Cuando una oportunidad pasa a Ganado, crea el cliente (si no existe) y una tarea de bienvenida.', true),
('new_lead_notify', 'Aviso de lead nuevo', 'Cuando entra un lead nuevo (desde el CRM o la web), avisa a todo el equipo.', true),
('meeting_prep_task', 'Preparar reuniones', 'Al agendar una reunión con un cliente, crea una tarea para prepararla el día anterior.', true),
('payment_activity', 'Pagos en la actividad', 'Cada factura marcada como pagada queda registrada en la actividad del cliente.', true),
('tasks_due_notify', 'Tareas que vencen hoy', 'Cada día avisa al equipo de las tareas pendientes que vencen hoy.', true);
--> statement-breakpoint
INSERT INTO settings (key, value) VALUES ('intake_key', to_jsonb(md5(random()::text || clock_timestamp()::text)));
