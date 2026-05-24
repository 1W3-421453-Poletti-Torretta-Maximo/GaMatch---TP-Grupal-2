import { create } from 'zustand';
import type { Candidate, SwipeFilters } from '../types';
import api from '../lib/api';

interface SwipeState {
  candidates: Candidate[];
  isLoading: boolean;
  filters: SwipeFilters;
  fetchCandidates: () => Promise<void>;
  removeTop: () => void;
  setFilters: (f: Partial<SwipeFilters>) => void;
}

export const useSwipeStore = create<SwipeState>((set, get) => ({
  candidates: [],
  isLoading: false,
  filters: {
    gameIds: [],
    onlineOnly: false,
    rankTolerance: 2,
  },

  fetchCandidates: async () => {
    set({ isLoading: true });
    const { filters } = get();
    const params: Record<string, string> = {
      limit: '15',
      rankTolerance: String(filters.rankTolerance),
      onlineOnly: String(filters.onlineOnly),
    };
    if (filters.gameIds.length) params.gameIds = filters.gameIds.join(',');

    const { data } = await api.get<Candidate[]>('/candidates', { params });
    set({ candidates: data, isLoading: false });
  },

  removeTop: () => set((s) => ({ candidates: s.candidates.slice(1) })),

  setFilters: (f) =>
    set((s) => ({ filters: { ...s.filters, ...f } })),
}));
