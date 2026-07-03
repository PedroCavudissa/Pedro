import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: any | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: any, token: string) => void;
  logout: () => void;
  setAuth: (user: any, token: string) => void;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      login: (user, token) => {
        set({ user, token, isAuthenticated: true });
      },
      
      logout: () => {
        // Limpa todos os dados do usuário
        set({ user: null, token: null, isAuthenticated: false });
        
        // Limpa todos os caches do localStorage
        localStorage.removeItem('hotel_register_cache');
        localStorage.removeItem('email_verificacao');
        localStorage.removeItem('hotel-auth'); 
        
     
      },
      
      setAuth: (user, token) => {
        set({ user, token, isAuthenticated: true });
      },
    }),
    {
      name: 'hotel-auth', 
      getStorage: () => localStorage,
    }
  )
);

export default useAuthStore;