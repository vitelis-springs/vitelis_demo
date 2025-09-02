import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  _id: string;
  email: string;
  companyName: string;
  logo?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: boolean;
}

interface AuthState {
  isLoggedIn: boolean;
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      user: null,
      token: null,
      login: (user: User, token: string) => {
        console.log('🔐 Auth Store: Login called with:', { user: user.email, token: token ? `${token.substring(0, 20)}...` : 'none' });
        set({ 
          isLoggedIn: true, 
          user, 
          token 
        });
        console.log('✅ Auth Store: Login state updated');
      },
      logout: () => set({ 
        isLoggedIn: false, 
        user: null, 
        token: null 
      }),
      updateUser: (userData: Partial<User>) => set((state) => ({
        user: state.user ? { ...state.user, ...userData } : null
      }))
    }),
    {
      name: 'auth-storage', // unique name for localStorage key
    }
  )
);
