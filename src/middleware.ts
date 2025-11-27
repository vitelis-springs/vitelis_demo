import { NextRequest, NextResponse } from 'next/server';

// Define protected routes
const protectedRoutes = [
  '/api/analyze',
  '/api/chats',
  '/api/messages',
  '/api/n8n'
];

// Define auth routes that should not be protected
const authRoutes = [
  '/api/auth/login',
  '/api/auth/register'
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for auth routes
  if (authRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check if route needs protection
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  
  if (!isProtectedRoute) {
    return NextResponse.next();
  }
  
  // TEMPORARILY DISABLED: JWT validation in Edge Runtime
  // TODO: Fix Edge Runtime compatibility issues
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
};
