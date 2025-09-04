import { useCallback, useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/auth-store';
import { api } from '../lib/api-client';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  companyName: string;
  logo?: string;
  firstName?: string;
  lastName?: string;
}

export const useAuth = () => {
  const { 
    isLoggedIn, 
    user, 
    token, 
    login, 
    logout, 
    updateUser,
    refreshUser
  } = useAuthStore();

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Function to refresh user data from the server
  const refreshUserData = useCallback(async () => {
    if (!isLoggedIn || !token || !user?._id) return;
    
    try {
      const response = await api.get(`/users/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success && response.data.data) {
        console.log('🔄 Auth: Refreshing user data:', response.data.data);
        refreshUser(response.data.data);
      }
    } catch (error) {
      console.error('❌ Auth: Failed to refresh user data:', error);
    }
  }, [isLoggedIn, token, user?._id, refreshUser]);

  // Set up periodic refresh every 30 seconds
  useEffect(() => {
    if (isLoggedIn && token && user?._id) {
      // Initial refresh
      refreshUserData();
      
      // Set up interval for periodic refresh
      refreshIntervalRef.current = setInterval(refreshUserData, 30000); // 30 seconds
      
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
      };
    }
  }, [isLoggedIn, token, user?._id, refreshUserData]);

  // Login function
  const handleLogin = useCallback(async (credentials: LoginCredentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      const { user, token } = response.data;
      
      // Store user data and token in global state
      login(user, token);
      
      return { success: true, user };
    } catch (error: any) {
      console.error('Login failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  }, [login]);

  // Register function
  const handleRegister = useCallback(async (userData: RegisterData) => {
    try {
      const response = await api.post('/auth/register', userData);
      const { user } = response.data;
      
      return { success: true, user };
    } catch (error: any) {
      console.error('Registration failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed' 
      };
    }
  }, []);

  // Logout function
  const handleLogout = useCallback(() => {
    // Clear refresh interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    
    logout();
    
    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, [logout]);

  // Check if user has specific role
  const hasRole = useCallback((role: string | string[]) => {
    if (!user) return false;
    
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    
    return user.role === role;
  }, [user]);

  // Check if user is admin
  const isAdmin = useCallback(() => {
    return hasRole('admin');
  }, [hasRole]);

  // Check if user can access resource (owner or admin)
  const canAccessResource = useCallback((resourceUserId: string) => {
    if (!user) return false;
    return isAdmin() || user._id === resourceUserId;
  }, [user, isAdmin]);

  return {
    // State
    isLoggedIn,
    user,
    token,
    
    // Actions
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    updateUser,
    refreshUserData,
    
    // Utilities
    hasRole,
    isAdmin,
    canAccessResource,
    
    // Computed values
    isAuthenticated: isLoggedIn && !!user && !!token,
  };
};
