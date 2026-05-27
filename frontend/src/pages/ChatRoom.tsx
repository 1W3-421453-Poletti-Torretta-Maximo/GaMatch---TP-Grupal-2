import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Match } from '../types';
import api from '../lib/api';
import { AvatarDisplay } from '../components/AvatarDisplay/AvatarDisplay';
import { Chat } from '../components/Chat/Chat';
import { RatingWidget } from '../components/RatingWidget/RatingWidget';
import { ChevronLeft, Star } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [existingStars, setExistingStars] = useState<number | null>(null);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!roomId) return;
    api.get<Match[]>('/matches').then(({ data }) => {
      const found = data.find((m) => m.roomId === roomId);
      if (found) {
        setMatch(found);
        api.get(`/matches/${found.user.id}/rating`).then(({ data }) => {
          if (data.rated) setExistingStars(data.stars);
        }).catch(() => {});
      }
    });
  }, [roomId]);

  const handleRated = (stars: number) => {
    setExistingStars(stars);
  };

  if (!match || !user || !roomId) {
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
          onClick={() => navigate('/matches')}
          className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 transition"
        >
          <ChevronLeft size={22} />
        </button>
        <AvatarDisplay seed={match.user.avatarSeed ?? match.user.id} size={36} className="rounded-full overflow-hidden flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-800 truncate">{match.user.username}</p>
          <div className="flex items-center gap-1">
            {match.user.isOnline && (
              <span className="text-xs text-green-500">Online</span>
            )}
            {existingStars !== null && (
              <div className="flex items-center gap-0.5 ml-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={10} className={s <= existingStars ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
                ))}
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="flex-1 w-full bg-white relative">
        <Chat roomId={roomId} otherUser={match.user} />
      </div>
      {existingStars === null ? (
        <RatingWidget matchedUserId={match.user.id} onRated={handleRated} />
      ) : (
        <div className="flex items-center justify-center gap-1 py-3 border-t border-gray-100">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} size={18} className={s <= existingStars ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
          ))}
          <span className="text-xs text-gray-400 ml-2">Calificaste a este jugador</span>
        </div>
      )}
    </div>
  );
}
