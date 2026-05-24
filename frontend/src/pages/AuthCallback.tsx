import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuthStore();

  useEffect(() => {
    const token = params.get('token');
    if (!token) { navigate('/login'); return; }
    login(token).then(() => navigate('/')).catch(() => navigate('/login'));
  }, [params, login, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-50">
      <div className="text-center">
        <div className="h-12 w-12 border-4 border-brand-300 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-brand-700 font-medium">Iniciando sesión...</p>
      </div>
    </div>
  );
}
