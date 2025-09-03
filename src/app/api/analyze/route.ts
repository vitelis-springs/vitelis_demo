import { NextRequest, NextResponse } from 'next/server';
import { AnalyzeServiceServer } from '../../server/services/analyzeService.server';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Basic JWT validation
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid JWT format');
      }
      
      const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));
      
      // Check if token is expired
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        throw new Error('Token expired');
      }
      
      console.log('🔍 API: Authenticated user:', { userId: payload.userId, email: payload.email, role: payload.role });
    } catch (jwtError) {
      console.error('🔍 API: JWT validation failed:', jwtError);
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');
    
    console.log('🔍 API: GET request received with params:', { id, userId });

    if (id) {
      // Get specific analyze by ID
      const analyze = await AnalyzeServiceServer.getAnalyzeById(id);
      if (!analyze) {
        return NextResponse.json(
          { success: false, message: 'Analyze record not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: analyze });
    }

    if (userId) {
      // Get all analyzes for a user
      console.log('👤 API: Fetching analyzes for user:', userId);
      console.log('🔍 API: Query parameter userId:', userId);
      console.log('🔍 API: Query parameter type:', typeof userId);
      
      const analyzes = await AnalyzeServiceServer.getAnalyzesByUser(userId);
      console.log('📊 API: Found analyzes:', analyzes.length);
      console.log('📊 API: Analyzes data:', analyzes);
      
      return NextResponse.json({ success: true, data: analyzes });
    }

    // Get all analyzes (admin)
    const analyzes = await AnalyzeServiceServer.getAllAnalyzes();
    return NextResponse.json({ success: true, data: analyzes });

  } catch (error) {
    console.error('Error in GET /api/analyze:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Basic JWT validation
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid JWT format');
      }
      
      const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));
      
      // Check if token is expired
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        throw new Error('Token expired');
      }
      
      console.log('📝 API: Authenticated user:', { userId: payload.userId, email: payload.email, role: payload.role });
    } catch (jwtError) {
      console.error('📝 API: JWT validation failed:', jwtError);
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    console.log('📝 API: POST request received');
    const body = await request.json();
    const { analyzeId, ...data } = body;
    console.log('📝 API: Request body parsed:', { analyzeId, data });

    if (analyzeId) {
      // Update existing analyze
      console.log('🔄 API: Updating analyze with ID:', analyzeId);
      const updatedAnalyze = await AnalyzeServiceServer.updateAnalyze(analyzeId, data);
      console.log('📥 API: Update result from service:', updatedAnalyze);
      
      if (!updatedAnalyze) {
        console.log('❌ API: Analyze record not found');
        return NextResponse.json(
          { success: false, message: 'Analyze record not found' },
          { status: 404 }
        );
      }
      console.log('✅ API: Update successful, returning:', updatedAnalyze);
      return NextResponse.json({ success: true, data: updatedAnalyze });
    } else {
      // Create new analyze
      console.log('🆕 API: Creating new analyze');
      const newAnalyze = await AnalyzeServiceServer.createAnalyze(data);
      return NextResponse.json({ success: true, data: newAnalyze });
    }

  } catch (error) {
    console.error('Error in POST /api/analyze:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Basic JWT validation
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid JWT format');
      }
      
      const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));
      
      // Check if token is expired
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        throw new Error('Token expired');
      }
      
      console.log('🗑️ API: Authenticated user:', { userId: payload.userId, email: payload.email, role: payload.role });
    } catch (jwtError) {
      console.error('🗑️ API: JWT validation failed:', jwtError);
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID is required' },
        { status: 400 }
      );
    }

    const deleted = await AnalyzeServiceServer.deleteAnalyze(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: 'Analyze record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Analyze record deleted' });

  } catch (error) {
    console.error('Error in DELETE /api/analyze:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
