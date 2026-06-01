import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function parseSessionToken(token: string) {
  try {
    return JSON.parse(Buffer.from(token, 'base64').toString());
  } catch {
    return null;
  }
}

function getSessionCookie(cookies: NextRequest['cookies']) {
  const businessSession = cookies.get('session')?.value;
  const adminSession = cookies.get('admin_session')?.value;
  return { businessSession, adminSession };
}

export function middleware(request: NextRequest) {
  const { businessSession, adminSession } = getSessionCookie(request.cookies);
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin') || '*';

  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-KEY');
    return response;
  }

  // Handle business session expiration
  if (businessSession) {
    const session = parseSessionToken(businessSession);
    if (session) {
      if (Date.now() > session.exp) {
        const response = NextResponse.redirect(new URL('/auth/login', request.url));
        response.cookies.delete('session');
        response.headers.set('Access-Control-Allow-Origin', origin);
        return response;
      }

      if (session.mustChangePassword && pathname !== '/auth/change-password' && !pathname.startsWith('/api/auth')) {
        const response = NextResponse.redirect(new URL('/auth/change-password', request.url));
        response.headers.set('Access-Control-Allow-Origin', origin);
        return response;
      }
    }
  }

  // Protect ALL dashboard routes
  if (pathname.startsWith('/dashboard') || 
      pathname.startsWith('/transactions') || 
      pathname.startsWith('/inventory') || 
      pathname.startsWith('/categories') || 
      pathname.startsWith('/users') || 
      pathname.startsWith('/customers') || 
      pathname.startsWith('/expenses') || 
      pathname.startsWith('/reports') || 
      pathname.startsWith('/settings')) {
    if (!businessSession) {
      const response = NextResponse.redirect(new URL('/auth/login', request.url));
      response.headers.set('Access-Control-Allow-Origin', origin);
      return response;
    }
  }

  // Protect ALL admin routes (except login)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!adminSession) {
      const response = NextResponse.redirect(new URL('/admin/login', request.url));
      response.headers.set('Access-Control-Allow-Origin', origin);
      return response;
    }
  }

  const response = NextResponse.next();
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-KEY');
  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/transactions/:path*',
    '/inventory/:path*',
    '/categories/:path*',
    '/users/:path*',
    '/customers/:path*',
    '/expenses/:path*',
    '/reports/:path*',
    '/settings/:path*',
    '/admin/:path*',
    '/api/:path*',
    '/auth/change-password'
  ],
};
