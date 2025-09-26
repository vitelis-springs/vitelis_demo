import { NextRequest, NextResponse } from 'next/server';
import { ensureDBConnection } from '../../../../lib/mongodb';
import User from '../../../server/models/User';

export async function POST(request: NextRequest) {
  try {
    await ensureDBConnection();
    
    // Force create a root user
    const rootUser = new User({
      email: 'root@example.com',
      password: 'root123', // In production, this should be hashed
      role: 'admin',
      isActive: true
    });
    
    await rootUser.save();
    
    console.log('✅ Test DB: Root user created successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Root user created successfully',
      user: {
        _id: rootUser._id,
        email: rootUser.email,
        role: rootUser.role,
        isActive: rootUser.isActive
      }
    });
    
  } catch (error) {
    console.error('❌ Test DB: Error creating root user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create root user' },
      { status: 500 }
    );
  }
}