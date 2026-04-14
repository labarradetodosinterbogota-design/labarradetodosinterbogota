import React from 'react';
import { Avatar, Badge } from '../atoms';
import { User, UserRole } from '../../types';

interface MemberCardProps {
  member: User;
  onClick?: () => void;
  /** Acciones adicionales (p. ej. botón Gestionar para coordinadores). */
  actions?: React.ReactNode;
}

export const MemberCard: React.FC<MemberCardProps> = ({ member, onClick, actions }) => {
  const getRoleColor = (role: UserRole) => {
    return role === UserRole.COORDINATOR_ADMIN ? 'warning' : 'info';
  };

  const getRoleLabel = (role: UserRole) => {
    return role === UserRole.COORDINATOR_ADMIN ? 'Coordinador' : 'Integrante';
  };

  const initials = member.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const interactive = Boolean(onClick);
  const cardClass = interactive
    ? 'bg-white rounded-lg border border-dark-200 p-4 hover:shadow-lg transition-shadow cursor-pointer'
    : 'bg-white rounded-lg border border-dark-200 p-4 hover:shadow-md transition-shadow';

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cardClass}
    >
      <div className="flex items-start gap-3 mb-3">
        <Avatar src={member.photo_url} initials={initials} size="md" />
        <div className="flex-1">
          <h3 className="font-semibold text-dark-900">{member.full_name}</h3>
          <p className="text-sm text-dark-500">{member.member_id}</p>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-dark-500">Rol</span>
          <Badge variant={getRoleColor(member.role)} size="sm">
            {getRoleLabel(member.role)}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-dark-500">Ingreso</span>
          <span className="text-sm font-medium text-dark-900">
            {new Date(member.join_date).toLocaleDateString('es-CO')}
          </span>
        </div>
        {actions ? (
          <div className="pt-2 border-t border-dark-100 mt-2" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
};
