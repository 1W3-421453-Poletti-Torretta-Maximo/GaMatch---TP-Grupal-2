import { create } from 'zustand';
import type { User, UserGame } from '../types';
import api from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';

interface AuthState {
  user: User | null;
  games: UserGame[];
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  games: [],
  isLoading: true,

  login: async (token: string) => {
    localStorage.setItem('gamatch_token', token);
    const { data } = await api.get('/auth/me');
    set({ user: data.user, games: data.games, isLoading: false });
    connectSocket();
  },

  logout: () => {
    localStorage.removeItem('gamatch_token');
    disconnectSocket();
    set({ user: null, games: [], isLoading: false });
  },

  refreshProfile: async () => {
    try {
      const { data } = await api.get('/users/me');
      set({ user: data.user, games: data.games });
    } catch {
      // token expired handled by interceptor
    }
  },
}));

// Auto-restore session on load
const token = localStorage.getItem('gamatch_token');
if (token) {
  useAuthStore.getState().login(token).catch(() => {
    useAuthStore.getState().logout();
  });
} else {
  useAuthStore.setState({ isLoading: false });
}
