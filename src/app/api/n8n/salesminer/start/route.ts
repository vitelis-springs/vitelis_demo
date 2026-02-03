import { NextRequest } from 'next/server';
import { N8NController } from '../../../../server/modules/n8n';

export async function POST(request: NextRequest) {
  return N8NController.startSalesMiner(request);
}
