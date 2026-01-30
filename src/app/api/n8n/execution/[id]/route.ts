import { NextRequest } from 'next/server';
import { N8NController } from '../../../../server/modules/n8n';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return N8NController.getExecution(request, id);
}
