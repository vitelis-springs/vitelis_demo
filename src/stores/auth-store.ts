import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isLoggedIn: boolean;
  email: string;
  login: (email: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      email: '',
      login: (email: string) => set({ isLoggedIn: true, email }),
      logout: () => set({ isLoggedIn: false, email: '' }),
    }),
    {
      name: 'auth-storage', // unique name for localStorage key
    }
  )
);
