import { useEffect } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import { useSwipeStore } from '../../store/swipeStore';
import { SwipeCard } from '../SwipeCard/SwipeCard';
import api from '../../lib/api';
import { getSocket } from '../../lib/socket';

const SWIPE_THRESHOLD = 120;

export function SwipeDeck() {
  const { candidates, fetchCandidates, removeTop, isLoading, isFetching, hasMore } = useSwipeStore();

  // Initial fetch on mount
  useEffect(() => {
    fetchCandidates();
  }, []);

  // Refetch when deck is running low (pero no mientras se está fetcheando)
  useEffect(() => {
    if (hasMore && (candidates.length <= 3 || candidates.length === 0) && !isFetching && !isLoading) {
      fetchCandidates();
    }
  }, [candidates.length, isFetching, isLoading, hasMore]);

  const [{ x, rotate, opacity }, api_spring] = useSpring(() => ({
    x: 0, rotate: 0, opacity: 1,
    config: { tension: 280, friction: 28 },
  }));

  const handleSwipe = async (direction: 'like' | 'dislike') => {
    const top = candidates[0];
    if (!top) return;

    removeTop();

    const targetX = direction === 'like' ? 600 : -600;
    await api_spring.start({ x: targetX, opacity: 0 });

    try {
      const { data } = await api.post('/swipe', { targetId: top.id, direction });
      if (data.match) {
        getSocket().emit('join_room', data.roomId);
      }
    } catch { /* handled by interceptor */ } finally {
      api_spring.set({ x: 0, rotate: 0, opacity: 1 });
      // Trigger refetch if deck is now empty or very low
      const { candidates: currentCandidates, isFetching: isFetching2, hasMore: hasMore2 } = useSwipeStore.getState();
      if (hasMore2 && (currentCandidates.length < 3) && !isFetching2) {
        fetchCandidates();
      }
    }
  };

  const bind = useDrag(({ down, movement: [mx], velocity: [vx], last }) => {
    const trigger = Math.abs(mx) > SWIPE_THRESHOLD || Math.abs(vx) > 0.5;
    if (!down && last && trigger) {
      handleSwipe(mx > 0 ? 'like' : 'dislike');
    } else {
      const dragOpacity = down ? 1 - Math.min(Math.abs(mx) / SWIPE_THRESHOLD, 1) * 0.4 : 1;
      api_spring.start({
        x: down ? mx : 0,
        rotate: down ? mx / 20 : 0,
        opacity: dragOpacity,
        immediate: down,
      });
    }
  }, { filterTaps: true });

  if (isFetching && !candidates.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-brand-400">
        <div className="h-12 w-12 border-4 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
        <p className="text-sm font-medium">Buscando jugadores...</p>
      </div>
    );
  }

  if (!hasMore && !candidates.length) {
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
        <button
          onClick={async () => {
            await api.delete('/swipe/dislikes');
            fetchCandidates();
          }}
          className="px-4 py-2 rounded-full border border-brand-400 text-brand-600 font-medium text-sm hover:bg-brand-50 transition"
        >
          Limpiar rechazos
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
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

    <button
      onClick={async () => {
        await api.delete('/swipe/dislikes');
        fetchCandidates();
      }}
      className="text-xs text-gray-400 hover:text-brand-500 underline underline-offset-2 transition"
    >
      Limpiar rechazos
    </button>
  </div>
  );
}
