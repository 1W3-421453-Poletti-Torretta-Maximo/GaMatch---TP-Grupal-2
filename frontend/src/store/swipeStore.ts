import { create } from 'zustand';
import type { Candidate, SwipeFilters } from '../types';
import api from '../lib/api';

interface SwipeState {
  candidates: Candidate[];
  seenCandidates: Set<string>; // Track de candidatos ya vistos
  isLoading: boolean;
  isFetching: boolean; // Evitar refetch simultáneo
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
  filters: {
    gameIds: [],
    onlineOnly: false,
    rankTolerance: 2,
  },

  fetchCandidates: async () => {
    const { isFetching } = get();
    // Evitar múltiples fetches simultáneos
    if (isFetching) return;

    set({ isFetching: true });
    const { filters, seenCandidates, candidates } = get();
    const params: Record<string, string> = {
      limit: '30', // Aumentar límite para tener más buffer
      rankTolerance: String(filters.rankTolerance),
      onlineOnly: String(filters.onlineOnly),
    };
    if (filters.gameIds.length) params.gameIds = filters.gameIds.join(',');

    try {
      const { data } = await api.get<Candidate[]>('/candidates', { params });
      // Filtrar candidatos ya vistos/swiped
      const newCandidates = data.filter(c => !seenCandidates.has(c.id));
      // Mantener candidatos actuales + agregar nuevos al final
      const updated = [...candidates, ...newCandidates];
      set({ candidates: updated, isFetching: false });
    } catch (error) {
      set({ isFetching: false });
      throw error;
    }
  },

  removeTop: () => set((s) => {
    const [first, ...rest] = s.candidates;
    if (first) {
      // Agregar el candidato removido al set de vistos
      s.seenCandidates.add(first.id);
    }
    return { candidates: rest };
  }),

  setFilters: (f) =>
    set((s) => ({ filters: { ...s.filters, ...f } })),
}));
