import { NextRequest } from 'next/server';
import { AuthController } from '../../../server/modules/auth';

export async function POST(request: NextRequest) {
  return AuthController.register(request);
}
