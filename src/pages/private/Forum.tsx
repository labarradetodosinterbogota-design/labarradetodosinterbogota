import React from 'react';
import { Alert } from '../../components/atoms';
import { MessageCircle } from 'lucide-react';

export const Forum: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-dark-200 p-6">
        <h1 className="text-4xl font-bold text-dark-900 mb-2">Foro</h1>
        <p className="text-dark-600">
          Espacio de conversación e ideas entre integrantes
        </p>
      </div>

      <Alert
        type="info"
        message="El foro estará disponible pronto. Aquí podrás debatir y compartir propuestas con la barra."
      />

      <div className="bg-white rounded-lg border border-dark-200 p-8 text-center">
        <MessageCircle className="w-16 h-16 text-dark-300 mx-auto mb-4 opacity-50" />
        <h3 className="text-xl font-semibold text-dark-900 mb-2">Tablero de discusión</h3>
        <p className="text-dark-600">
          Comparte ideas, preguntas y propuestas con otros integrantes
        </p>
      </div>
    </div>
  );
};
