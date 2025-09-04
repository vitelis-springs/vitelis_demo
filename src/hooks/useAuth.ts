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
      console.log('🔐 Auth Hook: Starting login process...');
      console.log('🔐 Auth Hook: Credentials:', {
        email: credentials.email,
        passwordLength: credentials.password?.length || 0,
        passwordPreview: credentials.password?.substring(0, 3) + '...'
      });
      
      console.log('🔐 Auth Hook: Making API call to /auth/login...');
      const response = await api.post('/auth/login', credentials);
      console.log('✅ Auth Hook: Login API response received:', {
        status: response.status,
        statusText: response.statusText,
        hasUser: !!response.data.user,
        hasToken: !!response.data.token,
        userRole: response.data.user?.role
      });
      
      const { user, token } = response.data;
      
      // Store user data and token in global state
      console.log('🔐 Auth Hook: Storing user data in auth store...');
      login(user, token);
      console.log('✅ Auth Hook: User data stored successfully');
      
      return { success: true, user };
    } catch (error: any) {
      console.error('❌ Auth Hook: Login failed with error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        errorType: error.constructor.name,
        stack: error.stack
      });
      
      // Provide more specific error messages
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.response?.status === 401) {
        errorMessage = 'Invalid email or password. Please check your credentials.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data?.error || 'Invalid input. Please check your email and password.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.message === 'Network Error') {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      return { 
        success: false, 
        error: errorMessage
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
