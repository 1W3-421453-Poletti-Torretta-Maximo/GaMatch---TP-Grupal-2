import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Match } from '../types';
import api from '../lib/api';
import { Chat } from '../components/Chat/Chat';
import { ChevronLeft } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!roomId) return;
    api.get<Match[]>('/matches').then(({ data }) => {
      const found = data.find((m) => m.roomId === roomId);
      if (found) setMatch(found);
    });
  }, [roomId]);

  if (!match || !user || !roomId) {
    return (
      <div className="flex items-center justify-center flex-1">
        <div className="h-10 w-10 border-4 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen pb-0 max-w-md mx-auto w-full">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white">
        <button
          onClick={() => navigate('/matches')}
          className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 transition"
        >
          <ChevronLeft size={22} />
        </button>
        <img src={match.user.avatar} className="h-9 w-9 rounded-full object-cover" alt="" />
        <div>
          <p className="font-semibold text-sm text-gray-800">{match.user.username}</p>
          {match.user.isOnline && (
            <p className="text-xs text-green-500">Online</p>
          )}
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <Chat roomId={roomId} otherUser={match.user} />
      </div>
    </div>
  );
}
