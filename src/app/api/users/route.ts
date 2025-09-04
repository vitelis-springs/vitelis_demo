import { NextRequest, NextResponse } from 'next/server';
import { ensureDBConnection } from '../../../lib/mongodb';
import User from '../../server/models/User';
import { UserServiceServer } from '../../server/services/userService.server';

export async function GET(request: NextRequest) {
  try {
    // Check authentication (admin-only)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    try {
      // Basic JWT structure validation
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) { 
        throw new Error('Invalid JWT format'); 
      }
      
      const payload = JSON.parse(Buffer.from(tokenParts[1] || '', 'base64').toString());
      if (payload.exp && payload.exp * 1000 < Date.now()) { 
        throw new Error('Token expired'); 
      }
      
      // Check if user is admin
      if (payload.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
      
      console.log('🔍 Users API: Admin user authenticated:', { userId: payload.userId, email: payload.email, role: payload.role });
    } catch (jwtError) {
      console.error('🔍 Users API: JWT validation failed:', jwtError);
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Connect to database
    await ensureDBConnection();
    
    // Fetch all users (excluding password field)
    const users = await User.find({}).select('-password').lean();
    
    console.log('🔍 Users API: Found users:', users.length);
    
    return NextResponse.json({ 
      success: true, 
      data: users.map(user => ({
        _id: user._id,
        email: user.email,
        companyName: user.companyName,
        logo: user.logo,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }))
    });
    
  } catch (error) {
    console.error('❌ Users API: Error fetching users:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch users' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication (admin-only)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    try {
      // Basic JWT structure validation
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) { 
        throw new Error('Invalid JWT format'); 
      }
      
      const payload = JSON.parse(Buffer.from(tokenParts[1] || '', 'base64').toString());
      if (payload.exp && payload.exp * 1000 < Date.now()) { 
        throw new Error('Token expired'); 
      }
      
      // Check if user is admin
      if (payload.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
      
      console.log('🔍 Users API: Admin user authenticated for creation:', { userId: payload.userId, email: payload.email, role: payload.role });
    } catch (jwtError) {
      console.error('🔍 Users API: JWT validation failed:', jwtError);
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { email, password, companyName, logo, firstName, lastName, role } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json({ 
        success: false, 
        error: 'Email and password are required' 
      }, { status: 400 });
    }

    // Connect to database
    await ensureDBConnection();
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ 
        success: false, 
        error: 'User with this email already exists' 
      }, { status: 409 });
    }

    // Create new user using UserService for proper password hashing
    const userData = {
      email: email.toLowerCase(),
      password,
      companyName: companyName?.trim(),
      logo: logo?.trim(),
      firstName: firstName?.trim(),
      lastName: lastName?.trim(),
      role: role || 'user'
    };

    console.log('🔍 Users API: Creating user with data:', userData);

    // Use UserService to create user with hashed password
    const user = await UserServiceServer.createUser(userData);
    
    console.log('🔍 Users API: User created successfully:', { email: user.email, role: user.role });
    
    // Return user data (excluding password)
    const { password: _, ...userWithoutPassword } = user.toObject();
    return NextResponse.json({ 
      success: true, 
      data: userWithoutPassword 
    }, { status: 201 });
    
  } catch (error) {
    console.error('❌ Users API: Error creating user:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create user' 
      
    }, { status: 500 });
  }
}


