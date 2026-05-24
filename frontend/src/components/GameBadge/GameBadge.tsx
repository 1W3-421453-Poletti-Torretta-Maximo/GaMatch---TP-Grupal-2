import { UserGame } from '../../types';

interface Props {
  game: UserGame;
  size?: 'sm' | 'md';
}

export function GameBadge({ game, size = 'md' }: Props) {
  const isSmall = size === 'sm';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-brand-100 text-brand-700 font-medium
        ${isSmall ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}`}
    >
      <span>{game.game.name}</span>
      {game.role && <span className="opacity-70">· {game.role}</span>}
      {game.rankId && <span className="opacity-70">· {game.rankId.split('-').slice(1).join(' ')}</span>}
      {game.isLookingNow && (
        <span className="ml-1 h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Buscando ahora" />
      )}
    </span>
  );
}
