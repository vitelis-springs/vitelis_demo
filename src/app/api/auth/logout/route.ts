import { AuthController } from '../../../server/modules/auth';

export async function POST() {
  return AuthController.logout();
}
