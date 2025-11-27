import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { useAuthStore } from "../stores/auth-store";

// Create axios instance with base configuration
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: "/api",
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Request interceptor to add auth headers
  client.interceptors.request.use(
    (config) => {
      try {
        const authStore = useAuthStore.getState();
        console.log("🔐 API Client: Auth store state:", {
          hasStore: !!authStore,
          hasToken: !!authStore?.token,
          token: authStore?.token
            ? `${authStore.token.substring(0, 20)}...`
            : "none",
        });

        if (authStore && authStore.token) {
          if (!config.headers) {
            config.headers = {} as any;
          }
          // @ts-ignore - Axios headers handling
          config.headers["Authorization"] = `Bearer ${authStore.token}`;
          // @ts-ignore - Axios headers handling
          config.headers["Content-Type"] = "application/json";

          console.log("✅ API Client: Added auth headers to request");
        } else {
          console.log(
            "⚠️ API Client: No token found, request will be made without auth"
          );
        }
      } catch (error) {
        console.warn("❌ API Client: Failed to get auth headers:", error);
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle auth errors
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    (error) => {
      // If we get a 401 (Unauthorized), logout the user
      if (error.response?.status === 401) {
        const authStore = useAuthStore.getState();
        authStore.logout();

        // Redirect to login page
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
};

// Export the configured client
export const apiClient = createApiClient();

// Helper functions for common HTTP methods
export const api = {
  get: <T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> => {
    return apiClient.get(url, config);
  },

  post: <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> => {
    return apiClient.post(url, data, config);
  },

  put: <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> => {
    return apiClient.put(url, data, config);
  },

  patch: <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> => {
    return apiClient.patch(url, data, config);
  },

  delete: <T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> => {
    return apiClient.delete(url, config);
  },
};

// Export the axios instance for custom configurations
export default apiClient;
