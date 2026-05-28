import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MessageSquare, Users } from 'lucide-react';
import type { GameWithMeta, Lobby } from '../types';
import api from '../lib/api';
import { useLobbyStore } from '../store/lobbyStore';

export default function Lobbies() {
  const [catalog, setCatalog] = useState<GameWithMeta[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const { lobbies, fetchLobbies, createLobby, isCreating } = useLobbyStore();
  const navigate = useNavigate();

  useEffect(() => {
    api.get<GameWithMeta[]>('/games').then(({ data }) => setCatalog(data));
  }, []);

  useEffect(() => {
    if (selectedGameId) fetchLobbies(selectedGameId);
  }, [selectedGameId]);

  const handleCreate = async () => {
    if (!newName.trim() || !selectedGameId) return;
    const lobby = await createLobby(newName.trim(), selectedGameId);
    if (lobby) {
      setShowCreate(false);
      setNewName('');
      navigate(`/lobby/${lobby.id}`);
    }
  };

  const selectedGame = catalog.find((g) => g.id === selectedGameId);

  return (
    <main className="flex-1 pb-20 pt-6 px-4 max-w-md mx-auto w-full">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Lobbies</h2>

      {/* Game selector */}
      <section className="bg-white rounded-2xl p-4 border border-gray-100 mb-4">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-3">
          Seleccioná un juego
        </label>
        <div className="flex flex-wrap gap-2">
          {catalog.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGameId(g.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition border
                ${selectedGameId === g.id
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'}`}
            >
              {g.name}
            </button>
          ))}
        </div>
      </section>

      {selectedGame && (
        <>
          {/* Create lobby */}
          <div className="flex justify-end mb-3">
            <button
              onClick={() => setShowCreate((v) => !v)}
              className="flex items-center gap-1 text-brand-600 text-xs font-semibold hover:opacity-80 transition"
            >
              <Plus size={14} /> Crear lobby
            </button>
          </div>

          {showCreate && (
            <section className="bg-white rounded-2xl p-4 border border-gray-100 mb-4 space-y-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nombre del lobby"
                maxLength={50}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-brand-400 transition"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowCreate(false); setNewName(''); }}
                  className="flex-1 py-2 rounded-full border border-gray-200 text-gray-500 text-xs font-semibold hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim() || isCreating}
                  className="flex-1 py-2 rounded-full bg-brand-gradient text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition"
                >
                  {isCreating ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </section>
          )}

          {/* Lobby list */}
          <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {lobbies.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                <MessageSquare size={32} className="mx-auto mb-2 opacity-40" />
                No hay lobbies para {selectedGame.name}
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {lobbies.map((lobby) => (
                  <li
                    key={lobby.id}
                    onClick={() => navigate(`/lobby/${lobby.id}`)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-brand-50 cursor-pointer transition"
                  >
                    <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 flex-shrink-0">
                      <Users size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-800 truncate">{lobby.name}</p>
                      <p className="text-xs text-gray-400">
                        {selectedGame.name}
                        {lobby.rankTier ? ` · Rango: ${lobby.rankTier}` : ''}
                      </p>
                    </div>
                    <span className="text-brand-400 text-lg">→</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
