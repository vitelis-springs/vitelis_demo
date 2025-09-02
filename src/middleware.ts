import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

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

  console.log('🛡️ Middleware: Processing request for:', pathname);
  console.log('🛡️ Middleware: Request headers:', Object.fromEntries(request.headers.entries()));

  // Skip middleware for auth routes
  if (authRoutes.some(route => pathname.startsWith(route))) {
    console.log('🛡️ Middleware: Skipping auth route');
    return NextResponse.next();
  }

  // Check if route needs protection
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  
  if (!isProtectedRoute) {
    console.log('🛡️ Middleware: Route not protected, continuing');
    return NextResponse.next();
  }

  console.log('🛡️ Middleware: Route is protected, checking auth');

  // Get token from Authorization header
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  console.log('🛡️ Middleware: Auth header:', authHeader);
  console.log('🛡️ Middleware: Token extracted:', token ? `${token.substring(0, 20)}...` : 'none');

  if (!token) {
    console.log('🛡️ Middleware: No token found, returning 401');
    return NextResponse.json(
      { error: 'Access token required' },
      { status: 401 }
    );
  }

  try {
    console.log('🛡️ Middleware: Verifying JWT token...');
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    console.log('🛡️ Middleware: Token verified successfully:', { 
      userId: (decoded as any).userId,
      email: (decoded as any).email,
      role: (decoded as any).role
    });
    
    // Add user info to request headers for use in API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', (decoded as any).userId);
    requestHeaders.set('x-user-email', (decoded as any).email);
    requestHeaders.set('x-user-role', (decoded as any).role);

    console.log('🛡️ Middleware: Added user headers, continuing request');
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.log('🛡️ Middleware: JWT verification failed:', error);
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
};
