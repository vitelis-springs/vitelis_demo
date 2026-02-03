import { NextRequest } from 'next/server';
import { AnalyzeController } from '../../server/modules/analyze';

export async function GET(request: NextRequest) {
  return AnalyzeController.get(request);
}

export async function POST(request: NextRequest) {
  return AnalyzeController.create(request);
}

export async function DELETE(request: NextRequest) {
  return AnalyzeController.delete(request);
}
