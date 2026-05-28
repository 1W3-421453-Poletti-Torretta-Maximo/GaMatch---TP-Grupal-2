import type { Candidate } from '../../types';
import { AvatarDisplay } from '../AvatarDisplay/AvatarDisplay';
import { GameBadge } from '../GameBadge/GameBadge';

interface Props {
  candidate: Candidate;
  style?: React.CSSProperties;
  onLike?: () => void;
  onDislike?: () => void;
  isTop?: boolean;
}

export function SwipeCard({ candidate, style, onLike, onDislike, isTop }: Props) {
  return (
    <div
      className="absolute inset-0 rounded-4xl overflow-hidden shadow-card select-none touch-none"
      style={style}
    >
      {/* Background avatar */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <AvatarDisplay seed={candidate.avatarSeed ?? candidate.id} responsive className="w-full h-full" />
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-card-gradient" />

      {/* Online indicator */}
      {candidate.isOnline && (
        <span className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur px-3 py-1 text-xs text-white font-medium">
          <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          Online
        </span>
      )}

      {/* Info panel */}
      <div className="absolute bottom-0 inset-x-0 p-5 text-white">
        <h2 className="text-2xl font-bold mb-1">{candidate.username}</h2>
        {candidate.bio && (
          <p className="text-sm text-white/80 mb-3 line-clamp-2">{candidate.bio}</p>
        )}
        {candidate.avgRating !== undefined && candidate.avgRating > 0 && (
          <div className="flex items-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <span key={s} className={`text-sm ${s <= Math.round(candidate.avgRating!) ? 'text-yellow-400' : 'text-white/30'}`}>★</span>
            ))}
            <span className="text-xs text-white/60 ml-1">({candidate.avgRating.toFixed(1)})</span>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {candidate.games.slice(0, 3).map((g, i) => (
            <span key={i} className="flex items-center gap-0.5">
              <GameBadge game={g} size="sm" />
              {g.timeSlots && g.timeSlots.length > 0 && (
                <span className="text-xs leading-none">
                  {g.timeSlots.map((sid) => ({ morning: '🌅', afternoon: '☀️', night: '🌙' } as Record<string, string>)[sid] ?? '').join('')}
                </span>
              )}
            </span>
          ))}
        </div>

        {/* General time slots */}
        {candidate.generalTimeSlots && candidate.generalTimeSlots.length > 0 && (
          <div className="text-xs bg-white/20 rounded-full px-2 py-1 mb-3">
            {candidate.generalTimeSlots.map((sid) => ({ morning: '🌅', afternoon: '☀️', night: '🌙' } as Record<string, string>)[sid] ?? '').join(' ')}
          </div>
        )}

        {/* Play hours (game schedule) */}
        {candidate.playHours && (
          <div className="text-xs bg-blue-500/30 rounded-full px-2 py-1">
            ⏰ {String(candidate.playHours.startHour).padStart(2, '0')}:00 - {String(candidate.playHours.endHour).padStart(2, '0')}:00
          </div>
        )}

        {/* Action buttons — only on top card */}
        {isTop && (
          <div className="flex justify-center gap-6 mt-2">
            <button
                onClick={onDislike}
                className="flex items-center justify-center h-14 w-14 rounded-full bg-white shadow-lg text-2xl text-red-500 hover:scale-110 active:scale-95 transition-transform"
                aria-label="Dislike"
            >
              ✕
            </button> 
            <button
                onClick={onLike}
                className="flex items-center justify-center h-14 w-14 rounded-full bg-brand-gradient shadow-lg text-2xl hover:scale-110 active:scale-95 transition-transform"
                aria-label="Like"
            >
              🎮
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
