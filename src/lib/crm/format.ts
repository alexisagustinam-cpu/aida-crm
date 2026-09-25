// Formatos del CRM: todo en español y en la hora de Ecuador.
export const TZ = 'America/Guayaquil'

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
export const formatMoney = (cents: number) => money.format(Math.round(cents / 100))
export const formatMoneyPlain = (cents: number) => Math.round(cents / 100).toLocaleString('en-US')

// Fecha del calendario (YYYY-MM-DD) de un instante, en Ecuador.
export function dayKey(d: Date | string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d))
}
export const todayKey = () => dayKey(new Date())

function daysBetween(fromKey: string, toKey: string) {
  return Math.round((Date.parse(toKey) - Date.parse(fromKey)) / 86_400_000)
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const shortWeekday = (d: Date) => cap(new Intl.DateTimeFormat('es-EC', { timeZone: TZ, weekday: 'short' }).format(d).replace('.', '').slice(0, 3))
const shortMonth = (d: Date) => cap(new Intl.DateTimeFormat('es-EC', { timeZone: TZ, month: 'short' }).format(d).replace('.', '').slice(0, 3))
const time = (d: Date) => new Intl.DateTimeFormat('es-EC', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
const dayNum = (d: Date) => new Intl.DateTimeFormat('es-EC', { timeZone: TZ, day: 'numeric' }).format(d)

// "Ene 13"
export function formatShortDate(input: Date | string) {
  const d = typeof input === 'string' && input.length === 10 ? new Date(`${input}T12:00:00-05:00`) : new Date(input)
  return `${shortMonth(d)} ${dayNum(d)}`
}

// "12 ene 2025"
export function formatLongDate(input: Date | string) {
  const d = typeof input === 'string' && input.length === 10 ? new Date(`${input}T12:00:00-05:00`) : new Date(input)
  const y = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric' }).format(d)
  return `${dayNum(d)} ${shortMonth(d).toLowerCase()} ${y}`
}

// Hace cuánto: "Hace 5 min", "Hace 2 h", "Ayer", "Hace 3 días", "Ene 13"
export function formatAgo(input: Date | string, now = new Date()) {
  const d = new Date(input)
  const minutes = Math.floor((now.getTime() - d.getTime()) / 60_000)
  if (minutes < 1) return 'Ahora'
  if (minutes < 60) return `Hace ${minutes} min`
  const days = daysBetween(dayKey(d), dayKey(now))
  if (days === 0) return `Hace ${Math.floor(minutes / 60)} h`
  if (days === 1) return 'Ayer'
  if (days < 7) return `Hace ${days} días`
  return formatShortDate(d)
}

// Cuándo es: "Hoy, 15:00", "Mañana, 10:00", "Vie, 10:00", "Ene 28"
export function formatWhen(input: Date | string, now = new Date()) {
  const d = new Date(input)
  const days = daysBetween(dayKey(now), dayKey(d))
  if (days === 0) return `Hoy, ${time(d)}`
  if (days === 1) return `Mañana, ${time(d)}`
  if (days > 1 && days < 7) return `${shortWeekday(d)}, ${time(d)}`
  if (days === -1) return `Ayer, ${time(d)}`
  return formatShortDate(d)
}

// Vencimiento de una tarea (fecha sin hora): "Hoy", "Mañana", "Mar 20", "Vencida · Mar 2"
export function formatDue(dateKey: string | null, now = new Date()) {
  if (!dateKey) return 'Sin fecha'
  const days = daysBetween(dayKey(now), dateKey)
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Mañana'
  if (days === -1) return 'Ayer'
  return formatShortDate(dateKey)
}
export function isOverdue(dateKey: string | null) {
  return !!dateKey && dateKey < todayKey()
}

export function formatTime(input: Date | string) { return time(new Date(input)) }
export function monthLabel(input: Date | string) { return shortMonth(new Date(input)) }

export function greeting(now = new Date()) {
  const h = Number(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hour12: false }).format(now))
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
}
export function longToday(now = new Date()) {
  return cap(new Intl.DateTimeFormat('es-EC', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now))
}

export function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100
  return Math.round(((current - previous) / previous) * 100)
}
export const signed = (n: number) => `${n >= 0 ? '+' : ''}${n}%`

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('')
}

// Hora actual en ms (en una función para poder usarla al renderizar en el servidor)
export const nowMs = () => Date.now()
