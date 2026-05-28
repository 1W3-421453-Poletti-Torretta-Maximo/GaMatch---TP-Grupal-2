import { create } from 'zustand';
import type { User, UserGame, PlayHours } from '../types';
import api from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';

interface AuthState {
  user: User | null;
  games: UserGame[];
  timeSlots: string[];
  playHours: PlayHours | null;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  setAvatarSeed: (seed: string) => void;
  setTimeSlots: (slots: string[]) => void;
  setPlayHours: (hours: PlayHours | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  games: [],
  timeSlots: [],
  playHours: null,
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
    try {
      const phData = await api.get('/users/me/playhours');
      set({ playHours: phData.data });
    } catch {}
  },

  logout: () => {
    localStorage.removeItem('gamatch_token');
    disconnectSocket();
    set({ user: null, games: [], timeSlots: [], playHours: null, isLoading: false });
  },

  refreshProfile: async () => {
    try {
      const { data } = await api.get('/users/me');
      set({ user: data.user, games: data.games, playHours: data.playHours || null });
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

  setPlayHours: (hours: PlayHours | null) => {
    set({ playHours: hours });
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
