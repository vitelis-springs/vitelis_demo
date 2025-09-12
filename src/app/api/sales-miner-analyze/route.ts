import { NextRequest, NextResponse } from 'next/server';
import { SalesMinerAnalyzeServiceServer } from '../../server/services/salesMinerAnalyzeService.server';

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
    const executionId = searchParams.get('executionId');
    
    console.log('🔍 API: GET request received with params:', { id, userId, executionId });

    if (id) {
      // Get specific sales miner analyze by ID
      const salesMinerAnalyze = await SalesMinerAnalyzeServiceServer.getSalesMinerAnalyzeById(id);
      if (!salesMinerAnalyze) {
        return NextResponse.json(
          { error: 'Sales miner analyze record not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(salesMinerAnalyze);
    }

    if (executionId) {
      // Get sales miner analyze by execution ID
      const salesMinerAnalyze = await SalesMinerAnalyzeServiceServer.getSalesMinerAnalyzeByExecutionId(executionId);
      if (!salesMinerAnalyze) {
        return NextResponse.json(
          { error: 'Sales miner analyze record not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(salesMinerAnalyze);
    }

    if (userId) {
      // Get all sales miner analyzes for a user
      console.log('👤 API: Fetching sales miner analyzes for user:', userId);
      console.log('🔍 API: Query parameter userId:', userId);
      console.log('🔍 API: Query parameter type:', typeof userId);
      
      const salesMinerAnalyzes = await SalesMinerAnalyzeServiceServer.getSalesMinerAnalyzesByUser(userId);
      console.log('📊 API: Found sales miner analyzes:', salesMinerAnalyzes.length);
      console.log('📊 API: Sales miner analyzes data:', salesMinerAnalyzes);
      
      return NextResponse.json(salesMinerAnalyzes);
    }

    // Get all sales miner analyzes (admin)
    const salesMinerAnalyzes = await SalesMinerAnalyzeServiceServer.getSalesMinerAnalyzesByUser('all');
    return NextResponse.json(salesMinerAnalyzes);

  } catch (error) {
    console.error('Error in GET /api/sales-miner-analyze:', error);
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

    // Extract user ID from JWT token
    const tokenParts = token.split('.');
    const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const userId = payload.userId;
    console.log('👤 API: Creating/updating sales miner analyze for user:', userId);

    if (analyzeId) {
      // Update existing sales miner analyze
      console.log('🔄 API: Updating sales miner analyze with ID:', analyzeId);
      const updatedSalesMinerAnalyze = await SalesMinerAnalyzeServiceServer.updateSalesMinerAnalyze(analyzeId, data);
      console.log('📥 API: Update result from service:', updatedSalesMinerAnalyze);
      
      if (!updatedSalesMinerAnalyze) {
        console.log('❌ API: Sales miner analyze record not found');
        return NextResponse.json(
          { error: 'Sales miner analyze record not found' },
          { status: 404 }
        );
      }
      console.log('✅ API: Update successful, returning:', updatedSalesMinerAnalyze);
      return NextResponse.json(updatedSalesMinerAnalyze);
    } else {
      // Create new sales miner analyze with user ID
      console.log('🆕 API: Creating new sales miner analyze for user:', userId);
      const salesMinerAnalyzeDataWithUser = { ...data, user: userId };
      console.log('📝 API: Creating sales miner analyze with data:', salesMinerAnalyzeDataWithUser);
      const newSalesMinerAnalyze = await SalesMinerAnalyzeServiceServer.createSalesMinerAnalyze(salesMinerAnalyzeDataWithUser);
      return NextResponse.json(newSalesMinerAnalyze);
    }

  } catch (error) {
    console.error('Error in POST /api/sales-miner-analyze:', error);
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

    const deleted = await SalesMinerAnalyzeServiceServer.deleteSalesMinerAnalyze(id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Sales miner analyze record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Sales miner analyze record deleted' });

  } catch (error) {
    console.error('Error in DELETE /api/sales-miner-analyze:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
