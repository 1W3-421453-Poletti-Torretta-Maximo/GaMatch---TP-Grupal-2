import { NavLink } from 'react-router-dom';
import { Home, MessageSquare, User, SlidersHorizontal, Gamepad2, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export function Navbar() {
  const { user } = useAuthStore();
  if (!user) return null;

  const links = [
    { to: '/',        icon: Home,              label: 'Explorar'  },
    { to: '/matches', icon: MessageSquare,     label: 'Matches'   },
    { to: '/lobbies', icon: Gamepad2,          label: 'Lobbies'   },
    { to: '/profile', icon: User,              label: 'Perfil'    },
    { to: '/settings',icon: SlidersHorizontal, label: 'Filtros'   },
    ...(user.role === 'admin' ? [{ to: '/admin', icon: ShieldCheck, label: 'Admin' }] : []),
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-100 safe-area-pb">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition
              ${isActive ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'}`
            }
          >
            <Icon size={22} />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
