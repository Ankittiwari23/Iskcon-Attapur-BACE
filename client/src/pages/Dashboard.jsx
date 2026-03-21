import { Link } from 'react-router-dom';

export default function Dashboard() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-amber-900 mb-2">Dashboard</h1>
      <p className="text-stone-600 mb-6">Manage ISKCON students, classes, sessions, and attendance.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { to: '/users', label: 'Students / Users', desc: 'View and manage members' },
          { to: '/member-types', label: 'Member Types', desc: 'BYC, DYC, Brahmachari, etc.' },
          { to: '/website-roles', label: 'Website Roles', desc: 'Permissions and authorization' },
          { to: '/class-types', label: 'Class Types', desc: 'BYC, DYC, Vaisnava Etiquette' },
          { to: '/class-sessions', label: 'Class Sessions', desc: 'Sessions per class type' },
          { to: '/classes', label: 'Classes', desc: 'Individual classes in a session' },
          { to: '/enrollments', label: 'Enrollments', desc: 'Enroll students in sessions' },
          { to: '/attendance', label: 'Attendance', desc: 'Mark and view attendance' },
        ].map(({ to, label, desc }) => (
          <Link key={to} to={to} className="p-4 rounded-lg bg-white border border-amber-200 shadow-sm hover:shadow hover:border-amber-300 transition">
            <h2 className="font-medium text-amber-900">{label}</h2>
            <p className="text-sm text-stone-500 mt-1">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
