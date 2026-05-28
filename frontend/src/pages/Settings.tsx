import { useEffect, useState } from 'react';
import type { GameWithMeta, TimeSlot, PlayHours } from '../types';
import { useSwipeStore } from '../store/swipeStore';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';

export default function Settings() {
  const [catalog, setCatalog] = useState<GameWithMeta[]>([]);
  const [timeslots, setTimeslots] = useState<TimeSlot[]>([]);
  const [userPlayHours, setUserPlayHours] = useState<PlayHours | null>(null);
  const [usePlayHoursFilter, setUsePlayHoursFilter] = useState(false); // <--- NUEVO
  const { filters, setFilters, fetchCandidates } = useSwipeStore();
  const { games: userGames, timeSlots: userTimeSlots, playHours } = useAuthStore();
  const [applied, setApplied] = useState(false);

  const userGameIds = new Set(userGames.map((g) => g.game.id));
  const timeslotIcons: Record<string, string> = { morning: '🌅', afternoon: '☀️', night: '🌙' };

  useEffect(() => {
    api.get<GameWithMeta[]>('/games').then(({ data }) => setCatalog(data));
    api.get<TimeSlot[]>('/timeslots').then(({ data }) => setTimeslots(data));
    if (playHours) {
      setUserPlayHours(playHours);
    }
    // Inicializar switch basado en si hay filtros o no
    if (filters.playHoursStart !== undefined || filters.playHoursEnd !== undefined) {
      setUsePlayHoursFilter(true);
    }
  }, [playHours]);

  const toggleGame = (id: string) => {
    const updated = filters.gameIds.includes(id)
      ? filters.gameIds.filter((g) => g !== id)
      : [...filters.gameIds, id];
    setFilters({ gameIds: updated });
  };

  const applyFilters = async () => {
    // Si llenó solo uno de los dos filtros, forzar a rellenar el faltante usando su propio perfil. Si apaga el switch, limpiamos.
    if (!usePlayHoursFilter) {
      setFilters({ playHoursStart: undefined, playHoursEnd: undefined });
    } else {
      const updates: any = {};
      if (filters.playHoursStart === undefined) updates.playHoursStart = userPlayHours?.startHour;
      if (filters.playHoursEnd === undefined) updates.playHoursEnd = userPlayHours?.endHour;
      if (Object.keys(updates).length > 0) {
        setFilters(updates);
      }
    }

    await fetchCandidates();
    setApplied(true);
    setTimeout(() => {
      window.history.back();
    }, 1200);
  };

  return (
    <main className="flex-1 pb-20 pt-6 px-4 max-w-md mx-auto w-full relative">
      {applied && (
        <div className="absolute top-2 left-4 right-4 p-3 bg-green-500 text-white text-center text-sm font-bold rounded-xl shadow-lg z-50 bg-brand-gradient">
          ¡Filtro aplicado!
        </div>
      )}

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
      <section className="bg-white rounded-2xl p-4 border border-gray-100 mb-4">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-3">
          Filtrar por juego
        </label>
        <p className="text-xs text-gray-400 mb-3">
          {filters.gameIds.length === 0 ? 'Todos los juegos' : `${filters.gameIds.length} seleccionados`}
        </p>
        <div className="flex flex-wrap gap-2">
          {catalog.map((g) => {
            const active = filters.gameIds.includes(g.id);
            const inProfile = userGameIds.has(g.id);
            return (
              <button
                key={g.id}
                onClick={() => inProfile && toggleGame(g.id)}
                disabled={!inProfile}
                title={!inProfile ? 'No tenés este juego en tu perfil' : undefined}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition border
                  ${active
                    ? 'bg-brand-600 text-white border-brand-600'
                    : inProfile
                      ? 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                      : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'}`}
              >
                {g.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* Timeslot filter */}
      {timeslots.length > 0 && (
        <section className="bg-white rounded-2xl p-4 border border-gray-100 mb-6">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-3">
            Filtrar por horario
          </label>
          <p className="text-xs text-gray-400 mb-3">
            {filters.timeSlotIds.length === 0 ? 'Cualquier horario' : `${filters.timeSlotIds.length} franja(s) seleccionada(s)`}
          </p>
          <div className="flex flex-wrap gap-2">
            {timeslots.map((ts) => {
              const active = filters.timeSlotIds.includes(ts.id);
              const inProfile = userTimeSlots.includes(ts.id);
              return (
                <button
                  key={ts.id}
                  onClick={() => {
                    if (!inProfile) return;
                    const updated = filters.timeSlotIds.includes(ts.id)
                      ? filters.timeSlotIds.filter((id) => id !== ts.id)
                      : [...filters.timeSlotIds, ts.id];
                    setFilters({ timeSlotIds: updated });
                  }}
                  disabled={!inProfile}
                  title={!inProfile ? 'No tenés este horario en tu perfil' : undefined}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition border
                    ${active
                      ? 'bg-brand-600 text-white border-brand-600'
                      : inProfile
                        ? 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                        : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'}`}
                >
                  <span>{timeslotIcons[ts.id] ?? ''}</span>
                  <span>{ts.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Play Hours filter */}
      {userPlayHours && (
        <section className="bg-white rounded-2xl p-4 border border-gray-100 mb-6">
          <div className="flex items-center justify-between mb-3 cursor-pointer" onClick={() => setUsePlayHoursFilter(!usePlayHoursFilter)}>
            <div>
               <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">
                Filtrar por horario de juego
               </label>
               <p className="text-xs text-gray-400 mt-0.5">
                Exigir coincidir con horarios
               </p>
            </div>
            {/* Switch UI idéntica al Online Only */}
            <div
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${usePlayHoursFilter ? 'bg-brand-600' : 'bg-gray-200'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                  ${usePlayHoursFilter ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </div>
          </div>

          {usePlayHoursFilter && (
            <>
              <p className="text-xs text-gray-400 mb-3">
                Tu horario: {String(userPlayHours.startHour).padStart(2, '0')}:00 - {String(userPlayHours.endHour).padStart(2, '0')}:00
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-2">Desde:</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={filters.playHoursStart ?? userPlayHours.startHour}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setFilters({ playHoursStart: Number.isNaN(val) ? undefined : val });
                      }}
                      className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-brand-400 transition"
                    />
                    <span className="text-sm font-semibold text-gray-600 self-center">:00</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-2">Hasta:</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={filters.playHoursEnd ?? userPlayHours.endHour}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setFilters({ playHoursEnd: Number.isNaN(val) ? undefined : val });
                      }}
                      className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-brand-400 transition"
                    />
                    <span className="text-sm font-semibold text-gray-600 self-center">:00</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      <button
        onClick={applyFilters}
        disabled={applied}
        className="w-full py-3.5 rounded-2xl bg-brand-gradient text-white font-bold hover:opacity-90 disabled:opacity-50 transition shadow-card"
      >
        {applied ? 'Aplicando...' : 'Aplicar filtros'}
      </button>
    </main>
  );
}
