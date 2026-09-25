import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/server'

// El nombre y la firma de este archivo los define Next.js 16 (reemplaza al
// antiguo middleware.ts / export "middleware"). Ver AGENTS.md.
const protectedRoutes = auth.middleware({ loginUrl: '/login' })

export async function proxy(request: NextRequest) {
  // Las Server Actions viajan como POST con esta cabecera: dejarlas pasar
  // sin redirigir evita romper los formularios de login/signup.
  if (request.headers.has('Next-Action')) return
  return protectedRoutes(request)
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'] }
