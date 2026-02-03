import { NextRequest, NextResponse } from 'next/server';
import { extractAuthFromRequest, extractAdminFromRequest } from '../../../../lib/auth';
import { ensureDBConnection } from '../../../../lib/mongodb';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';

export class UserController {
  static async getAll(request: NextRequest): Promise<NextResponse> {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const users = await UserService.getAllUsers();

      return NextResponse.json({
        success: true,
        data: users.map((user) => ({
          _id: user._id,
          email: user.email,
          companyName: user.companyName,
          logo: user.logo,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          usercases: user.usercases,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          credits: user.credits,
        })),
      });
    } catch (error) {
      console.error('❌ UserController.getAll:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch users' }, { status: 500 });
    }
  }

  static async create(request: NextRequest): Promise<NextResponse> {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const body = await request.json();
      const { email, password, companyName, logo, firstName, lastName, role, usercases, credits } = body;

      if (!email || !password) {
        return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 });
      }

      const user = await UserService.createUser({
        email: email.toLowerCase(),
        password,
        companyName: companyName?.trim(),
        logo: logo?.trim(),
        firstName: firstName?.trim(),
        lastName: lastName?.trim(),
        role: role || 'user',
        usercases: usercases || [],
        credits: credits || 0,
      });

      const { password: _, ...userWithoutPassword } = user.toObject();
      return NextResponse.json({ success: true, data: userWithoutPassword }, { status: 201 });
    } catch (error) {
      console.error('❌ UserController.create:', error);
      return NextResponse.json({ success: false, error: 'Failed to create user' }, { status: 500 });
    }
  }

  static async getById(request: NextRequest, id: string): Promise<NextResponse> {
    try {
      const auth = extractAuthFromRequest(request);
      if (!auth.success) return auth.response;

      const user = await UserService.getUserById(id);
      if (!user) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: user });
    } catch (error) {
      console.error('❌ UserController.getById:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch user' }, { status: 500 });
    }
  }

  static async update(request: NextRequest, id: string): Promise<NextResponse> {
    try {
      const auth = extractAuthFromRequest(request);
      if (!auth.success) return auth.response;

      const body = await request.json();
      const { email, companyName, logo, firstName, lastName, role, isActive, usercases, credits } = body;

      await ensureDBConnection();

      // Check email uniqueness if changing
      if (email) {
        const existing = await UserRepository.findByEmail(email);
        if (existing && String(existing._id) !== id) {
          return NextResponse.json({ success: false, error: 'User with this email already exists' }, { status: 409 });
        }
      }

      // Build update object — only include defined fields
      const updateData: Record<string, unknown> = {};
      if (email !== undefined) updateData.email = email.toLowerCase();
      if (companyName !== undefined) updateData.companyName = companyName;
      if (logo !== undefined) updateData.logo = logo;
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (role !== undefined) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (usercases !== undefined) updateData.usercases = usercases;
      if (credits !== undefined) updateData.credits = credits;

      const updated = await UserRepository.updateById(id, updateData as any);
      if (!updated) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }

      const obj = updated.toObject ? updated.toObject() : updated;
      const { password: _, ...userWithoutPassword } = obj;
      return NextResponse.json({ success: true, data: userWithoutPassword });
    } catch (error) {
      console.error('❌ UserController.update:', error);
      return NextResponse.json({ success: false, error: 'Failed to update user' }, { status: 500 });
    }
  }

  static async delete(request: NextRequest, id: string): Promise<NextResponse> {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const deleted = await UserService.deleteUser(id);
      if (!deleted) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      console.error('❌ UserController.delete:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete user' }, { status: 500 });
    }
  }

  static async getCredits(request: NextRequest): Promise<NextResponse> {
    try {
      const auth = extractAuthFromRequest(request);
      if (!auth.success) return auth.response;

      const user = await UserRepository.findByIdSelectCredits(auth.user.userId);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const shouldDisplayCredits = user.role === 'user';
      const currentCredits = user.credits ?? 0;

      return NextResponse.json({
        success: true,
        data: { shouldDisplayCredits, currentCredits, userRole: user.role },
      });
    } catch (error) {
      console.error('❌ UserController.getCredits:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch user credits information' }, { status: 500 });
    }
  }

  // TODO(human): Implement changePassword method
  // This method should:
  // 1. Extract auth from request
  // 2. Parse { currentPassword, newPassword } from body
  // 3. Validate both fields are present and newPassword >= 8 chars
  // 4. Verify currentPassword matches via bcrypt
  // 5. Hash newPassword and update via UserRepository
  // 6. Return success/failure response
  static async changePassword(request: NextRequest): Promise<NextResponse> {
    throw new Error('Not implemented');
  }
}
