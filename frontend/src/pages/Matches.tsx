import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import type { Match, Lobby } from '../types';
import api from '../lib/api';
import { AvatarDisplay } from '../components/AvatarDisplay/AvatarDisplay';
import { GameBadge } from '../components/GameBadge/GameBadge';

export default function Matches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchMatches = async () => {
    try {
      const [matchesRes, lobbiesRes] = await Promise.all([
        api.get<Match[]>('/matches'),
        api.get<Lobby[]>('/matches/lobbies'),
      ]);
      setMatches(matchesRes.data);
      setLobbies(lobbiesRes.data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const handleDeleteMatch = async (roomId: string, username: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const confirmed = window.confirm(
      `¿Realmente queres eliminar el match con ${username}?`
    );
    
    if (!confirmed) return;

    try {
      await api.delete(`/matches/${roomId}`);
      setMatches((prev) => prev.filter((m) => m.roomId !== roomId));
    } catch (error) {
      console.error('Error al eliminar match:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center flex-1 pb-20">
        <div className="h-10 w-10 border-4 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  const timeslotIcons: Record<string, string> = { morning: '🌅', afternoon: '☀️', night: '🌙' };

  return (
    <main className="flex-1 pb-20 pt-6 px-4 max-w-md mx-auto w-full">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Tus GaMatches</h2>

      {matches.length === 0 && lobbies.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-5xl">💜</span>
          <p className="mt-3 text-gray-500 text-sm">Todavía no tenés matches.<br />¡Empezá a deslizar!</p>
        </div>
      ) : (
        <>
          {/* Joined lobbies */}
          {lobbies.length > 0 && (
            <section className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Lobbies</h3>
              <ul className="space-y-2">
                {lobbies.map((l) => (
                  <li
                    key={l.id}
                    onClick={() => navigate(`/lobby/${l.id}`)}
                    className="flex items-center gap-3 p-3 bg-white rounded-2xl shadow-sm border border-gray-100
                      hover:border-brand-200 hover:shadow-card cursor-pointer transition"
                  >
                    <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 flex-shrink-0">
                      <Users size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-800 truncate">{l.name}</p>
                      <p className="text-xs text-gray-400">{l.gameName ?? ''}</p>
                    </div>
                    <span className="text-brand-400 text-lg">→</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Matches */}
          {matches.length > 0 && (
            <section>
              {lobbies.length > 0 && (
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Matches</h3>
              )}
              <ul className="space-y-3">
                {matches.map((m) => (
                  <li
                    key={m.roomId}
                    onClick={() => navigate(`/chat/${m.roomId}`)}
                    className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm border border-gray-100
                      hover:border-brand-200 hover:shadow-card cursor-pointer transition"
                  >
                    <div className="relative flex-shrink-0">
                      <AvatarDisplay seed={m.user.avatarSeed ?? m.user.id} size={56} className="rounded-full overflow-hidden" />
                      {m.user.isOnline && (
                        <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-400 border-2 border-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{m.user.username}</p>
                      <div className="flex flex-wrap gap-1 mt-1 items-center">
                        {m.games.slice(0, 2).map((g, i) => (
                          <GameBadge key={i} game={g} size="sm" />
                        ))}
                        {/* Timeslot icons per game */}
                        {m.games.slice(0, 2).map((g, i) =>
                          g.timeSlots && g.timeSlots.length > 0 ? (
                            <span key={`ts-${i}`} className="text-xs ml-1" title={`Horarios: ${g.timeSlots.join(', ')}`}>
                              {g.timeSlots.map((sid) => timeslotIcons[sid] ?? '').join(' ')}
                            </span>
                          ) : null
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => handleDeleteMatch(m.roomId, m.user.username, e)}
                        className="text-red-400 hover:text-red-600 transition p-1 hover:bg-red-50 rounded-full"
                        title="Eliminar match"
                      >
                        ✕
                      </button>
                      <span className="text-brand-400 text-xl">→</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}
