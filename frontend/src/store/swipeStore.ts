import { create } from 'zustand';
import type { Candidate, SwipeFilters } from '../types';
import api from '../lib/api';

interface SwipeState {
  candidates: Candidate[];
  seenCandidates: Set<string>;
  isLoading: boolean;
  isFetching: boolean;
  hasMore: boolean;
  filters: SwipeFilters;
  fetchCandidates: () => Promise<void>;
  removeTop: () => void;
  setFilters: (f: Partial<SwipeFilters>) => void;
}

export const useSwipeStore = create<SwipeState>((set, get) => ({
  candidates: [],
  seenCandidates: new Set(),
  isLoading: false,
  isFetching: false,
  hasMore: true,
  filters: {
    gameIds: [],
    onlineOnly: false,
    rankTolerance: 2,
    timeSlotIds: [],
    playHoursStart: undefined,
    playHoursEnd: undefined,
  },

  fetchCandidates: async () => {
    const { isFetching } = get();
    if (isFetching) return;

    set({ isFetching: true, hasMore: true });
    const { filters, seenCandidates, candidates } = get();
    const params: Record<string, string> = {
      limit: '30',
      rankTolerance: String(filters.rankTolerance),
      onlineOnly: String(filters.onlineOnly),
    };
    if (filters.gameIds.length) params.gameIds = filters.gameIds.join(',');
    if (filters.timeSlotIds.length) params.timeSlotIds = filters.timeSlotIds.join(',');
    if (filters.playHoursStart !== undefined) params.playHoursStart = String(filters.playHoursStart);
    if (filters.playHoursEnd !== undefined) params.playHoursEnd = String(filters.playHoursEnd);

    try {
      const { data } = await api.get<Candidate[]>('/candidates', { params });
      const existingIds = new Set([...seenCandidates, ...candidates.map(c => c.id)]);
      const newCandidates = data.filter(c => !existingIds.has(c.id));
      const updated = [...candidates, ...newCandidates];
      set({ candidates: updated, isFetching: false, hasMore: newCandidates.length > 0 });
    } catch {
      set({ isFetching: false, hasMore: false });
    }
  },

  removeTop: () => set((s) => {
    const [first, ...rest] = s.candidates;
    if (first) {
      s.seenCandidates.add(first.id);
    }
    return { candidates: rest };
  }),

  setFilters: (f) =>
    set((s) => ({
      filters: { ...s.filters, ...f },
      candidates: [],
      seenCandidates: new Set(),
      hasMore: true,
    })),
}));
