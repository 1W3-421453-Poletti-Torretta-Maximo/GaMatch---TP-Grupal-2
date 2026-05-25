import { create } from 'zustand';
import type { Candidate, SwipeFilters } from '../types';
import api from '../lib/api';

interface SwipeState {
  candidates: Candidate[];
  seenCandidates: Map<string, number>;
  isLoading: boolean;
  isFetching: boolean;
  filters: SwipeFilters;
  fetchCandidates: () => Promise<void>;
  removeTop: () => void;
  setFilters: (f: Partial<SwipeFilters>) => void;
}

export const useSwipeStore = create<SwipeState>((set, get) => ({
  candidates: [],
  seenCandidates: new Map(),
  isLoading: false,
  isFetching: false,
  filters: {
    gameIds: [],
    onlineOnly: false,
    rankTolerance: 2,
  },

  fetchCandidates: async () => {
    const { isFetching } = get();
    if (isFetching) return;

    set({ isFetching: true });
    const { filters, seenCandidates, candidates } = get();
    const params: Record<string, string> = {
      limit: '30',
      rankTolerance: String(filters.rankTolerance),
      onlineOnly: String(filters.onlineOnly),
    };
    if (filters.gameIds.length) params.gameIds = filters.gameIds.join(',');

    try {
      const { data } = await api.get<Candidate[]>('/candidates', { params });
      const now = Date.now();
      const COOLDOWN_MS = 30000;
      const newCandidates = data.filter(c => {
        const seenTime = seenCandidates.get(c.id);
        return seenTime === undefined || (now - seenTime) >= COOLDOWN_MS;
      });
      const updated = [...candidates, ...newCandidates];
      set({ candidates: updated, isFetching: false });
    } catch {
      set({ isFetching: false });
    }
  },

  removeTop: () => set((s) => {
    const [first, ...rest] = s.candidates;
    if (first) {
      s.seenCandidates.set(first.id, Date.now());
    }
    return { candidates: rest };
  }),

  setFilters: (f) =>
    set((s) => ({
      filters: { ...s.filters, ...f },
      candidates: [],
      seenCandidates: new Map(),
    })),
}));
