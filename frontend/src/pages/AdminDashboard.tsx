import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';

interface AdminStats {
  totalUsers: number;
  totalMatches: number;
  topGames: { name: string; count: number }[];
  topUsers: { username: string; count: number }[];
  avgRating: number | null;
  totalRatings: number;
}

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/', { replace: true });
      return;
    }
    api.get<AdminStats>('/admin/stats')
      .then(({ data }) => setStats(data))
      .catch((err) => {
        if (err.response?.status === 403) {
          navigate('/', { replace: true });
        } else {
          setError('Error al cargar estadísticas');
        }
      });
  }, [user, navigate]);

  if (!stats) {
    return (
      <main className="flex-1 pb-20 pt-6 px-4 max-w-md mx-auto w-full">
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 border-4 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
        </div>
      </main>
    );
  }

  const cards = [
    { label: 'Usuarios registrados', value: stats.totalUsers, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { label: 'Matches creados', value: stats.totalMatches, color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { label: 'Calificaciones totales', value: stats.totalRatings, color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    { label: 'Rating promedio', value: stats.avgRating?.toFixed(1) ?? '—', color: 'bg-green-50 text-green-700 border-green-200' },
  ];

  return (
    <main className="flex-1 pb-20 pt-6 px-4 max-w-md mx-auto w-full">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Panel Admin</h2>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 mb-4">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-6">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-2xl p-4 border ${c.color}`}>
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-xs mt-1 opacity-80">{c.label}</p>
          </div>
        ))}
      </div>

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

      <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Top 5 usuarios con más matches</p>
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
