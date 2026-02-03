import { NextRequest } from 'next/server';
import { ExportController } from '../../../server/modules/export';

export async function POST(request: NextRequest) {
  return ExportController.generateDocx(request);
}
