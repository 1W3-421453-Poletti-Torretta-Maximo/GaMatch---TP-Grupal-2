import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import type { GameWithMeta } from '../types';
import api from '../lib/api';
import { GameBadge } from '../components/GameBadge/GameBadge';
import { Plus, Trash2 } from 'lucide-react';

export default function Profile() {
  const { user, games, refreshProfile } = useAuthStore();
  const [catalog, setCatalog] = useState<GameWithMeta[]>([]);
  const [bio, setBio] = useState(user?.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [addingGame, setAddingGame] = useState(false);
  const [form, setForm] = useState({ gameId: '', role: '', rankId: '', rankTier: 0, isLookingNow: false });

  useEffect(() => {
    api.get<GameWithMeta[]>('/games').then(({ data }) => setCatalog(data));
  }, []);

  const saveBio = async () => {
    setSaving(true);
    await api.patch('/users/me', { bio });
    await refreshProfile();
    setSaving(false);
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
    setForm({ gameId: '', role: '', rankId: '', rankTier: 0, isLookingNow: false });
  };

  const selectedGame = catalog.find((g) => g.id === form.gameId);

  if (!user) return null;

  return (
    <main className="flex-1 pb-20 pt-6 px-4 max-w-md mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col items-center mb-6">
        <img src={user.avatar} className="h-20 w-20 rounded-full object-cover border-4 border-brand-300 mb-3" alt="" />
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
              onChange={(e) => setForm({ ...form, gameId: e.target.value, role: '', rankId: '', rankTier: 0 })}
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
              </>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setAddingGame(false); setForm({ gameId: '', role: '', rankId: '', rankTier: 0, isLookingNow: false }); }}
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
    </main>
  );
}
