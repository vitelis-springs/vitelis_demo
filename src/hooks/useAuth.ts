import { useCallback, useEffect } from "react";
import { api } from "../lib/api-client";
import { useAuthStore } from "../stores/auth-store";

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

let refreshIntervalId: NodeJS.Timeout | null = null;
let refreshSubscriberCount = 0;
let refreshCallback: (() => Promise<void>) | null = null;

const startRefreshInterval = () => {
  if (!refreshIntervalId) {
    refreshIntervalId = setInterval(() => {
      void refreshCallback?.();
    }, 60000);
  }
};

const stopRefreshInterval = () => {
  if (refreshIntervalId) {
    clearInterval(refreshIntervalId);
    refreshIntervalId = null;
  }
};

export const useAuth = () => {
  const { isLoggedIn, user, token, login, logout, updateUser, refreshUser } =
    useAuthStore();

  // Function to refresh user data from the server
  const refreshUserData = useCallback(async () => {
    if (!isLoggedIn || !token || !user?._id) return;

    try {
      const response = await api.get(`/users/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success && response.data.data) {
        console.log("🔄 Auth: Refreshing user data:", response.data.data);
        refreshUser(response.data.data);
      }
    } catch (error) {
      console.error("❌ Auth: Failed to refresh user data:", error);
    }
  }, [isLoggedIn, token, user?._id, refreshUser]);

  useEffect(() => {
    refreshSubscriberCount += 1;

    return () => {
      refreshSubscriberCount = Math.max(0, refreshSubscriberCount - 1);
      if (refreshSubscriberCount === 0) {
        refreshCallback = null;
        stopRefreshInterval();
      }
    };
  }, []);

  // Set up periodic refresh every 60 seconds
  useEffect(() => {
    if (isLoggedIn && token && user?._id) {
      refreshCallback = refreshUserData;
      refreshUserData();
      startRefreshInterval();
    } else {
      refreshCallback = null;
      stopRefreshInterval();
    }
  }, [isLoggedIn, token, user?._id, refreshUserData]);

  // Login function
  const handleLogin = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        const response = await api.post("/auth/login", credentials);

        const { user, token } = response.data;

        // Store user data and token in global state
        login(user, token);

        return { success: true, user };
      } catch (error: any) {
        // Provide more specific error messages
        let errorMessage = "Login failed. Please try again.";

        if (error.response?.status === 401) {
          errorMessage =
            "Invalid email or password. Please check your credentials.";
        } else if (error.response?.status === 400) {
          errorMessage =
            error.response?.data?.error ||
            "Invalid input. Please check your email and password.";
        } else if (error.response?.status === 500) {
          errorMessage = "Server error. Please try again later.";
        } else if (error.message === "Network Error") {
          errorMessage = "Network error. Please check your connection.";
        }

        return {
          success: false,
          error: errorMessage,
        };
      }
    },
    [login]
  );

  // Register function
  const handleRegister = useCallback(async (userData: RegisterData) => {
    try {
      const response = await api.post("/auth/register", userData);
      const { user } = response.data;

      return { success: true, user };
    } catch (error: any) {
      console.error("Registration failed:", error);
      return {
        success: false,
        error: error.response?.data?.error || "Registration failed",
      };
    }
  }, []);

  // Logout function
  const handleLogout = useCallback(() => {
    refreshCallback = null;
    stopRefreshInterval();

    logout();

    // Redirect to login page
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }, [logout]);

  // Check if user has specific role
  const hasRole = useCallback(
    (role: string | string[]) => {
      if (!user) return false;

      if (Array.isArray(role)) {
        return role.includes(user.role);
      }

      return user.role === role;
    },
    [user]
  );

  // Check if user is admin
  const isAdmin = useCallback(() => {
    return hasRole("admin");
  }, [hasRole]);

  // Check if user can access resource (owner or admin)
  const canAccessResource = useCallback(
    (resourceUserId: string) => {
      if (!user) return false;
      return isAdmin() || user._id === resourceUserId;
    },
    [user, isAdmin]
  );

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
