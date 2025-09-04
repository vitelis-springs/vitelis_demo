import { NextRequest, NextResponse } from 'next/server';
import { ensureDBConnection } from '../../../../lib/mongodb';
import User from '../../../server/models/User';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
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
      
      console.log('🔍 User API: User authenticated:', { userId: payload.userId, email: payload.email, role: payload.role });
    } catch (jwtError) {
      console.error('🔍 User API: JWT validation failed:', jwtError);
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { id } = params;
    
    // Connect to database
    await ensureDBConnection();
    
    // Find user by ID (excluding password field)
    const user = await User.findById(id).select('-password').lean();
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }
    
    console.log('🔍 User API: Found user:', { id: user._id, email: user.email });
    
    return NextResponse.json({ 
      success: true, 
      data: user
    });
    
  } catch (error) {
    console.error('❌ User API: Error fetching user:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch user' 
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
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
      
      console.log('🔍 User API: User authenticated for update:', { userId: payload.userId, email: payload.email, role: payload.role });
    } catch (jwtError) {
      console.error('🔍 User API: JWT validation failed:', jwtError);
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { id } = params;
    
    // Parse request body
    const body = await request.json();
    const { email, companyName, logo, firstName, lastName, role, isActive } = body;

    // Connect to database
    await ensureDBConnection();
    
    // Find user by ID
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }

    // Check if email is being changed and if it already exists
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return NextResponse.json({ 
          success: false, 
          error: 'User with this email already exists' 
        }, { status: 409 });
      }
    }

    // Update user fields
    if (email) user.email = email.toLowerCase();
    if (companyName !== undefined) user.companyName = companyName;
    if (logo !== undefined) user.logo = logo;
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    // Save updated user
    await user.save();
    
    console.log('🔍 User API: User updated successfully:', { id: user._id, email: user.email });
    
    // Return updated user data (excluding password)
    const { password: _, ...userWithoutPassword } = user.toObject();
    return NextResponse.json({ 
      success: true, 
      data: userWithoutPassword 
    });
    
  } catch (error) {
    console.error('❌ User API: Error updating user:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update user' 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication (admin-only for deletion)
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
      
      console.log('🔍 User API: Admin user authenticated for deletion:', { userId: payload.userId, email: payload.email, role: payload.role });
    } catch (jwtError) {
      console.error('🔍 User API: JWT validation failed:', jwtError);
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { id } = params;
    
    // Connect to database
    await ensureDBConnection();
    
    // Find and delete user
    const deletedUser = await User.findByIdAndDelete(id);
    
    if (!deletedUser) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }
    
    console.log('🔍 User API: User deleted successfully:', { id: deletedUser._id, email: deletedUser.email });
    
    return NextResponse.json({ 
      success: true, 
      message: 'User deleted successfully' 
    });
    
  } catch (error) {
    console.error('❌ User API: Error deleting user:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete user' 
    }, { status: 500 });
  }
}
