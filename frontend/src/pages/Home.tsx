import { SwipeDeck } from '../components/SwipeDeck/SwipeDeck';
import { MatchModal } from '../components/MatchModal/MatchModal';

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center pb-20 pt-6 px-4 bg-brand-50/40">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-brand-700">GaMatch</h1>
            <p className="text-xs text-gray-400 mt-0.5">Encontrá tu equipo ideal</p>
          </div>
          <span className="text-2xl">🎮</span>
        </div>
        <SwipeDeck />
      </div>
      <MatchModal />
    </main>
  );
}
