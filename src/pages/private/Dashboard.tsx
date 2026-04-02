import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Users, FileText, Vote, Calendar, MessageCircle, Zap, Banknote } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'coordinator_admin';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-dark-900 mb-2">Hola, {user?.full_name}.</h1>
        <p className="text-dark-600">Carné de integrante: {user?.member_id}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          to="/membership-card"
          className="bg-white rounded-lg border border-dark-200 p-6 hover:shadow-lg transition-shadow group"
        >
          <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-400 flex items-center justify-center mb-3 group-hover:bg-primary-400 group-hover:text-white transition-colors">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-dark-900 mb-2">Carné digital</h3>
          <p className="text-sm text-dark-600">Consulta tu carné de integrante</p>
        </Link>

        <Link
          to="/members"
          className="bg-white rounded-lg border border-dark-200 p-6 hover:shadow-lg transition-shadow group"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-400 flex items-center justify-center mb-3 group-hover:bg-blue-400 group-hover:text-white transition-colors">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-dark-900 mb-2">Directorio</h3>
          <p className="text-sm text-dark-600">Integrantes de la barra</p>
        </Link>

        <Link
          to="/voting"
          className="bg-white rounded-lg border border-dark-200 p-6 hover:shadow-lg transition-shadow group"
        >
          <div className="w-10 h-10 rounded-lg bg-green-100 text-green-400 flex items-center justify-center mb-3 group-hover:bg-green-400 group-hover:text-white transition-colors">
            <Vote className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-dark-900 mb-2">Votaciones</h3>
          <p className="text-sm text-dark-600">Participa en las decisiones del grupo</p>
        </Link>

        <Link
          to="/documents"
          className="bg-white rounded-lg border border-dark-200 p-6 hover:shadow-lg transition-shadow group"
        >
          <div className="w-10 h-10 rounded-lg bg-yellow-100 text-yellow-400 flex items-center justify-center mb-3 group-hover:bg-yellow-400 group-hover:text-white transition-colors">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-dark-900 mb-2">Documentos</h3>
          <p className="text-sm text-dark-600">Documentación oficial</p>
        </Link>

        <Link
          to="/calendar"
          className="bg-white rounded-lg border border-dark-200 p-6 hover:shadow-lg transition-shadow group"
        >
          <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-400 flex items-center justify-center mb-3 group-hover:bg-purple-400 group-hover:text-white transition-colors">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-dark-900 mb-2">Eventos</h3>
          <p className="text-sm text-dark-600">Partidos y actividades</p>
        </Link>

        <Link
          to="/contribute"
          className="bg-white rounded-lg border border-dark-200 p-6 hover:shadow-lg transition-shadow group"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
            <Banknote className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-dark-900 mb-2">Auxilio / aporte</h3>
          <p className="text-sm text-dark-600">Apoya a la barra con un aporte seguro</p>
        </Link>

        <Link
          to="/forum"
          className="bg-white rounded-lg border border-dark-200 p-6 hover:shadow-lg transition-shadow group"
        >
          <div className="w-10 h-10 rounded-lg bg-red-100 text-red-400 flex items-center justify-center mb-3 group-hover:bg-red-400 group-hover:text-white transition-colors">
            <MessageCircle className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-dark-900 mb-2">Foro</h3>
          <p className="text-sm text-dark-600">Conversaciones del grupo</p>
        </Link>

        {isAdmin && (
          <Link
            to="/admin"
            className="bg-gradient-to-br from-primary-400 to-primary-500 rounded-lg p-6 hover:shadow-lg transition-shadow group text-white md:col-span-2 lg:col-span-1"
          >
            <div className="w-10 h-10 rounded-lg bg-white bg-opacity-20 flex items-center justify-center mb-3 group-hover:bg-opacity-30 transition-all">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-semibold mb-2">Panel de administración</h3>
            <p className="text-sm text-primary-100">Gestión de recursos del grupo</p>
          </Link>
        )}
      </div>
    </div>
  );
};
