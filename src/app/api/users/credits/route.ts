import { NextRequest } from 'next/server';
import { UserController } from '../../../server/modules/user';

export async function GET(request: NextRequest) {
  return UserController.getCredits(request);
}
