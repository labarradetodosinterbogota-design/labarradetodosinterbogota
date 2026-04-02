import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, Users, FileText, Vote, MessageCircle } from 'lucide-react';
import { Button, Avatar } from '../atoms';
import { useAuth } from '../../context/AuthContext';

interface PrivateLayoutProps {
  children: React.ReactNode;
}

export const PrivateLayout: React.FC<PrivateLayoutProps> = ({ children }) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const initials =
    user?.full_name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || '?';

  const isAdmin = user?.role === 'coordinator_admin';

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <header className="bg-white/95 backdrop-blur-sm border-b border-dark-200/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary-400 flex items-center justify-center font-bold text-white">
                IB
              </div>
              <span className="font-bold text-lg hidden sm:inline text-dark-900">Inter Bogotá</span>
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
              className={`${menuOpen ? 'flex' : 'hidden'} sm:flex flex-col sm:flex-row gap-2 sm:gap-4 absolute sm:static top-16 left-0 right-0 bg-white/98 backdrop-blur-sm sm:bg-transparent p-4 sm:p-0 border-b sm:border-0 border-dark-200`}
            >
              <Link
                to="/dashboard"
                className="flex items-center gap-2 text-dark-600 hover:text-primary-400 transition-colors"
              >
                <span>Inicio</span>
              </Link>
              <Link
                to="/members"
                className="flex items-center gap-2 text-dark-600 hover:text-primary-400 transition-colors"
              >
                <Users className="w-4 h-4" />
                <span>Integrantes</span>
              </Link>
              <Link
                to="/voting"
                className="flex items-center gap-2 text-dark-600 hover:text-primary-400 transition-colors"
              >
                <Vote className="w-4 h-4" />
                <span>Votaciones</span>
              </Link>
              <Link
                to="/documents"
                className="flex items-center gap-2 text-dark-600 hover:text-primary-400 transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>Documentos</span>
              </Link>
              <Link
                to="/forum"
                className="flex items-center gap-2 text-dark-600 hover:text-primary-400 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Foro</span>
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-2 text-primary-400 hover:text-primary-500 transition-colors font-medium"
                >
                  <span>Administración</span>
                </Link>
              )}
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
                onClick={handleLogout}
                className="text-dark-600"
                aria-label="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="bg-white/95 backdrop-blur-sm border-t border-dark-200/80 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-sm text-dark-500">
          <p>&copy; {new Date().getFullYear()} Inter Bogotá Barra Popular. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};
