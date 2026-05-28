import { create } from 'zustand';
import type { User, UserGame } from '../types';
import api from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';

interface AuthState {
  user: User | null;
  games: UserGame[];
  timeSlots: string[];
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  setAvatarSeed: (seed: string) => void;
  setTimeSlots: (slots: string[]) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  games: [],
  timeSlots: [],
  isLoading: true,

  login: async (token: string) => {
    localStorage.setItem('gamatch_token', token);
    const { data } = await api.get('/auth/me');
    set({ user: data.user, games: data.games, isLoading: false });
    connectSocket();
    try {
      const tsData = await api.get('/users/me/timeslots');
      set({ timeSlots: (tsData.data as { id: string }[]).map((ts) => ts.id) });
    } catch {}
  },

  logout: () => {
    localStorage.removeItem('gamatch_token');
    disconnectSocket();
    set({ user: null, games: [], timeSlots: [], isLoading: false });
  },

  refreshProfile: async () => {
    try {
      const { data } = await api.get('/users/me');
      set({ user: data.user, games: data.games });
      const tsData = await api.get('/users/me/timeslots');
      set({ timeSlots: (tsData.data as { id: string }[]).map((ts) => ts.id) });
    } catch {
      // token expired handled by interceptor
    }
  },

  setAvatarSeed: (seed: string) => {
    set((s) => ({
      user: s.user ? { ...s.user, avatarSeed: seed } : null,
    }));
  },

  setTimeSlots: (slots: string[]) => {
    set({ timeSlots: slots });
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
