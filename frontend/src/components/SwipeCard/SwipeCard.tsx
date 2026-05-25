import type { Candidate } from '../../types';
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
      <img
        src={candidate.avatar}
        alt={candidate.username}
        className="absolute inset-0 w-full h-full object-cover"
      />

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
        <div className="flex flex-wrap gap-1.5 mb-4">
          {candidate.games.slice(0, 3).map((g, i) => (
            <GameBadge key={i} game={g} size="sm" />
          ))}
        </div>
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
                className="flex items-center justify-center h-14 w-14 rounded-full bg-brand-gradient shadow-lg hover:scale-110 active:scale-95 transition-transform"
                aria-label="Like"
            >
              <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="h-8 w-8 text-white"
                  fill="currentColor"
              >
                <path d="M12 2a2 2 0 0 0-2 2v6H7a3 3 0 0 0-3 3v7h2v-7a1 1 0 0 1 1-1h3v8h2v-8h3a1 1 0 0 1 1 1v7h2v-7a3 3 0 0 0-3-3h-3V4a2 2 0 0 0-2-2z"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
