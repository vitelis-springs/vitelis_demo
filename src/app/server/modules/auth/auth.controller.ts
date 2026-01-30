import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AuthService } from './auth.service';

export class AuthController {
  static async login(request: NextRequest): Promise<NextResponse> {
    try {
      const body = await request.json();
      const { email, password } = body;

      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
      }

      const authResponse = await AuthService.login({ email, password });
      return NextResponse.json(authResponse, { status: 200 });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      console.error('❌ AuthController.login:', message);
      return NextResponse.json({ error: message }, { status: 401 });
    }
  }

  static async register(request: NextRequest): Promise<NextResponse> {
    try {
      const body = await request.json();
      const { email, password, companyName, logo, firstName, lastName } = body;

      if (!email || !password || !companyName) {
        return NextResponse.json(
          { error: 'Email, password, and company name are required' },
          { status: 400 }
        );
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }

      if (password.length < 8) {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters long' },
          { status: 400 }
        );
      }

      const user = await AuthService.register({ email, password, companyName, logo, firstName, lastName });

      return NextResponse.json({ message: 'User created successfully', user }, { status: 201 });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create user';
      console.error('❌ AuthController.register:', message);

      if (message === 'User with this email already exists') {
        return NextResponse.json({ error: message }, { status: 409 });
      }

      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  static async logout(): Promise<NextResponse> {
    try {
      const cookieStore = await cookies();
      cookieStore.delete('auth-token');
      return NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });
    } catch (error) {
      console.error('❌ AuthController.logout:', error);
      return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
  }
}
