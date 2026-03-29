
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout            from './Layout';
import Login             from './pages/Login';
import EnrollPublicForm  from './pages/EnrollPublicForm';
import Dashboard         from './pages/Dashboard';
import Users             from './pages/Users';
import MemberTypes       from './pages/MemberTypes';
import WebsiteRoles      from './pages/WebsiteRoles';
import ClassTypes        from './pages/ClassTypes';
import ClassSessions     from './pages/ClassSessions';
import Classes           from './pages/Classes';
import Enrollments       from './pages/Enrollments';
import Attendance        from './pages/Attendance';
import FollowUps         from './pages/FollowUps';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center">
      <p className="text-stone-500">Loading...</p>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function RoleRoute({ roles, children }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Fully public — no auth, no redirect */}
      <Route path="/enroll" element={<EnrollPublicForm />} />

      {/* Public — redirect to / if already logged in */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

      {/* Protected */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index                 element={<Dashboard />} />
        <Route path="users"          element={<RoleRoute roles={['Admin']}><Users /></RoleRoute>} />
        <Route path="member-types"   element={<RoleRoute roles={['Admin']}><MemberTypes /></RoleRoute>} />
        <Route path="website-roles"  element={<RoleRoute roles={['Admin']}><WebsiteRoles /></RoleRoute>} />
        <Route path="class-types"    element={<RoleRoute roles={['Admin', 'Managers']}><ClassTypes /></RoleRoute>} />
        <Route path="class-sessions" element={<RoleRoute roles={['Admin', 'Managers']}><ClassSessions /></RoleRoute>} />
        <Route path="classes"        element={<RoleRoute roles={['Admin', 'Managers']}><Classes /></RoleRoute>} />
        <Route path="enrollments"    element={<RoleRoute roles={['Admin', 'Managers']}><Enrollments /></RoleRoute>} />
        <Route path="attendance"     element={<RoleRoute roles={['Admin', 'Managers']}><Attendance /></RoleRoute>} />
        <Route path="follow-ups"     element={<RoleRoute roles={['Admin', 'Managers']}><FollowUps /></RoleRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}