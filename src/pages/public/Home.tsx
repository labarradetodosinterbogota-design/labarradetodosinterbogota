import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/atoms';
import { BAR_OFFICIAL_NAME } from '../../constants/brand';
import { Heart, Users, Zap, Globe } from 'lucide-react';

export const Home: React.FC = () => {
  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-dark-900 via-dark-800 to-dark-900 px-6 py-20 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            {BAR_OFFICIAL_NAME}
            <span className="text-primary-400"> Barra Popular</span>
          </h1>
          <p className="text-xl text-dark-200 mb-8">
            Hinchada unida • Sin violencia • Decidimos todo en democracia
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button variant="primary" size="lg">
                Únete hoy
              </Button>
            </Link>
            <Link to="/history">
              <Button variant="outline" size="lg">
                Nuestra historia
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 border border-dark-200 hover:shadow-lg transition-shadow">
          <Heart className="w-10 h-10 text-primary-400 mb-3" />
          <h3 className="font-semibold text-dark-900 mb-2">Pasión</h3>
          <p className="text-sm text-dark-600">
            Unidos por el amor al club y al fútbol de {BAR_OFFICIAL_NAME}
          </p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-dark-200 hover:shadow-lg transition-shadow">
          <Users className="w-10 h-10 text-primary-400 mb-3" />
          <h3 className="font-semibold text-dark-900 mb-2">Unidad</h3>
          <p className="text-sm text-dark-600">
            Fuertes juntos, más fuertes por el club
          </p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-dark-200 hover:shadow-lg transition-shadow">
          <Zap className="w-10 h-10 text-primary-400 mb-3" />
          <h3 className="font-semibold text-dark-900 mb-2">Energía</h3>
          <p className="text-sm text-dark-600">
            Llevamos la energía a cada partido
          </p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-dark-200 hover:shadow-lg transition-shadow">
          <Globe className="w-10 h-10 text-primary-400 mb-3" />
          <h3 className="font-semibold text-dark-900 mb-2">Inclusión</h3>
          <p className="text-sm text-dark-600">
            Todas las personas son bienvenidas; la diversidad nos fortalece
          </p>
        </div>
      </section>

      <section className="bg-primary-50 rounded-2xl px-6 py-12 text-center">
        <h2 className="text-3xl font-bold text-dark-900 mb-4">Nuestra misión</h2>
        <p className="text-lg text-dark-600 max-w-2xl mx-auto mb-8">
          Construir una comunidad de hinchada unida, inclusiva y no violenta, que tome decisiones
          democráticas y apoye a {BAR_OFFICIAL_NAME} con pasión y orgullo.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link to="/chants">
            <Button variant="secondary">Ver cantos</Button>
          </Link>
          <Link to="/calendar">
            <Button variant="secondary">Ver calendario</Button>
          </Link>
        </div>
      </section>

      <section className="space-y-6">
        <header className="rounded-2xl border border-white/10 bg-dark-900/90 px-6 py-8 shadow-lg backdrop-blur-sm">
          <h2 className="text-3xl font-bold text-white">Valores fundamentales</h2>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-6 border-l-4 border-primary-400">
            <h3 className="font-semibold text-dark-900 mb-2">Sin violencia</h3>
            <p className="text-dark-600">
              Expresión pacífica y tolerancia cero frente a la violencia
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 border-l-4 border-primary-400">
            <h3 className="font-semibold text-dark-900 mb-2">Democracia</h3>
            <p className="text-dark-600">
              Cada integrante tiene voz; las decisiones importantes se votan en conjunto
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 border-l-4 border-primary-400">
            <h3 className="font-semibold text-dark-900 mb-2">Transparencia</h3>
            <p className="text-dark-600">
              Comunicación abierta, documentación pública y rendición de cuentas
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
