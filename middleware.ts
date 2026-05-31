import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect platform admin routes
  const adminSession = request.cookies.get('admin_session')?.value
  const isAdminRoute = pathname.startsWith('/admin')
  const isAdminLogin = pathname === '/admin/login'
  if (isAdminRoute && !isAdminLogin && !adminSession) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  // Protect school dashboard routes
  const schoolSession = request.cookies.get('school_session')?.value
  const isSchoolDashboard = pathname.startsWith('/school/dashboard')
  if (isSchoolDashboard && !schoolSession) {
    return NextResponse.redirect(new URL('/school/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/school/dashboard/:path*']
}
