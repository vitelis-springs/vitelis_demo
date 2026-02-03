import { NextRequest } from 'next/server';
import { WebhookController } from '../../../../../server/modules/webhook';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return WebhookController.salesMinerResult(request, id);
}
