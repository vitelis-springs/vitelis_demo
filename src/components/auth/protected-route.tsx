'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  fallback?: React.ReactNode;
}

export default function ProtectedRoute({ 
  children, 
  requiredRole, 
  fallback 
}: ProtectedRouteProps) {
  const { isAuthenticated, user, hasRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Check role requirements if specified
    if (requiredRole && !hasRole(requiredRole)) {
      router.push('/unauthorized');
      return;
    }
  }, [isAuthenticated, requiredRole, hasRole, router]);

  // Show fallback while checking authentication
  if (!isAuthenticated) {
    return fallback || (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#141414',
        color: '#d9d9d9'
      }}>
        <div>Checking authentication...</div>
      </div>
    );
  }

  // Check role requirements
  if (requiredRole && !hasRole(requiredRole)) {
    return fallback || (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#141414',
        color: '#d9d9d9'
      }}>
        <div>Access denied. Insufficient permissions.</div>
      </div>
    );
  }

  return <>{children}</>;
}
