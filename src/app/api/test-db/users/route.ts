import { NextRequest, NextResponse } from 'next/server';
import { ensureDBConnection } from '../../../../lib/mongodb';
import User from '../../../server/models/User';

export async function GET(request: NextRequest) {
  try {
    await ensureDBConnection();
    
    // Get all users (excluding passwords)
    const users = await User.find({}).select('-password').lean();
    
    console.log('🔍 Test DB: Found users:', users);
    
    return NextResponse.json({
      success: true,
      count: users.length,
      users: users.map(user => ({
        _id: user._id,
        email: user.email,
        companyName: user.companyName,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }))
    });
    
  } catch (error) {
    console.error('❌ Test DB: Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
