
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

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center">
      <p className="text-stone-500">Loading...</p>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
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
        <Route path="users"          element={<Users />} />
        <Route path="member-types"   element={<MemberTypes />} />
        <Route path="website-roles"  element={<WebsiteRoles />} />
        <Route path="class-types"    element={<ClassTypes />} />
        <Route path="class-sessions" element={<ClassSessions />} />
        <Route path="classes"        element={<Classes />} />
        <Route path="enrollments"    element={<Enrollments />} />
        <Route path="attendance"     element={<Attendance />} />
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