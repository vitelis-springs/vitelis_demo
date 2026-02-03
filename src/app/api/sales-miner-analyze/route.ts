import { NextRequest } from 'next/server';
import { SalesMinerController } from '../../server/modules/sales-miner';

export async function GET(request: NextRequest) {
  return SalesMinerController.get(request);
}

export async function POST(request: NextRequest) {
  return SalesMinerController.create(request);
}

export async function DELETE(request: NextRequest) {
  return SalesMinerController.delete(request);
}
