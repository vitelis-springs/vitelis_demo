import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api-client";

export interface User {
  _id: string;
  email: string;
  companyName?: string;
  logo?: string;
  firstName?: string;
  lastName?: string;
  role: "user" | "admin";
  isActive: boolean;
  lastLogin?: string;
  usercases?: string[];
  createdAt: string;
  updatedAt: string;
  credits?: number;
}

export interface CreateUserData {
  email: string;
  password: string;
  companyName?: string;
  logo?: string;
  firstName?: string;
  lastName?: string;
  role: "user" | "admin";
  usercases?: string[];
  credits?: number;
}

export interface UpdateUserData {
  email?: string;
  companyName?: string;
  logo?: string;
  firstName?: string;
  lastName?: string;
  role?: "user" | "admin";
  isActive?: boolean;
  usercases?: string[];
  credits?: number;
}

export interface UserCreditsInfo {
  shouldDisplayCredits: boolean;
  currentCredits: number;
  userRole: "user" | "admin";
}

const usersApi = {
  async getAll(): Promise<User[]> {
    const response = await api.get("/users");
    return response.data.data || response.data;
  },

  async getById(userId: string): Promise<User> {
    const response = await api.get(`/users/${userId}`);
    return response.data.data || response.data;
  },

  async create(userData: CreateUserData): Promise<User> {
    const response = await api.post("/users", userData);
    return response.data.data || response.data;
  },

  async update(userId: string, userData: UpdateUserData): Promise<User> {
    const response = await api.put(`/users/${userId}`, userData);
    return response.data.data || response.data;
  },

  async delete(userId: string): Promise<boolean> {
    const response = await api.delete(`/users/${userId}`);
    return response.data.success;
  },

  async toggleStatus(userId: string, isActive: boolean): Promise<User> {
    const response = await api.patch(`/users/${userId}/status`, { isActive });
    return response.data.data || response.data;
  },

  async getCreditsInfo(): Promise<UserCreditsInfo> {
    const response = await api.get("/users/credits");
    return response.data.data || response.data;
  },
};

// React Query hooks
export const useGetUsers = () => {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => usersApi.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useGetUser = (
  userId: string | null,
  options?: { enabled?: boolean; staleTime?: number }
) => {
  return useQuery({
    queryKey: ["users", userId],
    queryFn: () => {
      if (!userId) throw new Error("User ID is required");
      return usersApi.getById(userId);
    },
    enabled: !!userId,
    ...options,
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: CreateUserData) => usersApi.create(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      userData,
    }: {
      userId: string;
      userData: UpdateUserData;
    }) => usersApi.update(userId, userData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", data._id] });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => usersApi.delete(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

export const useToggleUserStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      usersApi.toggleStatus(userId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

export const useGetUserCredits = (options?: {
  enabled?: boolean;
  staleTime?: number;
}) => {
  return useQuery({
    queryKey: ["users", "credits"],
    queryFn: () => usersApi.getCreditsInfo(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

export default usersApi;
