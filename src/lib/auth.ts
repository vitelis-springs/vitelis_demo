import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export interface UserInfo {
  userId: string;
  email: string;
  role: string;
}

export type AuthResult =
  | { success: true; user: UserInfo }
  | { success: false; response: NextResponse };

/**
 * Extracts and validates Bearer token from request.
 * Returns UserInfo on success or a ready-to-return NextResponse on failure.
 */
export function extractAuthFromRequest(request: NextRequest): AuthResult {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      success: false,
      response: NextResponse.json({ error: 'Access token required' }, { status: 401 }),
    };
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      email: string;
      role: string;
      exp?: number;
    };

    return {
      success: true,
      user: {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      },
    };
  } catch {
    return {
      success: false,
      response: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }),
    };
  }
}

/**
 * Extracts auth and checks for admin role.
 * Returns a 403 if the user is not an admin.
 */
export function extractAdminFromRequest(request: NextRequest): AuthResult {
  const result = extractAuthFromRequest(request);
  if (!result.success) return result;

  if (result.user.role !== 'admin') {
    return {
      success: false,
      response: NextResponse.json({ error: 'Admin access required' }, { status: 403 }),
    };
  }

  return result;
}

// Keep existing helpers for backwards compatibility during migration
export function getUserFromRequest(request: NextRequest): UserInfo | null {
  const userId = request.headers.get('x-user-id');
  const email = request.headers.get('x-user-email');
  const role = request.headers.get('x-user-role');

  if (!userId || !email || !role) {
    return null;
  }

  return { userId, email, role };
}

export function verifyToken(token: string): UserInfo | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
  } catch {
    return null;
  }
}

export function hasRole(userInfo: UserInfo | null, requiredRole: string | string[]): boolean {
  if (!userInfo) return false;
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(userInfo.role);
  }
  return userInfo.role === requiredRole;
}

export function isAdmin(userInfo: UserInfo | null): boolean {
  return hasRole(userInfo, 'admin');
}

export function canAccessResource(userInfo: UserInfo | null, resourceUserId: string): boolean {
  if (!userInfo) return false;
  return isAdmin(userInfo) || userInfo.userId === resourceUserId;
}
