import { useEffect } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import { useSwipeStore } from '../../store/swipeStore';
import { SwipeCard } from '../SwipeCard/SwipeCard';
import api from '../../lib/api';
import { getSocket } from '../../lib/socket';

const SWIPE_THRESHOLD = 120;

export function SwipeDeck() {
  const { candidates, fetchCandidates, removeTop, isLoading, isFetching } = useSwipeStore();

  // Initial fetch on mount
  useEffect(() => {
    fetchCandidates();
  }, []); // Solo en mount

  // Refetch when deck is running low (pero no mientras se está fetcheando)
  useEffect(() => {
    if (candidates.length <= 5 && !isFetching && !isLoading) {
      fetchCandidates();
    }
  }, [candidates.length, isFetching, isLoading]);

  const [{ x, rotate, opacity }, api_spring] = useSpring(() => ({
    x: 0, rotate: 0, opacity: 1,
    config: { tension: 280, friction: 28 },
  }));

  const handleSwipe = async (direction: 'like' | 'dislike') => {
    const top = candidates[0];
    if (!top) return;

    const targetX = direction === 'like' ? 600 : -600;
    await api_spring.start({ x: targetX, opacity: 0 });
    api_spring.set({ x: 0, rotate: 0, opacity: 1 });

    try {
      const { data } = await api.post('/swipe', { targetId: top.id, direction });
      if (data.match) {
        getSocket().emit('join_room', data.roomId);
      }
    } catch { /* handled by interceptor */ }

    removeTop();
  };

  const bind = useDrag(({ down, movement: [mx], velocity: [vx], last }) => {
    const trigger = Math.abs(mx) > SWIPE_THRESHOLD || Math.abs(vx) > 0.5;
    if (!down && last && trigger) {
      handleSwipe(mx > 0 ? 'like' : 'dislike');
    } else {
      api_spring.start({
        x: down ? mx : 0,
        rotate: down ? mx / 20 : 0,
        opacity: 1,
        immediate: down,
      });
    }
  }, { filterTaps: true });

  if (isLoading && !candidates.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-brand-400">
        <div className="h-12 w-12 border-4 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
        <p className="text-sm font-medium">Buscando jugadores...</p>
      </div>
    );
  }

  if (!candidates.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
        <span className="text-5xl">🎮</span>
        <h3 className="text-xl font-bold text-gray-800">No hay más jugadores</h3>
        <p className="text-sm text-gray-500">Volvé más tarde o ampliá tus filtros</p>
        <button
          onClick={fetchCandidates}
          className="mt-2 px-5 py-2 rounded-full bg-brand-gradient text-white font-semibold text-sm hover:opacity-90 transition"
        >
          Recargar
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-sm mx-auto" style={{ height: '520px' }}>
      {/* Background cards (static) */}
      {candidates.slice(1, 4).map((c, i) => (
        <div
          key={c.id}
          className="absolute inset-0 rounded-4xl overflow-hidden"
          style={{
            transform: `scale(${1 - (i + 1) * 0.04}) translateY(${(i + 1) * 12}px)`,
            zIndex: 3 - i,
          }}
        >
          <SwipeCard candidate={c} />
        </div>
      ))}

      {/* Top draggable card */}
      {candidates[0] && (
        <animated.div
          {...bind()}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          style={{ x, rotate, opacity, zIndex: 10 }}
        >
          <SwipeCard
            candidate={candidates[0]}
            isTop
            onLike={() => handleSwipe('like')}
            onDislike={() => handleSwipe('dislike')}
          />
        </animated.div>
      )}
    </div>
  );
}
