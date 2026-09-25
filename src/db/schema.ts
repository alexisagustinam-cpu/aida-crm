import { boolean, date, integer, jsonb, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'

// Esquema del CRM de AIDA. Cada bloque que se ve en pantalla sale de una de estas tablas.
// Los montos se guardan en centavos (enteros) para no arrastrar errores de redondeo.

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()

// Perfil de cada persona del equipo, ligado a su cuenta de Neon Auth.
export const members = pgTable('members', {
  id: uuid('id').primaryKey().defaultRandom(),
  authUserId: text('auth_user_id').notNull().unique(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('Equipo'),
  avatar: text('avatar'), // data URL de una foto pequeña (≤256 px) subida desde Configuración
  preferences: jsonb('preferences').$type<MemberPreferences>().notNull().default({}),
  createdAt: createdAt(),
})
export type MemberPreferences = { notifyTasks?: boolean; notifyLeads?: boolean; notifyPayments?: boolean }

export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  status: text('status').notNull().default('Activo'), // Activo | En pausa | Prospecto
  category: text('category'), // "Clínica dental"
  industry: text('industry'), // "Salud y Bienestar"
  location: text('location'),
  description: text('description'),
  contactName: text('contact_name'),
  email: text('email'),
  phone: text('phone'),
  owner: text('owner'), // responsable dentro de AIDA
  clientSince: date('client_since'),
  archived: boolean('archived').notNull().default(false),
  createdAt: createdAt(),
})

export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  role: text('role'),
  email: text('email'),
  phone: text('phone'),
  createdAt: createdAt(),
})

// Canales digitales que AIDA opera para el cliente (Website, WhatsApp, CRM, SEO…).
export const channels = pgTable('channels', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  active: boolean('active').notNull().default(true),
  position: integer('position').notNull().default(0),
})

// Oportunidades comerciales: alimentan Leads (etapas iniciales) y el Pipeline.
export const opportunities = pgTable('opportunities', {
  id: uuid('id').primaryKey().defaultRandom(),
  company: text('company').notNull(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  service: text('service').notNull(),
  valueCents: integer('value_cents').notNull().default(0),
  stage: text('stage').notNull().default('Lead'), // Lead | Contactado | Reunión | Propuesta | Ganado | Perdido
  contactName: text('contact_name'),
  email: text('email'),
  phone: text('phone'),
  source: text('source'), // Web, WhatsApp, Referido, Redes sociales…
  nextActionAt: timestamp('next_action_at', { withTimezone: true }),
  position: integer('position').notNull().default(0),
  stageChangedAt: timestamp('stage_changed_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: createdAt(),
})

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').notNull().default('En curso'), // En curso | En pausa | Terminado
  image: text('image'),
  dueDate: date('due_date'),
  createdAt: createdAt(),
})

// Partes de un proyecto (Web, CRM, WhatsApp, SEO) con su avance; el avance del proyecto es su promedio.
export const projectComponents = pgTable('project_components', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  progress: integer('progress').notNull().default(0),
  color: text('color').notNull().default('#0866ff'),
  position: integer('position').notNull().default(0),
})

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  priority: text('priority').notNull().default('Media'), // Alta | Media | Baja
  dueDate: date('due_date'),
  done: boolean('done').notNull().default(false),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  assignee: text('assignee'),
  createdAt: createdAt(),
})

export const meetings = pgTable('meetings', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  location: text('location'), // "Google Meet", dirección…
  link: text('link'),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }),
  createdAt: createdAt(),
})

// Servicios recurrentes contratados: la suma de los activos es el MRR.
export const retainers = pgTable('retainers', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  service: text('service').notNull(),
  monthlyCents: integer('monthly_cents').notNull(),
  startedAt: date('started_at').notNull(),
  endedAt: date('ended_at'),
})

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  number: text('number').notNull(),
  concept: text('concept'),
  amountCents: integer('amount_cents').notNull(),
  issuedOn: date('issued_on').notNull(),
  status: text('status').notNull().default('Pendiente'), // Pendiente | Pagado | Vencido
  paidOn: date('paid_on'),
  createdAt: createdAt(),
})

// Resultados mensuales del cliente (visitas a su web, leads que recibió y conversiones).
export const clientMetrics = pgTable('client_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  month: date('month').notNull(), // primer día del mes
  visits: integer('visits').notNull().default(0),
  leads: integer('leads').notNull().default(0),
  conversions: integer('conversions').notNull().default(0),
}, t => [unique('client_metrics_client_month').on(t.clientId, t.month)])

export const notes = pgTable('notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  pinned: boolean('pinned').notNull().default(false),
  author: text('author'),
  createdAt: createdAt(),
})

// Enlaces a archivos del cliente (Drive, Figma, etc.).
export const files = pgTable('files', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  url: text('url').notNull(),
  createdAt: createdAt(),
})

// Registro de todo lo que pasa en el CRM; se escribe solo desde las acciones.
export const activity = pgTable('activity', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: text('kind').notNull(), // lead | meeting | proposal | task | project | payment | client | note
  title: text('title').notNull(),
  detail: text('detail'),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }),
  actor: text('actor'),
  createdAt: createdAt(),
})

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  body: text('body'),
  href: text('href'),
  readBy: jsonb('read_by').$type<string[]>().notNull().default([]), // ids de members que ya la leyeron
  createdAt: createdAt(),
})

// Reglas que se ejecutan dentro del CRM cuando ocurre un evento.
export const automations = pgTable('automations', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  active: boolean('active').notNull().default(true),
  runs: integer('runs').notNull().default(0),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
})

// Llave para que formularios externos (la web de AIDA) creen leads en el CRM.
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
})

// Servicios externos conectados (WhatsApp, correo, n8n, IA…). `secret` va cifrado (ver lib/crm/secrets.ts).
export const integrations = pgTable('integrations', {
  key: text('key').primaryKey(),
  secret: text('secret'),
  settings: jsonb('settings').$type<Record<string, string>>().notNull().default({}),
  status: text('status').notNull().default('connected'), // connected | error
  lastError: text('last_error'),
  connectedBy: text('connected_by'),
  connectedAt: timestamp('connected_at', { withTimezone: true }).notNull().defaultNow(),
})

// Llaves para que otras herramientas (MCP, n8n, scripts) usen el CRM. Solo se guarda el hash.
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  prefix: text('prefix').notNull(),
  hash: text('hash').notNull().unique(),
  createdBy: text('created_by'),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  revoked: boolean('revoked').notNull().default(false),
  createdAt: createdAt(),
})

// Historial de cada ejecución de una automatización (para comprobar que corren de verdad).
export const automationRuns = pgTable('automation_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  automationKey: text('automation_key').notNull(),
  status: text('status').notNull(), // ok | error | skipped
  detail: text('detail'),
  createdAt: createdAt(),
})
