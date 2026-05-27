import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import type { Lobby } from '../types';
import api from '../lib/api';
import { LobbyChat } from '../components/LobbyChat/LobbyChat';

export default function LobbyChatRoom() {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const navigate = useNavigate();

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
        <div>
          <p className="font-semibold text-sm text-gray-800">{lobby?.name ?? 'Lobby'}</p>
          {lobby?.gameName && <p className="text-xs text-gray-400">{lobby.gameName}</p>}
        </div>
      </header>
      <div className="flex-1 w-full bg-white relative">
        <LobbyChat lobbyId={lobbyId} />
      </div>
    </div>
  );
}
