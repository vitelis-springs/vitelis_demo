import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

export interface UserInfo {
  userId: string;
  email: string;
  role: string;
}

// Extract user info from request headers (set by middleware)
export function getUserFromRequest(request: NextRequest): UserInfo | null {
  const userId = request.headers.get('x-user-id');
  const email = request.headers.get('x-user-email');
  const role = request.headers.get('x-user-role');

  if (!userId || !email || !role) {
    return null;
  }

  return {
    userId,
    email,
    role
  };
}

// Verify JWT token manually (for cases where middleware isn't used)
export function verifyToken(token: string): UserInfo | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };
  } catch (error) {
    return null;
  }
}

// Check if user has required role
export function hasRole(userInfo: UserInfo | null, requiredRole: string | string[]): boolean {
  if (!userInfo) return false;
  
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(userInfo.role);
  }
  
  return userInfo.role === requiredRole;
}

// Check if user is admin
export function isAdmin(userInfo: UserInfo | null): boolean {
  return hasRole(userInfo, 'admin');
}

// Check if user can access resource (owner or admin)
export function canAccessResource(userInfo: UserInfo | null, resourceUserId: string): boolean {
  if (!userInfo) return false;
  
  return isAdmin(userInfo) || userInfo.userId === resourceUserId;
}
