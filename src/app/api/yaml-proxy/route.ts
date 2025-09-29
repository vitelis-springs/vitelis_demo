import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const yamlUrl = searchParams.get('url');

    if (!yamlUrl) {
      return NextResponse.json({
        success: false,
        error: 'Missing yamlUrl parameter'
      }, { status: 400 });
    }

    // Validate that the URL is from your S3 bucket for security
    const allowedDomains = [
      'vitelis-temp.s3.us-east-1.amazonaws.com',
      's3.us-east-1.amazonaws.com'
    ];
    
    const url = new URL(yamlUrl);
    if (!allowedDomains.some(domain => url.hostname.includes(domain))) {
      return NextResponse.json({
        success: false,
        error: 'Invalid YAML URL domain'
      }, { status: 400 });
    }

    // Fetch the YAML file from S3
    const response = await fetch(yamlUrl);
    
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Failed to fetch YAML file: ${response.statusText}`
      }, { status: response.status });
    }

    const yamlContent = await response.text();

    // Return the YAML content with proper headers
    return new NextResponse(yamlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/yaml',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('❌ YAML Proxy: Error fetching YAML file:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

