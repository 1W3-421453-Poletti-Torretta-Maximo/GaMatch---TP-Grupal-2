import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import type { GameWithMeta, TimeSlot, PlayHours } from '../types';
import api from '../lib/api';
import { AvatarDisplay } from '../components/AvatarDisplay/AvatarDisplay';
import { GameBadge } from '../components/GameBadge/GameBadge';
import { Plus, Trash2, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Profile() {
  const { user, games, playHours, refreshProfile, logout, setPlayHours } = useAuthStore();
  const [catalog, setCatalog] = useState<GameWithMeta[]>([]);
  const [bio, setBio] = useState(user?.bio ?? '');
  const [avatarSeed, setAvatarSeedLocal] = useState(user?.avatarSeed ?? '');
  const [saving, setSaving] = useState(false);
  const [addingGame, setAddingGame] = useState(false);
  const [form, setForm] = useState({ gameId: '', role: '', rankId: '', rankTier: 0, isLookingNow: false, timeSlots: [] as string[] });
  const [timeslots, setTimeslots] = useState<TimeSlot[]>([]);
  const [seedList, setSeedList] = useState<string[]>(() => [user?.avatarSeed ?? user?.id ?? '']);
  const [seedIdx, setSeedIdx] = useState(0);
  const [addingPlayHours, setAddingPlayHours] = useState(false);
  const [playHoursForm, setPlayHoursForm] = useState({ startHour: 9, endHour: 17 });
  const [savingPlayHours, setSavingPlayHours] = useState(false);
  const selectedSlots = useAuthStore((s) => s.timeSlots);
  const setTimeSlots = useAuthStore((s) => s.setTimeSlots);

  useEffect(() => {
    api.get<GameWithMeta[]>('/games').then(({ data }) => setCatalog(data));
    api.get<TimeSlot[]>('/timeslots').then(({ data }) => setTimeslots(data));
    if (playHours) {
      setPlayHoursForm({ startHour: playHours.startHour, endHour: playHours.endHour });
    }
  }, [playHours]);

  const saveBio = async () => {
    setSaving(true);
    const body: Record<string, unknown> = { bio };
    if (avatarSeed) body.avatarSeed = avatarSeed;
    body.timeSlots = selectedSlots;
    await api.patch('/users/me', body);
    await refreshProfile();
    setSaving(false);
  };

  const savePlayHours = async () => {
    if (playHoursForm.startHour >= playHoursForm.endHour) {
      alert('La hora de inicio debe ser anterior a la hora de fin');
      return;
    }
    setSavingPlayHours(true);
    try {
      const { data } = await api.put('/users/me/playhours', {
        startHour: playHoursForm.startHour,
        endHour: playHoursForm.endHour,
      });
      setPlayHours(data);
      setAddingPlayHours(false);
      await refreshProfile();
    } catch (error) {
      console.error('Error saving play hours:', error);
    } finally {
      setSavingPlayHours(false);
    }
  };

  const removePlayHours = async () => {
    try {
      await api.delete('/users/me/playhours');
      setPlayHours(null);
      await refreshProfile();
    } catch (error) {
      console.error('Error removing play hours:', error);
    }
  };

  const removeGame = async (gameId: string) => {
    await api.delete(`/users/me/games/${gameId}`);
    await refreshProfile();
  };

  const addGame = async () => {
    if (!form.gameId || !form.role) return;
    await api.put('/users/me/games', form);
    await refreshProfile();
    setAddingGame(false);
    setForm({ gameId: '', role: '', rankId: '', rankTier: 0, isLookingNow: false, timeSlots: [] });
  };

  const prevAvatar = () => {
    if (seedIdx > 0) {
      const i = seedIdx - 1;
      setSeedIdx(i);
      setAvatarSeedLocal(seedList[i]);
    } else {
      const s = Math.random().toString(36).slice(2, 10);
      setSeedList((prev) => [s, ...prev]);
      setAvatarSeedLocal(s);
    }
  };

  const nextAvatar = () => {
    if (seedIdx < seedList.length - 1) {
      const i = seedIdx + 1;
      setSeedIdx(i);
      setAvatarSeedLocal(seedList[i]);
    } else {
      const s = Math.random().toString(36).slice(2, 10);
      setSeedList((prev) => [...prev, s]);
      setSeedIdx((i) => i + 1);
      setAvatarSeedLocal(s);
    }
  };

  const selectedGame = catalog.find((g) => g.id === form.gameId);

  if (!user) return null;

  return (
    <main className="flex-1 pb-20 pt-6 px-4 max-w-md mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col items-center mb-6">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={prevAvatar}
            className="h-8 w-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition shadow-sm"
            title="Avatar anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <AvatarDisplay seed={avatarSeed || user.id} size={80} className="rounded-full border-4 border-brand-300 overflow-hidden" />
          <button
            onClick={nextAvatar}
            className="h-8 w-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition shadow-sm"
            title="Avatar siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <h2 className="text-xl font-bold text-gray-800">{user.username}</h2>
      </div>

      {/* Bio */}
      <section className="bg-white rounded-2xl p-4 border border-gray-100 mb-4">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={300}
          rows={3}
          className="w-full text-sm rounded-xl border border-gray-200 p-3 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 resize-none transition"
          placeholder="Contá un poco de vos..."
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-400">{bio.length}/300</span>
          <button
            onClick={saveBio}
            disabled={saving}
            className="px-4 py-1.5 rounded-full bg-brand-gradient text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </section>

      {/* TimeSlots */}
      {timeslots.length > 0 && (
        <section className="bg-white rounded-2xl p-4 border border-gray-100 mb-4">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-3">
            Disponibilidad horaria
          </label>
          <div className="flex flex-wrap gap-2">
            {timeslots.map((ts) => {
              const active = selectedSlots.includes(ts.id);
              const icons: Record<string, string> = { morning: '🌅', afternoon: '☀️', night: '🌙' };
              return (
                <button
                  key={ts.id}
                  onClick={() =>
                    setTimeSlots(
                      selectedSlots.includes(ts.id)
                        ? selectedSlots.filter((id) => id !== ts.id)
                        : [...selectedSlots, ts.id]
                    )
                  }
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition border
                    ${active
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'}`}
                >
                  <span>{icons[ts.id] ?? ''}</span>
                  <span>{ts.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {selectedSlots.length === 0
              ? 'Seleccioná tus horarios habituales de juego'
              : `${selectedSlots.length} franja(s) seleccionada(s)`}
          </p>
        </section>
      )}

      {/* Play Hours (Game Schedule) */}
      <section className="bg-white rounded-2xl p-4 border border-gray-100 mb-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Horarios de juego</label>
          {!addingPlayHours && (
            <button
              onClick={() => {
                setAddingPlayHours(true);
                if (playHours) {
                  setPlayHoursForm({ startHour: playHours.startHour, endHour: playHours.endHour });
                }
              }}
              className="flex items-center gap-1 text-brand-600 text-xs font-semibold hover:opacity-80 transition"
            >
              <Plus size={14} /> {playHours ? 'Editar' : 'Agregar'}
            </button>
          )}
        </div>

        {playHours && !addingPlayHours && (
          <div className="flex items-center justify-between bg-brand-50 rounded-xl p-3 mb-2">
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {String(playHours.startHour).padStart(2, '0')}:00 - {String(playHours.endHour).padStart(2, '0')}:00
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Tu horario de juego preferido</p>
            </div>
            <button
              onClick={removePlayHours}
              className="text-red-400 hover:text-red-600 transition"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}

        {!playHours && !addingPlayHours && (
          <p className="text-sm text-gray-400 text-center py-2">No tenés horarios configurados</p>
        )}

        {addingPlayHours && (
          <div className="border-t border-gray-100 pt-3 space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                Hora de inicio
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  max="23"
                  step="1"
                  value={playHoursForm.startHour}
                  onChange={(e) => setPlayHoursForm({ ...playHoursForm, startHour: parseInt(e.target.value) })}
                  className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-brand-400 transition"
                />
                <span className="text-sm font-semibold text-gray-600 self-center">:00</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                Hora de fin
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  max="23"
                  step="1"
                  value={playHoursForm.endHour}
                  onChange={(e) => setPlayHoursForm({ ...playHoursForm, endHour: parseInt(e.target.value) })}
                  className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-brand-400 transition"
                />
                <span className="text-sm font-semibold text-gray-600 self-center">:00</span>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setAddingPlayHours(false)}
                className="flex-1 py-2 rounded-full border border-gray-200 text-gray-500 text-xs font-semibold hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={savePlayHours}
                disabled={savingPlayHours}
                className="flex-1 py-2 rounded-full bg-brand-gradient text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition"
              >
                {savingPlayHours ? 'Guardando...' : 'Confirmar horario'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Games */}
      <section className="bg-white rounded-2xl p-4 border border-gray-100 mb-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mis juegos</label>
          <button
            onClick={() => setAddingGame((v) => !v)}
            className="flex items-center gap-1 text-brand-600 text-xs font-semibold hover:opacity-80 transition"
          >
            <Plus size={14} /> Agregar
          </button>
        </div>

        {games.length === 0 && !addingGame && (
          <p className="text-sm text-gray-400 text-center py-3">Todavía no agregaste juegos</p>
        )}

        <div className="flex flex-wrap gap-2 mb-3">
          {games.map((g, i) => (
            <div key={i} className="flex items-center gap-1 group">
              <GameBadge game={g} />
              {g.timeSlots && g.timeSlots.length > 0 && (
                <span className="text-xs text-gray-500">
                  {g.timeSlots.map((sid) => ({ morning: '🌅', afternoon: '☀️', night: '🌙' } as Record<string, string>)[sid] ?? '').join('')}
                </span>
              )}
              <button
                onClick={() => removeGame(g.game.id)}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>

        {addingGame && (
          <div className="border-t border-gray-100 pt-3 space-y-2">
            <select
              value={form.gameId}
              onChange={(e) => {
                const existing = games.find((g) => g.game.id === e.target.value);
                setForm({
                  ...form,
                  gameId: e.target.value,
                  role: existing?.role ?? '',
                  rankId: existing?.rankId ?? '',
                  rankTier: existing?.rankTier ?? 0,
                  isLookingNow: existing?.isLookingNow ?? false,
                  timeSlots: existing?.timeSlots ?? [],
                });
              }}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-brand-400 transition"
            >
              <option value="">Seleccioná un juego</option>
              {catalog.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>

            {selectedGame && (
              <>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-brand-400 transition"
                >
                  <option value="">Rol</option>
                  {selectedGame.roles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>

                {selectedGame.hasRanks && (
                  <select
                    value={form.rankId}
                    onChange={(e) => {
                      const rank = selectedGame.ranks.find((r) => r.id === e.target.value);
                      setForm({ ...form, rankId: e.target.value, rankTier: rank?.tier ?? 0 });
                    }}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-brand-400 transition"
                  >
                    <option value="">Rango</option>
                    {selectedGame.ranks.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                )}

                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isLookingNow}
                    onChange={(e) => setForm({ ...form, isLookingNow: e.target.checked })}
                    className="accent-brand-600"
                  />
                  Estoy buscando partida ahora
                </label>

                {/* TimeSlots per game */}
                {timeslots.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                      Horarios para este juego
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {timeslots.map((ts) => {
                        const active = form.timeSlots.includes(ts.id);
                        const icons: Record<string, string> = { morning: '🌅', afternoon: '☀️', night: '🌙' };
                        return (
                          <button
                            key={ts.id}
                            type="button"
                            onClick={() =>
                              setForm({
                                ...form,
                                timeSlots: form.timeSlots.includes(ts.id)
                                  ? form.timeSlots.filter((id) => id !== ts.id)
                                  : [...form.timeSlots, ts.id],
                              })
                            }
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition border
                              ${active
                                ? 'bg-brand-600 text-white border-brand-600'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'}`}
                          >
                            <span>{icons[ts.id] ?? ''}</span>
                            <span>{ts.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setAddingGame(false); setForm({ gameId: '', role: '', rankId: '', rankTier: 0, isLookingNow: false, timeSlots: [] }); }}
                className="flex-1 py-2 rounded-full border border-gray-200 text-gray-500 text-xs font-semibold hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={addGame}
                disabled={!form.gameId || !form.role}
                className="flex-1 py-2 rounded-full bg-brand-gradient text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition"
              >
                Agregar
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Logout */}
      <section className="mt-8 mb-4 flex justify-center">
        <button
          onClick={() => logout()}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 border-red-100 bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 hover:border-red-200 transition"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </section>
    </main>
  );
}
