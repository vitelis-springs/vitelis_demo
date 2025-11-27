import { NextRequest, NextResponse } from 'next/server';
import { UserServiceServer } from '../../../server/services/userService.server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 Login API: Starting login request');
    
    const body = await request.json();
    console.log('🔐 Login API: Request body received:', {
      email: body.email,
      passwordLength: body.password?.length || 0,
      passwordPreview: body.password?.substring(0, 3) + '...',
      hasEmail: !!body.email,
      hasPassword: !!body.password
    });
    
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    console.log('✅ Login API: Input validation passed');

    // Authenticate user
    console.log('🔐 Login API: Calling UserService.authenticateUser...');
    const authResponse = await UserServiceServer.authenticateUser({ email, password });
    console.log('✅ Login API: Authentication successful, user role:', authResponse.user.role);

    // Return user data and JWT token
    return NextResponse.json(authResponse, { status: 200 });

  } catch (error: any) {
    console.error('❌ Login API: Authentication failed:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return NextResponse.json(
      { error: error.message || 'Authentication failed' },
      { status: 401 }
    );
  }
}
