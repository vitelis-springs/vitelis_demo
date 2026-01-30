import { NextRequest } from 'next/server';
import { WebhookController } from '../../../../server/modules/webhook';

export async function POST(request: NextRequest) {
  return WebhookController.salesMinerProgress(request);
}
