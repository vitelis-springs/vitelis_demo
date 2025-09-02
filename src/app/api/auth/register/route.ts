import { NextRequest, NextResponse } from 'next/server';
import { UserServiceServer } from '../../../server/services/userService.server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, companyName, logo, firstName, lastName } = body;

    // Validate required fields
    if (!email || !password || !companyName) {
      return NextResponse.json(
        { error: 'Email, password, and company name are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Create user
    const userData = {
      email,
      password,
      companyName,
      logo,
      firstName,
      lastName,
      role: 'user' as const
    };

    const user = await UserServiceServer.createUser(userData);

    // Return user data without password
    const userResponse = {
      _id: user._id,
      email: user.email,
      companyName: user.companyName,
      logo: user.logo,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return NextResponse.json(
      { 
        message: 'User created successfully',
        user: userResponse
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Registration error:', error);
    
    if (error.message === 'User with this email already exists') {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    );
  }
}
