import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';

interface AdminStats {
  stats: {
    totalUsers: number;
    totalMatches: number;
    avgRating: number | null;
    totalRatings: number;
  };
  topGames: { name: string; count: number }[];
  topRatedUsers: { username: string; avatar: string; rating: number; ratingCount: number }[];
  topLobbies: { lobbyId: string; lobbyName: string; gameName: string; participantCount: number; createdAt: string }[];
  searchTimeslots: { slotId: string; slotName: string; startHour: number; endHour: number; userCount: number }[];
  topMatchesUsers: { username: string; avatar: string; matchCount: number }[];
}

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [promoteUsername, setPromoteUsername] = useState('');
  const [promoteError, setPromoteError] = useState<string | null>(null);
  const [promoteSuccess, setPromoteSuccess] = useState<string | null>(null);
  const [isPromoting, setIsPromoting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/', { replace: true });
      return;
    }
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [user, navigate]);

  const loadDashboardData = () => {
    api.get<AdminStats>('/admin/dashboard')
      .then(({ data }) => setStats(data))
      .catch((err) => {
        if (err.response?.status === 403) {
          navigate('/', { replace: true });
        } else {
          setError('Error al cargar estadísticas');
        }
      });
  };

  const handlePromoteAdmin = async () => {
    if (!promoteUsername.trim()) {
      setPromoteError('Por favor ingresa un nombre de usuario');
      return;
    }
    setIsPromoting(true);
    setPromoteError(null);
    setPromoteSuccess(null);
    try {
      const response = await api.post('/admin/promote', { username: promoteUsername });
      setPromoteSuccess(response.data.message);
      setPromoteUsername('');
      setTimeout(() => loadDashboardData(), 1000);
    } catch (err: any) {
      setPromoteError(err.response?.data?.error || 'Error al promover usuario');
    } finally {
      setIsPromoting(false);
    }
  };

  if (!stats) {
    return (
      <main className="flex-1 pb-20 pt-6 px-4 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 border-4 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
        </div>
      </main>
    );
  }

  const cards = [
    { label: 'Usuarios registrados', value: stats.stats.totalUsers, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { label: 'Matches creados', value: stats.stats.totalMatches, color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { label: 'Calificaciones totales', value: stats.stats.totalRatings, color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    { label: 'Rating promedio', value: stats.stats.avgRating?.toFixed(1) ?? '—', color: 'bg-green-50 text-green-700 border-green-200' },
  ];

  return (
    <main className="flex-1 pb-20 pt-6 px-4 max-w-4xl mx-auto w-full">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Panel Admin</h2>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 mb-4">{error}</div>
      )}

      {/* KPIs Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-2xl p-4 border ${c.color}`}>
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-xs mt-1 opacity-80">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Promote Admin Section */}
      <section className="bg-white rounded-2xl border border-gray-100 mb-6 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Promover Usuario a Admin</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={promoteUsername}
            onChange={(e) => setPromoteUsername(e.target.value)}
            placeholder="Nombre de usuario"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            disabled={isPromoting}
          />
          <button
            onClick={handlePromoteAdmin}
            disabled={isPromoting}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition"
          >
            {isPromoting ? 'Promoviendo...' : 'Promover'}
          </button>
        </div>
        {promoteError && <p className="text-xs text-red-600 mt-2">{promoteError}</p>}
        {promoteSuccess && <p className="text-xs text-green-600 mt-2">{promoteSuccess}</p>}
      </section>

      {/* Top Games Section */}
      <section className="bg-white rounded-2xl border border-gray-100 mb-4 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Top 5 juegos</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 uppercase border-b border-gray-50">
              <th className="text-left px-4 py-2 font-medium">#</th>
              <th className="text-left px-4 py-2 font-medium">Juego</th>
              <th className="text-right px-4 py-2 font-medium">Jugadores</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {stats.topGames.map((g, i) => (
              <tr key={g.name} className="hover:bg-brand-50">
                <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                <td className="px-4 py-2 font-medium text-gray-800">{g.name}</td>
                <td className="px-4 py-2 text-right text-gray-600">{g.count}</td>
              </tr>
            ))}
            {stats.topGames.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-4 text-center text-gray-400">Sin datos</td></tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Top Rated Users Section */}
      <section className="bg-white rounded-2xl border border-gray-100 mb-4 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">👑 Usuarios Mejor Valorados</p>
        </div>
        <div className="divide-y divide-gray-50">
          {stats.topRatedUsers.map((u, i) => (
            <div key={u.username} className="px-4 py-3 hover:bg-brand-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-400 w-5">{i + 1}</span>
                {u.avatar && <img src={u.avatar} alt={u.username} className="w-6 h-6 rounded-full" />}
                <span className="font-medium text-gray-800">{u.username}</span>
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm text-yellow-600">⭐ {u.rating.toFixed(1)}</p>
                <p className="text-xs text-gray-400">{u.ratingCount} reviews</p>
              </div>
            </div>
          ))}
          {stats.topRatedUsers.length === 0 && (
            <div className="px-4 py-4 text-center text-gray-400">Sin datos</div>
          )}
        </div>
      </section>

      {/* Top Matches Users Section */}
      <section className="bg-white rounded-2xl border border-gray-100 mb-4 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">🎮 Usuarios con Más Matches</p>
        </div>
        <div className="divide-y divide-gray-50">
          {stats.topMatchesUsers.map((u, i) => (
            <div key={u.username} className="px-4 py-3 hover:bg-brand-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-400 w-5">{i + 1}</span>
                {u.avatar && <img src={u.avatar} alt={u.username} className="w-6 h-6 rounded-full" />}
                <span className="font-medium text-gray-800">{u.username}</span>
              </div>
              <p className="font-semibold text-sm text-purple-600">{u.matchCount} matches</p>
            </div>
          ))}
          {stats.topMatchesUsers.length === 0 && (
            <div className="px-4 py-4 text-center text-gray-400">Sin datos</div>
          )}
        </div>
      </section>

      {/* Top Lobbies Section */}
      <section className="bg-white rounded-2xl border border-gray-100 mb-4 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">🏛️ Lobbies con Más Participantes</p>
        </div>
        <div className="divide-y divide-gray-50">
          {stats.topLobbies.map((l, i) => (
            <div key={l.lobbyId} className="px-4 py-3 hover:bg-brand-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{i + 1}. {l.lobbyName}</p>
                  <p className="text-xs text-gray-500">{l.gameName}</p>
                </div>
                <p className="font-semibold text-sm text-blue-600">{l.participantCount} participantes</p>
              </div>
            </div>
          ))}
          {stats.topLobbies.length === 0 && (
            <div className="px-4 py-4 text-center text-gray-400">Sin datos</div>
          )}
        </div>
      </section>

      {/* Search Timeslots Section */}
      <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">🕐 Horarios Más Buscados</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 uppercase border-b border-gray-50">
              <th className="text-left px-4 py-2 font-medium">Horario</th>
              <th className="text-right px-4 py-2 font-medium">Usuarios</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {stats.searchTimeslots.map((s) => (
              <tr key={s.slotId} className="hover:bg-brand-50">
                <td className="px-4 py-2 font-medium text-gray-800">{s.slotName}</td>
                <td className="px-4 py-2 text-right text-gray-600">{s.userCount}</td>
              </tr>
            ))}
            {stats.searchTimeslots.length === 0 && (
              <tr><td colSpan={2} className="px-4 py-4 text-center text-gray-400">Sin datos</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 uppercase border-b border-gray-50">
              <th className="text-left px-4 py-2 font-medium">#</th>
              <th className="text-left px-4 py-2 font-medium">Usuario</th>
              <th className="text-right px-4 py-2 font-medium">Matches</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {stats.topUsers.map((u, i) => (
              <tr key={u.username} className="hover:bg-brand-50">
                <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                <td className="px-4 py-2 font-medium text-gray-800">{u.username}</td>
                <td className="px-4 py-2 text-right text-gray-600">{u.count}</td>
              </tr>
            ))}
            {stats.topUsers.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-4 text-center text-gray-400">Sin datos</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <div className="mt-6 p-4 bg-gray-50 rounded-2xl border border-gray-200">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Promover usuario a admin</p>
        <code className="text-xs text-gray-600 block break-all">
          MATCH (u:User &#123;discordId: 'TU_ID'&#125;) SET u.role = 'admin'
        </code>
      </div>
    </main>
  );
}
