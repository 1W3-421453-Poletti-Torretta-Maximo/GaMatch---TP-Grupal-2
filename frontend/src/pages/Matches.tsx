import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Match } from '../types';
import api from '../lib/api';
import { GameBadge } from '../components/GameBadge/GameBadge';

export default function Matches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get<Match[]>('/matches')
      .then(({ data }) => setMatches(data))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center flex-1 pb-20">
        <div className="h-10 w-10 border-4 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="flex-1 pb-20 pt-6 px-4 max-w-md mx-auto w-full">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Tus GaMatches</h2>

      {matches.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-5xl">💜</span>
          <p className="mt-3 text-gray-500 text-sm">Todavía no tenés matches.<br />¡Empezá a deslizar!</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {matches.map((m) => (
            <li
              key={m.roomId}
              onClick={() => navigate(`/chat/${m.roomId}`)}
              className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm border border-gray-100
                hover:border-brand-200 hover:shadow-card cursor-pointer transition"
            >
              <div className="relative flex-shrink-0">
                <img src={m.user.avatar} alt={m.user.username} className="h-14 w-14 rounded-full object-cover" />
                {m.user.isOnline && (
                  <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-400 border-2 border-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">{m.user.username}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {m.games.slice(0, 2).map((g, i) => (
                    <GameBadge key={i} game={g} size="sm" />
                  ))}
                </div>
              </div>
              <span className="text-brand-400 text-xl">→</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
