import { create } from 'zustand';
import type { Lobby, LobbyMessage } from '../types';
import api from '../lib/api';
import { getSocket } from '../lib/socket';

interface LobbyState {
  lobbies: Lobby[];
  activeLobbyId: string | null;
  messages: LobbyMessage[];
  typingUsers: string[];
  isLoading: boolean;
  fetchLobbies: (gameId: string) => Promise<void>;
  createLobby: (name: string, gameId: string, rankTier?: string) => Promise<Lobby | null>;
  joinLobby: (lobbyId: string) => void;
  leaveLobby: (lobbyId: string) => void;
  sendMessage: (lobbyId: string, content: string, senderName: string) => void;
  fetchMessages: (lobbyId: string) => Promise<void>;
  addMessage: (msg: LobbyMessage) => void;
  setTypingUsers: (users: string[]) => void;
}

export const useLobbyStore = create<LobbyState>((set, get) => ({
  lobbies: [],
  activeLobbyId: null,
  messages: [],
  typingUsers: [],
  isLoading: false,

  fetchLobbies: async (gameId: string) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get<Lobby[]>('/lobbies', { params: { gameId } });
      set({ lobbies: data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createLobby: async (name: string, gameId: string, rankTier = '') => {
    try {
      const { data } = await api.post<Lobby>('/lobbies', { name, gameId, rankTier });
      set((s) => ({ lobbies: [data, ...s.lobbies] }));
      return data;
    } catch {
      return null;
    }
  },

  joinLobby: async (lobbyId: string) => {
    set({ activeLobbyId: lobbyId });
    getSocket().emit('join_lobby', lobbyId);
    try { await api.post(`/lobbies/${lobbyId}/join`); } catch { /* ignore */ }
  },

  leaveLobby: (lobbyId: string) => {
    getSocket().emit('leave_lobby', lobbyId);
    set({ activeLobbyId: null, messages: [], typingUsers: [] });
  },

  sendMessage: (lobbyId: string, content: string, senderName: string) => {
    getSocket().emit('lobby_message', { lobbyId, content, senderName });
  },

  fetchMessages: async (lobbyId: string) => {
    const { data } = await api.get<LobbyMessage[]>(`/lobbies/${lobbyId}/messages`);
    set({ messages: data });
  },

  addMessage: (msg: LobbyMessage) => {
    set((s) => ({ messages: [...s.messages, msg], typingUsers: s.typingUsers.filter((id) => id !== msg.senderId) }));
  },

  setTypingUsers: (users: string[]) => {
    set({ typingUsers: users });
  },
}));
