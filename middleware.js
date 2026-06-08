// middleware.js
import { NextResponse } from 'next/server'

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // Define route rules
  const isProtectedRoute = ['/dashboard', '/ride', '/map', '/earnings', '/profile'].some((route) => 
    pathname === route || pathname.startsWith(route + '/')
  )
  
  const isPublicRoute = ['/login', '/login/verify'].some((route) => 
    pathname === route || pathname.startsWith(route + '/')
  )

  // Retrieve token stored in cookies by Supabase Auth (typical names used by supabase clients)
  const hasSessionCookie = request.cookies.has('sb-access-token') || 
                           request.cookies.has('supabase-auth-token') ||
                           request.cookies.getAll().some(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));

  if (isProtectedRoute && !hasSessionCookie) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  if (isPublicRoute && hasSessionCookie) {
    const dashboardUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(dashboardUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/ride/:path*',
    '/map/:path*',
    '/earnings/:path*',
    '/profile/:path*',
    '/login',
    '/login/verify',
  ],
}
