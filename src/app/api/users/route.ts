import { NextRequest } from 'next/server';
import { UserController } from '../../server/modules/user';

export async function GET(request: NextRequest) {
  return UserController.getAll(request);
}

export async function POST(request: NextRequest) {
  return UserController.create(request);
}
