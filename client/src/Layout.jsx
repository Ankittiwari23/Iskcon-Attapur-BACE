import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

const allNav = [
  { to: '/',               label: 'Dashboard',        roles: ['Admin', 'Managers', 'Students'] },
  { to: '/follow-ups',     label: 'Follow Ups',       roles: ['Admin', 'Managers'] },
  { to: '/users',          label: 'Students / Users',  roles: ['Admin'] },
  { to: '/member-types',   label: 'Member Types',      roles: ['Admin'] },
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
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the mobile drawer whenever the route changes
  useEffect(() => { setDrawerOpen(false); }, [loc.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const nav = allNav.filter(item => item.roles.includes(user?.role));

  const SidebarContent = (
    <>
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
    </>
  );

  return (
    <div className="min-h-screen bg-amber-50/80 text-stone-900 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-amber-900 text-amber-100 shrink-0 flex-col">
        {SidebarContent}
      </aside>

      {/* Mobile drawer + backdrop */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 max-w-[80%] bg-amber-900 text-amber-100 flex flex-col shadow-xl">
            {SidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 bg-amber-900 text-amber-100 flex items-center gap-3 px-4 py-3 shadow">
          <button onClick={() => setDrawerOpen(true)} aria-label="Open menu" className="p-1 -ml-1">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-semibold">ISKCON BYC</span>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
