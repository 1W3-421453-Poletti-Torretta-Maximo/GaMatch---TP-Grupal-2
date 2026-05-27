import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AvatarDisplay } from '../AvatarDisplay/AvatarDisplay';
import { getSocket } from '../../lib/socket';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';

interface MatchEvent {
  matchedUserId: string;
  roomId: string;
}

interface MatchedUser {
  id: string;
  username: string;
  avatar: string;
  avatarSeed?: string;
}

export function MatchModal() {
  const [matchData, setMatchData] = useState<(MatchEvent & { other: MatchedUser }) | null>(null);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const socket = getSocket();
    const handler = async (event: MatchEvent) => {
      const { data } = await api.get(`/users/${event.matchedUserId}`);
      setMatchData({ ...event, other: data.user });
    };
    socket.on('new_match', handler);
    return () => { socket.off('new_match', handler); };
  }, []);

  if (!matchData || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-slide-up">
      <div className="relative bg-white rounded-4xl p-8 max-w-xs w-full mx-4 text-center shadow-card-hover animate-pop-in">
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-4xl">🎮</div>

        <h2 className="mt-6 text-2xl font-bold text-brand-700">¡GaMatch!</h2>
        <p className="text-gray-500 text-sm mt-1 mb-6">
          Vos y <strong>{matchData.other.username}</strong> coincidieron
        </p>

        <div className="flex justify-center gap-4 mb-6">
          <AvatarDisplay seed={user.avatarSeed ?? user.id} size={80} className="rounded-full border-4 border-brand-400 overflow-hidden" />
          <AvatarDisplay seed={matchData.other.avatarSeed ?? matchData.other.id} size={80} className="rounded-full border-4 border-brand-400 overflow-hidden" />
        </div>

        <button
          onClick={() => { navigate(`/chat/${matchData.roomId}`); setMatchData(null); }}
          className="w-full py-3 rounded-full bg-brand-gradient text-white font-bold text-sm hover:opacity-90 transition mb-2"
        >
          Ir al chat
        </button>
        <button
          onClick={() => setMatchData(null)}
          className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition"
        >
          Seguir explorando
        </button>
      </div>
    </div>
  );
}
