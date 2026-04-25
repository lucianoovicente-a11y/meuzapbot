import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (tokenId: string, userInfo: any) => Promise<void>;
  register: (data: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        const response = await api.login(email, password);
        set({ 
          user: response.user, 
          token: response.token, 
          isAuthenticated: true 
        });
      },

      loginWithGoogle: async (tokenId: string, userInfo: any) => {
        const response = await api.loginWithGoogle(tokenId, userInfo);
        set({ 
          user: response.user, 
          token: response.token, 
          isAuthenticated: true 
        });
      },

      register: async (data) => {
        const response = await api.register(data);
        set({ 
          user: response.user, 
          token: response.token, 
          isAuthenticated: true 
        });
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      }
    }),
    {
      name: 'kbot-auth'
    }
  )
);
