import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const SIGNAL_COLORS = {
  green:  'bg-green-500',
  yellow: 'bg-yellow-400',
  orange: 'bg-orange-500',
  red:    'bg-red-500',
};

const STATUS_LABELS = {
  no_response:       'No Response',
  call_not_attended: 'Call Not Attended',
  denied:            'Denied',
  confirmed:         'Confirmed',
};

const STATUS_BADGE = {
  no_response:       'bg-stone-100 text-stone-600',
  call_not_attended: 'bg-yellow-100 text-yellow-700',
  denied:            'bg-red-100 text-red-700',
  confirmed:         'bg-green-100 text-green-700',
};

function SummaryCard({ label, value, color = 'amber' }) {
  return (
    <div className="bg-white rounded-lg border border-amber-200 p-4 shadow-sm">
      <p className="text-sm text-stone-500">{label}</p>
      <p className={`text-2xl font-bold text-${color}-700 mt-1`}>{value ?? '—'}</p>
    </div>
  );
}

function SignalDot({ signal }) {
  return <span className={`inline-block w-3 h-3 rounded-full ${SIGNAL_COLORS[signal] || 'bg-stone-300'}`} title={signal} />;
}

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [pendingFollowUps, setPendingFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.followUps.dashboard(),
      api.followUps.list({ page: 1, pageSize: 15 }),
    ]).then(([s, fuData]) => {
      setStats(s);
      const rows = Array.isArray(fuData) ? fuData : fuData.rows || [];
      setPendingFollowUps(rows.filter(f => f.Status === 'no_response' || f.Status === 'call_not_attended'));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-stone-400">Loading dashboard...</p>;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <SummaryCard label="Total Follow-Ups" value={stats?.total} />
        <SummaryCard label="Pending (No Response)" value={stats?.noResponse} />
        <SummaryCard label="Confirmed" value={stats?.confirmed} />
        <SummaryCard label="Attended" value={stats?.attended} />
      </div>

      {pendingFollowUps.length > 0 && (
        <div className="bg-white rounded-lg border border-amber-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-amber-900">Pending Follow-Ups</h2>
            <Link to="/follow-ups" className="text-sm text-amber-700 hover:underline">View all →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-amber-50 text-left">
                <tr>
                  <th className="p-2">Student</th>
                  <th className="p-2">Mentor</th>
                  <th className="p-2">Class</th>
                  <th className="p-2">Date</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {pendingFollowUps.map(fu => (
                  <tr key={fu.id} className="border-t border-amber-100">
                    <td className="p-2 font-medium">{fu.StudentName}</td>
                    <td className="p-2">{fu.MentorName || '—'}</td>
                    <td className="p-2">{fu.ClassDescription || fu.ClassType}</td>
                    <td className="p-2">{fu.ClassDate ? new Date(fu.ClassDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[fu.Status] || ''}`}>
                        {STATUS_LABELS[fu.Status] || fu.Status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

function ManagerDashboard() {
  const { user } = useAuth();
  const [pendingFollowUps, setPendingFollowUps] = useState([]);
  const [menteeSignals, setMenteeSignals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.followUps.list({ mentorID: user.id }),
      api.userSignals.list(user.id),
    ]).then(([fuData, sigData]) => {
      const fuRows = Array.isArray(fuData) ? fuData : fuData.rows || [];
      setPendingFollowUps(fuRows.filter(f => f.Status === 'no_response' || f.Status === 'call_not_attended'));
      setMenteeSignals(Array.isArray(sigData) ? sigData : sigData.rows || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, [user.id]);

  const quickUpdate = async (id, Status) => {
    try {
      await api.followUps.update(id, { Status });
      setPendingFollowUps(prev => prev.filter(f => f.id !== id));
    } catch (e) { alert(e.message); }
  };

  if (loading) return <p className="text-stone-400">Loading dashboard...</p>;

  return (
    <>
      <div className="bg-white rounded-lg border border-amber-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-amber-900">Pending Follow-Ups</h2>
          <Link to="/follow-ups" className="text-sm text-amber-700 hover:underline">View all →</Link>
        </div>
        {pendingFollowUps.length === 0 ? (
          <p className="text-stone-400 text-sm">All caught up! No pending follow-ups.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-amber-50 text-left">
                <tr>
                  <th className="p-2">Student</th>
                  <th className="p-2">Class</th>
                  <th className="p-2">Date</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Quick Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingFollowUps.slice(0, 15).map(fu => (
                  <tr key={fu.id} className="border-t border-amber-100">
                    <td className="p-2 font-medium">{fu.StudentName}</td>
                    <td className="p-2">{fu.ClassDescription || fu.ClassType}</td>
                    <td className="p-2">{fu.ClassDate ? new Date(fu.ClassDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[fu.Status] || ''}`}>
                        {STATUS_LABELS[fu.Status] || fu.Status}
                      </span>
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        <button onClick={() => quickUpdate(fu.id, 'confirmed')} className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200">Confirmed</button>
                        <button onClick={() => quickUpdate(fu.id, 'denied')} className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">Denied</button>
                        <button onClick={() => quickUpdate(fu.id, 'call_not_attended')} className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200">No Answer</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-amber-200 p-4">
        <h2 className="font-semibold text-amber-900 mb-3">Mentee Signals</h2>
        {menteeSignals.length === 0 ? (
          <p className="text-stone-400 text-sm">No mentees found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-amber-50 text-left">
                <tr>
                  <th className="p-2">Student</th>
                  <th className="p-2">Signal</th>
                  <th className="p-2">In Follow-Up List</th>
                </tr>
              </thead>
              <tbody>
                {menteeSignals.map(ms => (
                  <tr key={ms.id} className="border-t border-amber-100">
                    <td className="p-2">{ms.UserName}</td>
                    <td className="p-2"><SignalDot signal={ms.Signal} /> <span className="ml-1 text-xs capitalize">{ms.Signal}</span></td>
                    <td className="p-2">{ms.IsInFollowUpList ? <span className="text-green-600 text-xs">Yes</span> : <span className="text-stone-400 text-xs">No</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function StudentDashboard() {
  const { user } = useAuth();
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.followUps.list({ studentID: user.id })
      .then(data => setFollowUps(Array.isArray(data) ? data : data.rows || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user.id]);

  if (loading) return <p className="text-stone-400">Loading dashboard...</p>;

  const upcoming = followUps.filter(f => !f.AttendedResult);
  const attended = followUps.filter(f => f.AttendedResult === 'attended').length;
  const total = followUps.filter(f => f.AttendedResult).length;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <SummaryCard label="Upcoming Classes" value={upcoming.length} />
        <SummaryCard label="Classes Attended" value={attended} />
        <SummaryCard label="Attendance Rate" value={total > 0 ? `${Math.round(attended / total * 100)}%` : '—'} />
      </div>

      <div className="bg-white rounded-lg border border-amber-200 p-4">
        <h2 className="font-semibold text-amber-900 mb-3">Your Upcoming Classes</h2>
        {upcoming.length === 0 ? (
          <p className="text-stone-400 text-sm">No upcoming classes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-amber-50 text-left">
                <tr>
                  <th className="p-2">Class</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Date</th>
                  <th className="p-2">Follow-Up Status</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map(fu => (
                  <tr key={fu.id} className="border-t border-amber-100">
                    <td className="p-2 font-medium">{fu.ClassDescription || `Class #${fu.ClassID}`}</td>
                    <td className="p-2">{fu.ClassType}</td>
                    <td className="p-2">{fu.ClassDate ? new Date(fu.ClassDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[fu.Status] || ''}`}>
                        {STATUS_LABELS[fu.Status] || fu.Status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const role = user?.role;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-amber-900 mb-2">Dashboard</h1>
      <p className="text-stone-600 mb-6">
        {role === 'Admin' ? 'Overview of follow-ups, manager performance, and student signals.' :
         role === 'Managers' ? 'Your pending follow-ups and mentee status at a glance.' :
         'Your upcoming classes and attendance summary.'}
      </p>

      {role === 'Admin' && <AdminDashboard />}
      {role === 'Managers' && <ManagerDashboard />}
      {role === 'Students' && <StudentDashboard />}

      {role === 'Admin' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
          {[
            { to: '/users', label: 'Students / Users', desc: 'View and manage members' },
            { to: '/follow-ups', label: 'Follow Ups', desc: 'Track student confirmations' },
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
      )}
    </div>
  );
}
