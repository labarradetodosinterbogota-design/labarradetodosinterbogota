import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button, BrandMark } from '../atoms';
import { BAR_CONTACT_EMAIL, BAR_LEGAL_NAME, BAR_OFFICIAL_NAME } from '../../constants/brand';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <header className="bg-dark-900 text-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2" onClick={closeMenu}>
              <BrandMark variant="onDark" />
              <span className="font-bold text-sm sm:text-lg">{BAR_OFFICIAL_NAME}</span>
            </Link>

            <button
              type="button"
              className="sm:hidden text-white"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <nav
              className={`${menuOpen ? 'flex' : 'hidden'} sm:flex flex-col sm:flex-row gap-2 sm:gap-4 absolute sm:static top-16 left-0 right-0 bg-dark-900 sm:bg-transparent p-4 sm:p-0`}
            >
              <Link
                to="/"
                className="text-white hover:text-primary-400 transition-colors"
                onClick={closeMenu}
              >
                Inicio
              </Link>
              <Link
                to="/history"
                className="text-white hover:text-primary-400 transition-colors"
                onClick={closeMenu}
              >
                Historia
              </Link>
              <Link
                to="/chants"
                className="text-white hover:text-primary-400 transition-colors"
                onClick={closeMenu}
              >
                Cantos
              </Link>
              <Link
                to="/donaciones"
                className="text-white hover:text-primary-400 transition-colors"
                onClick={closeMenu}
              >
                Donaciones
              </Link>
              <Link
                to="/calendar"
                className="text-white hover:text-primary-400 transition-colors"
                onClick={closeMenu}
              >
                Calendario
              </Link>
            </nav>

            <div className="hidden sm:flex gap-2">
              <Link to="/login">
                <Button variant="outline" size="sm">
                  Iniciar sesión
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">
                  Registrarse
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="bg-dark-900 text-white mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-primary-400 mb-4">{BAR_OFFICIAL_NAME}</h3>
              <p className="text-dark-300 text-sm">
                Hinchada unida en {BAR_OFFICIAL_NAME}. Abierta, no violenta y democrática.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-4">Enlaces</h3>
              <ul className="space-y-2 text-sm text-dark-300">
                <li>
                  <Link to="/" className="hover:text-primary-400">
                    Inicio
                  </Link>
                </li>
                <li>
                  <Link to="/history" className="hover:text-primary-400">
                    Historia
                  </Link>
                </li>
                <li>
                  <Link to="/calendar" className="hover:text-primary-400">
                    Calendario
                  </Link>
                </li>
                <li>
                  <Link to="/donaciones" className="hover:text-primary-400">
                    Donaciones
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Contacto</h3>
              <ul className="space-y-2 text-sm text-dark-300">
                <li>
                  <a
                    href={`mailto:${BAR_CONTACT_EMAIL}`}
                    className="hover:text-primary-400 transition-colors"
                  >
                    {BAR_CONTACT_EMAIL}
                  </a>
                </li>
                <li>+57 1 XXXX XXXX</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-dark-700 pt-8 text-center text-sm text-dark-400">
            <p>
              &copy; {new Date().getFullYear()} {BAR_LEGAL_NAME}. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
