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
import { MembershipCard } from './pages/private/MembershipCard';
import { Contribute } from './pages/private/Contribute';
import { AdminDashboard } from './pages/admin/AdminDashboard';

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

export const Router: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
        <Route path="/chants" element={<PublicLayout><ChantsLibrary /></PublicLayout>} />
        <Route path="/calendar" element={<PublicLayout><Calendar /></PublicLayout>} />
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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
