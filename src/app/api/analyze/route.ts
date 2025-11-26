import { NextRequest, NextResponse } from 'next/server';
import { AnalyzeServiceServer } from '../../server/services/analyzeService.server';
import { CreditsServiceServer } from '../../server/services/creditsService.server';

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


    if (id) {
      // Get specific analyze by ID
      const analyze = await AnalyzeServiceServer.getAnalyzeById(id);
      if (!analyze) {
        return NextResponse.json(
          { error: 'Analyze record not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(analyze);
    }

    if (userId) {
      // Get all analyzes for a user
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');
      const result = await AnalyzeServiceServer.getAnalyzesByUser(userId, page, limit);

      return NextResponse.json(result);
    }

    // Get all analyzes (admin)
    const analyzes = await AnalyzeServiceServer.getAllAnalyzes();
    return NextResponse.json(analyzes);

  } catch (error) {
    console.error('Error in GET /api/analyze:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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

    } catch (jwtError) {
      console.error('📝 API: JWT validation failed:', jwtError);
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { analyzeId, ...data } = body;

    // Extract user ID from JWT token
    const tokenParts = token.split('.');
    const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const userId = payload.userId;
    const userRole = payload.role;

    if (analyzeId) {
      // Update existing analyze
      const updatedAnalyze = await AnalyzeServiceServer.updateAnalyze(analyzeId, data);

      if (!updatedAnalyze) {
        return NextResponse.json(
          { error: 'Analyze record not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(updatedAnalyze);
    } else {
      // Create new analyze with user ID
      const analyzeDataWithUser = { ...data, user: userId };
      const newAnalyze = await AnalyzeServiceServer.createAnalyze(analyzeDataWithUser);

      // Deduct credits after successful creation (only for users with role "user")
      if (userRole === "user" && newAnalyze) {
        const creditsDeducted = await CreditsServiceServer.deductCredits(userId, 1);
        if (!creditsDeducted) {
          console.error("❌ API: Failed to deduct credits after creating analysis");
          // Note: We don't rollback the analysis creation here as it's already created
          // In a production environment, you might want to implement transaction rollback
        }
      }

      return NextResponse.json(newAnalyze);
    }

  } catch (error) {
    console.error('Error in POST /api/analyze:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    const deleted = await AnalyzeServiceServer.deleteAnalyze(id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Analyze record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Analyze record deleted' });

  } catch (error) {
    console.error('Error in DELETE /api/analyze:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
