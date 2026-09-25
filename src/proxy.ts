import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/server'

// El nombre y la firma de este archivo los define Next.js 16 (reemplaza al
// antiguo middleware.ts / export "middleware"). Ver AGENTS.md.
const protectedRoutes = auth.middleware({ loginUrl: '/login' })

// El middleware de Neon ya deja pasar su propio loginUrl (/login), pero sus
// rutas públicas por defecto son las suyas (/auth/sign-up…), no /signup:
// sin esta excepción, crear cuenta redirige siempre a /login.
const PUBLIC_PATHS = ['/signup', '/api/intake/lead', '/api/cron/daily']
// Rutas con su propia autenticación por llave (MCP y API para n8n)
const PUBLIC_PREFIXES = ['/api/mcp', '/api/v1/']

export async function proxy(request: NextRequest) {
  // Acceso local sin login (solo `next dev` con AIDA_DEV_LOGIN=1; ver lib/auth/member.ts)
  if (process.env.NODE_ENV === 'development' && process.env.AIDA_DEV_LOGIN === '1') return
  // Las Server Actions viajan como POST con esta cabecera: dejarlas pasar
  // sin redirigir evita romper los formularios de login/signup.
  if (request.headers.has('Next-Action')) return
  if (PUBLIC_PATHS.includes(request.nextUrl.pathname)) return
  if (PUBLIC_PREFIXES.some(p => request.nextUrl.pathname.startsWith(p))) return
  return protectedRoutes(request)
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|apple-icon.png|brand/|api/auth).*)'] }
