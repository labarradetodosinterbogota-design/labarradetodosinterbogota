import React from 'react';
import { BAR_OFFICIAL_NAME } from '../../constants/brand';

export const History: React.FC = () => {
  return (
    <div className="space-y-12 max-w-3xl mx-auto">
      <header className="rounded-2xl border border-white/10 bg-dark-900/90 px-6 py-8 shadow-lg backdrop-blur-sm">
        <h1 className="text-4xl font-bold text-white mb-3">Nuestra historia</h1>
        <p className="text-lg text-dark-200">
          La trayectoria del movimiento de hinchada de {BAR_OFFICIAL_NAME}
        </p>
      </header>

      <div className="max-w-none space-y-8">
        <section className="bg-white rounded-lg border border-dark-200 p-8">
          <h2 className="text-2xl font-bold text-dark-900 mb-4">Los inicios</h2>
          <p className="text-dark-600 mb-4">
            {BAR_OFFICIAL_NAME} nació con una misión clara: unir a la hinchada en torno al club y sostener
            principios de no violencia y decisión democrática.
          </p>
          <p className="text-dark-600 mb-4">
            Desde el primer día fuimos un grupo que celebra la pasión del fútbol respetando a todas las
            personas. Rechazamos la violencia, la exclusión y las decisiones impuestas sin consenso.
          </p>
        </section>

        <section className="bg-white rounded-lg border border-dark-200 p-8">
          <h2 className="text-2xl font-bold text-dark-900 mb-4">Valores en la práctica</h2>
          <p className="text-dark-600 mb-4">A lo largo del tiempo hemos demostrado compromiso con:</p>
          <ul className="text-dark-600 space-y-2 mb-4">
            <li className="flex items-start gap-3">
              <span className="text-primary-400 font-bold mt-1">✓</span>
              <span>Tolerancia cero frente a la violencia o la agresión</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary-400 font-bold mt-1">✓</span>
              <span>Decisiones democráticas en los asuntos importantes</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary-400 font-bold mt-1">✓</span>
              <span>Integración abierta sin importar el origen</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary-400 font-bold mt-1">✓</span>
              <span>Operación transparente y rendición de cuentas</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary-400 font-bold mt-1">✓</span>
              <span>Expresión creativa con arte, música y coreografías</span>
            </li>
          </ul>
        </section>

        <section className="bg-white rounded-lg border border-dark-200 p-8">
          <h2 className="text-2xl font-bold text-dark-900 mb-4">Súmate al movimiento</h2>
          <p className="text-dark-600">
            Seguimos creciendo. Nuestros integrantes vienen de todos los ámbitos, unidos por el amor a{' '}
            {BAR_OFFICIAL_NAME} y por una hinchada responsable y apasionada. Si compartes estos valores, eres
            bienvenido.
          </p>
        </section>
      </div>
    </div>
  );
};
