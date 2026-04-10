import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  LogOut,
  Users,
  FileText,
  Vote,
  MessageCircle,
  MessagesSquare,
  Banknote,
  Calendar,
} from 'lucide-react';
import { Button, Avatar, BrandFlagBanner, BrandMark } from '../atoms';
import { useAuth } from '../../context/AuthContext';
import { BAR_LEGAL_NAME, BAR_OFFICIAL_NAME } from '../../constants/brand';

interface PrivateLayoutProps {
  children: React.ReactNode;
}

const PRIVATE_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

export const PrivateLayout: React.FC<PrivateLayoutProps> = ({ children }) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const inactivityTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoggingOutRef = React.useRef(false);

  const handleLogout = React.useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    try {
      await signOut();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Logout error:', error);
      }
    } finally {
      setMenuOpen(false);
      navigate('/', { replace: true });
      isLoggingOutRef.current = false;
    }
  }, [navigate, signOut]);

  const initials =
    user?.full_name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || '?';

  const isAdmin = user?.role === 'coordinator_admin';
  const closeMenu = () => setMenuOpen(false);

  const clearInactivityTimer = React.useCallback(() => {
    if (inactivityTimeoutRef.current !== null) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
  }, []);

  const resetInactivityTimer = React.useCallback(() => {
    clearInactivityTimer();
    if (!user) return;
    inactivityTimeoutRef.current = setTimeout(() => {
      void handleLogout();
    }, PRIVATE_INACTIVITY_TIMEOUT_MS);
  }, [clearInactivityTimer, handleLogout, user]);

  React.useEffect(() => {
    if (!user) {
      clearInactivityTimer();
      return;
    }

    const onActivity = () => {
      resetInactivityTimer();
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      'mousedown',
      'mousemove',
      'keydown',
      'touchstart',
      'scroll',
    ];

    for (const eventName of activityEvents) {
      globalThis.addEventListener(eventName, onActivity);
    }

    resetInactivityTimer();

    return () => {
      for (const eventName of activityEvents) {
        globalThis.removeEventListener(eventName, onActivity);
      }
      clearInactivityTimer();
    };
  }, [clearInactivityTimer, resetInactivityTimer, user]);

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <header className="bg-white/95 backdrop-blur-sm border-b border-dark-200/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-2" onClick={closeMenu}>
              <BrandMark variant="onLight" />
              <span className="font-bold text-sm sm:text-lg text-dark-900">{BAR_OFFICIAL_NAME}</span>
            </Link>

            <button
              type="button"
              className="sm:hidden text-dark-900"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <nav
              className={`${
                menuOpen ? 'flex' : 'hidden'
              } sm:flex flex-col sm:flex-row gap-1 sm:gap-4 absolute sm:static top-full left-0 right-0 z-50 mt-2 sm:mt-0 bg-white sm:bg-transparent p-3 sm:p-0 border border-dark-200 sm:border-0 rounded-xl sm:rounded-none shadow-lg sm:shadow-none`}
            >
              <Link
                to="/dashboard"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-dark-700 hover:bg-dark-100 hover:text-primary-400 transition-colors sm:rounded-none sm:px-0 sm:py-0 sm:text-dark-600 sm:hover:bg-transparent"
                onClick={closeMenu}
              >
                <span>Inicio</span>
              </Link>
              <Link
                to="/members"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-dark-700 hover:bg-dark-100 hover:text-primary-400 transition-colors sm:rounded-none sm:px-0 sm:py-0 sm:text-dark-600 sm:hover:bg-transparent"
                onClick={closeMenu}
              >
                <Users className="w-4 h-4" />
                <span>Integrantes</span>
              </Link>
              <Link
                to="/voting"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-dark-700 hover:bg-dark-100 hover:text-primary-400 transition-colors sm:rounded-none sm:px-0 sm:py-0 sm:text-dark-600 sm:hover:bg-transparent"
                onClick={closeMenu}
              >
                <Vote className="w-4 h-4" />
                <span>Votaciones</span>
              </Link>
              <Link
                to="/calendar"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-dark-700 hover:bg-dark-100 hover:text-primary-400 transition-colors sm:rounded-none sm:px-0 sm:py-0 sm:text-dark-600 sm:hover:bg-transparent"
                onClick={closeMenu}
              >
                <Calendar className="w-4 h-4" />
                <span>Eventos</span>
              </Link>
              <Link
                to="/documents"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-dark-700 hover:bg-dark-100 hover:text-primary-400 transition-colors sm:rounded-none sm:px-0 sm:py-0 sm:text-dark-600 sm:hover:bg-transparent"
                onClick={closeMenu}
              >
                <FileText className="w-4 h-4" />
                <span>Documentos</span>
              </Link>
              <Link
                to="/contribute"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-dark-700 hover:bg-dark-100 hover:text-primary-400 transition-colors sm:rounded-none sm:px-0 sm:py-0 sm:text-dark-600 sm:hover:bg-transparent"
                onClick={closeMenu}
              >
                <Banknote className="w-4 h-4" />
                <span>Finanzas</span>
              </Link>
              <Link
                to="/forum"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-dark-700 hover:bg-dark-100 hover:text-primary-400 transition-colors sm:rounded-none sm:px-0 sm:py-0 sm:text-dark-600 sm:hover:bg-transparent"
                onClick={closeMenu}
              >
                <MessageCircle className="w-4 h-4" />
                <span>Foro</span>
              </Link>
              <Link
                to="/chat"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-dark-700 hover:bg-dark-100 hover:text-primary-400 transition-colors sm:rounded-none sm:px-0 sm:py-0 sm:text-dark-600 sm:hover:bg-transparent"
                onClick={closeMenu}
              >
                <MessagesSquare className="w-4 h-4" />
                <span>Chat en vivo</span>
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-2 rounded-lg bg-primary-50 px-3 py-2 text-primary-500 hover:bg-primary-100 hover:text-primary-600 transition-colors font-medium sm:rounded-none sm:bg-transparent sm:px-0 sm:py-0 sm:text-primary-400 sm:hover:bg-transparent sm:hover:text-primary-500"
                  onClick={closeMenu}
                >
                  <span>Administración</span>
                </Link>
              )}
              <div className="sm:hidden mt-1 border-t border-dark-200 pt-2">
                <button
                  type="button"
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-red-600 hover:bg-red-50 transition-colors"
                  onClick={() => {
                    void handleLogout();
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            </nav>

            <div className="hidden sm:flex items-center gap-4">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                title="Mi cuenta"
              >
                <Avatar src={user?.photo_url} initials={initials} size="sm" />
                <span className="text-sm font-medium text-dark-900 hidden md:inline">{user?.full_name}</span>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  void handleLogout();
                }}
                className="text-dark-600"
                aria-label="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto w-full px-4 pt-6">
        <BrandFlagBanner />
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="bg-white/95 backdrop-blur-sm border-t border-dark-200/80 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-sm text-dark-500">
          <p>
            &copy; {new Date().getFullYear()} {BAR_LEGAL_NAME}. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};
