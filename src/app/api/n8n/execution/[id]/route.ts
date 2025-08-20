import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: executionId } = await params;
    
    if (!executionId) {
      return NextResponse.json(
        { success: false, message: 'Execution ID is required' },
        { status: 400 }
      );
    }

    const n8nApiUrl = process.env.N8N_API_URL || 'https://vitelis.app.n8n.cloud/';
    const n8nApiKey = process.env.N8N_API_KEY;

    if (!n8nApiKey) {
      return NextResponse.json(
        { success: false, message: 'N8N API key not configured' },
        { status: 500 }
      );
    }

    console.log('🔄 Server: Fetching N8N execution details for ID:', executionId);
    
    const response = await fetch(`${n8nApiUrl}api/v1/executions/${executionId}?includeData=true`, {
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey
      }
    });

    if (!response.ok) {
      console.error('❌ Server: N8N API error:', response.status, response.statusText);
      return NextResponse.json(
        { success: false, message: `N8N API error: ${response.status}` },
        { status: response.status }
      );
    }

    const execution = await response.json();
    console.log('✅ Server: N8N execution details received:', execution.customData);

    return NextResponse.json({
      success: true,
      data: {
        id: execution.id,
        finished: execution.finished || false,
        mode: execution.mode || 'manual',
        retryOf: execution.retryOf || null,
        retrySuccessId: execution.retrySuccessId || null,
        status: execution.status,
        createdAt: execution.createdAt || execution.startedAt || new Date().toISOString(),
        startedAt: execution.startedAt || new Date().toISOString(),
        stoppedAt: execution.stoppedAt || null,
        customData: execution.customData || {},
        data: execution.data
      }
    });

  } catch (error) {
    console.error('❌ Server: Error fetching N8N execution details:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
