import { useEffect, useState } from 'react';
import { GameWithMeta } from '../types';
import { useSwipeStore } from '../store/swipeStore';
import api from '../lib/api';

export default function Settings() {
  const [catalog, setCatalog] = useState<GameWithMeta[]>([]);
  const { filters, setFilters, fetchCandidates } = useSwipeStore();

  useEffect(() => {
    api.get<GameWithMeta[]>('/games').then(({ data }) => setCatalog(data));
  }, []);

  const toggleGame = (id: string) => {
    const updated = filters.gameIds.includes(id)
      ? filters.gameIds.filter((g) => g !== id)
      : [...filters.gameIds, id];
    setFilters({ gameIds: updated });
  };

  const applyFilters = async () => {
    await fetchCandidates();
    window.history.back();
  };

  return (
    <main className="flex-1 pb-20 pt-6 px-4 max-w-md mx-auto w-full">
      <h2 className="text-xl font-bold text-gray-800 mb-5">Preferencias de búsqueda</h2>

      {/* Online only */}
      <section className="bg-white rounded-2xl p-4 border border-gray-100 mb-4">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="font-medium text-gray-800 text-sm">Solo jugadores online</p>
            <p className="text-xs text-gray-400 mt-0.5">Mostrá solo quienes están activos ahora</p>
          </div>
          <div
            onClick={() => setFilters({ onlineOnly: !filters.onlineOnly })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${filters.onlineOnly ? 'bg-brand-600' : 'bg-gray-200'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                ${filters.onlineOnly ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </div>
        </label>
      </section>

      {/* Rank tolerance */}
      <section className="bg-white rounded-2xl p-4 border border-gray-100 mb-4">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-3">
          Tolerancia de rango
        </label>
        <input
          type="range"
          min={0}
          max={5}
          value={filters.rankTolerance === -1 ? 5 : filters.rankTolerance}
          onChange={(e) => setFilters({ rankTolerance: parseInt(e.target.value) })}
          className="w-full accent-brand-600"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>Exacto</span>
          <span className="text-brand-600 font-semibold">
            {filters.rankTolerance === 5 ? 'Cualquier rango' : `±${filters.rankTolerance} rangos`}
          </span>
          <span>Cualquiera</span>
        </div>
      </section>

      {/* Game filter */}
      <section className="bg-white rounded-2xl p-4 border border-gray-100 mb-6">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-3">
          Filtrar por juego
        </label>
        <p className="text-xs text-gray-400 mb-3">
          {filters.gameIds.length === 0 ? 'Todos los juegos' : `${filters.gameIds.length} seleccionados`}
        </p>
        <div className="flex flex-wrap gap-2">
          {catalog.map((g) => {
            const active = filters.gameIds.includes(g.id);
            return (
              <button
                key={g.id}
                onClick={() => toggleGame(g.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition border
                  ${active
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'}`}
              >
                {g.name}
              </button>
            );
          })}
        </div>
      </section>

      <button
        onClick={applyFilters}
        className="w-full py-3.5 rounded-2xl bg-brand-gradient text-white font-bold hover:opacity-90 transition shadow-card"
      >
        Aplicar filtros
      </button>
    </main>
  );
}
