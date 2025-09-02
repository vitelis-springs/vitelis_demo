import { NextRequest, NextResponse } from 'next/server';
import { UserServiceServer } from '../../../server/services/userService.server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Authenticate user
    const authResponse = await UserServiceServer.authenticateUser({ email, password });

    // Return user data and JWT token
    return NextResponse.json(authResponse, { status: 200 });

  } catch (error: any) {
    console.error('Login error:', error);
    
    return NextResponse.json(
      { error: error.message || 'Authentication failed' },
      { status: 401 }
    );
  }
}
