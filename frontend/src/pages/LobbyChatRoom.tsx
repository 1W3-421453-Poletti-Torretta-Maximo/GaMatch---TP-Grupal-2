import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, LogOut } from 'lucide-react';
import type { Lobby } from '../types';
import api from '../lib/api';
import { LobbyChat } from '../components/LobbyChat/LobbyChat';
import { useLobbyStore } from '../store/lobbyStore';

export default function LobbyChatRoom() {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const navigate = useNavigate();
  const { leaveLobby } = useLobbyStore();

  const handleLeave = async () => {
    if (!lobbyId) return;
    try { await api.delete(`/lobbies/${lobbyId}/join`); } catch {}
    leaveLobby(lobbyId);
    navigate('/matches');
  };

  useEffect(() => {
    if (!lobbyId) return;
    api.get<Lobby>(`/lobbies/${lobbyId}`).then(({ data }) => setLobby(data)).catch(() => {});
  }, [lobbyId]);

  if (!lobbyId) {
    return (
      <div className="flex items-center justify-center flex-1">
        <div className="h-10 w-10 border-4 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 pb-16 max-w-md mx-auto w-full relative h-[100dvh]">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white z-10 sticky top-0">
        <button
          onClick={() => navigate('/lobbies')}
          className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 transition"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1">
          <p className="font-semibold text-sm text-gray-800">{lobby?.name ?? 'Lobby'}</p>
          {lobby?.gameName && <p className="text-xs text-gray-400">{lobby.gameName}</p>}
        </div>
        <button
          onClick={handleLeave}
          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition"
          title="Salir del lobby"
        >
          <LogOut size={18} />
        </button>
      </header>
      <div className="flex-1 w-full bg-white relative">
        <LobbyChat lobbyId={lobbyId} />
      </div>
    </div>
  );
}
