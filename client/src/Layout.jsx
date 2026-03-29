import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

const allNav = [
  { to: '/',               label: 'Dashboard',        roles: ['Admin', 'Managers', 'Students'] },
  { to: '/follow-ups',     label: 'Follow Ups',       roles: ['Admin', 'Managers'] },
  { to: '/users',          label: 'Students / Users',  roles: ['Admin'] },
  { to: '/member-types',   label: 'Member Types',      roles: ['Admin'] },
  { to: '/website-roles',  label: 'Website Roles',     roles: ['Admin'] },
  { to: '/class-types',    label: 'Class Types',       roles: ['Admin', 'Managers'] },
  { to: '/class-sessions', label: 'Class Sessions',    roles: ['Admin', 'Managers'] },
  { to: '/classes',        label: 'Classes',            roles: ['Admin', 'Managers'] },
  { to: '/enrollments',    label: 'Enrollments',        roles: ['Admin', 'Managers'] },
  { to: '/attendance',     label: 'Attendance',         roles: ['Admin', 'Managers'] },
];

export default function Layout() {
  const loc = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const nav = allNav.filter(item => item.roles.includes(user?.role));

  return (
    <div className="min-h-screen bg-amber-50/80 text-stone-900 flex">
      <aside className="w-56 bg-amber-900 text-amber-100 shrink-0 flex flex-col">

        <div className="p-4 border-b border-amber-700">
          <h1 className="font-semibold text-lg">ISKCON BYC</h1>
          <p className="text-amber-200/80 text-sm">Student Management</p>
        </div>

        <nav className="p-2 flex-1 overflow-auto">
          {nav.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`block px-3 py-2 rounded-md text-sm mb-0.5 ${
                loc.pathname === to
                  ? 'bg-amber-700 text-white'
                  : 'hover:bg-amber-800/70'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-amber-700">
          <div className="mb-2">
            <p className="text-sm font-medium text-amber-100 truncate">{user?.name}</p>
            <p className="text-xs text-amber-300 truncate">{user?.email}</p>
            <p className="text-xs text-amber-400 mt-0.5">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left text-xs text-amber-300 hover:text-white px-2 py-1.5 rounded hover:bg-amber-800/50 transition-colors"
          >
            Sign out →
          </button>
        </div>

      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
