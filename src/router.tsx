import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Spinner } from './components/atoms';
import { UserStatus } from './types';

import { PublicLayout, PrivateLayout } from './components/templates';

import { Home } from './pages/public/Home';
import { ChantsLibrary } from './pages/public/ChantsLibrary';
import { Calendar } from './pages/public/Calendar';
import { History } from './pages/public/History';
import { Donations } from './pages/public/Donations';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { PendingApproval } from './pages/auth/PendingApproval';
import { Dashboard } from './pages/private/Dashboard';
import { Members } from './pages/private/Members';
import { Voting } from './pages/private/Voting';
import { Documents } from './pages/private/Documents';
import { Forum } from './pages/private/Forum';
import { LiveChat } from './pages/private/LiveChat';
import { MembershipCard } from './pages/private/MembershipCard';
import { Contribute } from './pages/private/Contribute';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminChants } from './pages/admin/AdminChants';
import { AdminVoting } from './pages/admin/AdminVoting';
import { AdminDocuments } from './pages/admin/AdminDocuments';
import { AdminInventory } from './pages/admin/AdminInventory';
import { AdminCalendar } from './pages/admin/AdminCalendar';

const INACTIVE_ACCESS_MESSAGE =
  'Tu cuenta no tiene acceso al área privada. Si tu solicitud fue rechazada, contacta a un coordinador.';

const SessionGuardRedirect: React.FC<{ message: string }> = ({ message }) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    void (async () => {
      try {
        await signOut();
      } finally {
        navigate('/login', { replace: true, state: { membershipMessage: message } });
      }
    })();
  }, [signOut, navigate, message]);

  return (
    <div className="flex justify-center items-center min-h-screen">
      <Spinner size="lg" />
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.status !== UserStatus.ACTIVE) {
    if (user.status === UserStatus.PENDING) {
      return <Navigate to="/cuenta-pendiente" replace />;
    }
    return <SessionGuardRedirect message={INACTIVE_ACCESS_MESSAGE} />;
  }

  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (user?.role !== 'coordinator_admin' || user?.status !== UserStatus.ACTIVE) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const CalendarAccessRoute: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (user?.status === UserStatus.ACTIVE) {
    return (
      <PrivateLayout>
        <Calendar variant="private" />
      </PrivateLayout>
    );
  }

  return (
    <PublicLayout>
      <Calendar variant="public" />
    </PublicLayout>
  );
};

export const Router: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
        <Route path="/chants" element={<PublicLayout><ChantsLibrary /></PublicLayout>} />
        <Route path="/calendar" element={<CalendarAccessRoute />} />
        <Route path="/history" element={<PublicLayout><History /></PublicLayout>} />
        <Route path="/donaciones" element={<PublicLayout><Donations /></PublicLayout>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/cuenta-pendiente" element={<PendingApproval />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <PrivateLayout>
                <Dashboard />
              </PrivateLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/members"
          element={
            <ProtectedRoute>
              <PrivateLayout>
                <Members />
              </PrivateLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/voting"
          element={
            <ProtectedRoute>
              <PrivateLayout>
                <Voting />
              </PrivateLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/events" element={<Navigate to="/calendar" replace />} />
        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <PrivateLayout>
                <Documents />
              </PrivateLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/forum"
          element={
            <ProtectedRoute>
              <PrivateLayout>
                <Forum />
              </PrivateLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <PrivateLayout>
                <LiveChat />
              </PrivateLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/membership-card"
          element={
            <ProtectedRoute>
              <PrivateLayout>
                <MembershipCard />
              </PrivateLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/contribute"
          element={
            <ProtectedRoute>
              <PrivateLayout>
                <Contribute />
              </PrivateLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <PrivateLayout>
                <AdminDashboard />
              </PrivateLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/chants"
          element={
            <AdminRoute>
              <PrivateLayout>
                <AdminChants />
              </PrivateLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/voting"
          element={
            <AdminRoute>
              <PrivateLayout>
                <AdminVoting />
              </PrivateLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/documents"
          element={
            <AdminRoute>
              <PrivateLayout>
                <AdminDocuments />
              </PrivateLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/inventory"
          element={
            <AdminRoute>
              <PrivateLayout>
                <AdminInventory />
              </PrivateLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/calendar"
          element={
            <AdminRoute>
              <PrivateLayout>
                <AdminCalendar />
              </PrivateLayout>
            </AdminRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
