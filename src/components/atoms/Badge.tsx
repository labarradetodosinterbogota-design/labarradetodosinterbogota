import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
}) => {
  const variantStyles: Record<string, string> = {
    primary: 'bg-primary-100 text-primary-800',
    secondary: 'bg-dark-100 text-dark-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  };

  const sizeStyles: Record<string, string> = {
    sm: 'px-2 py-0.5 text-xs font-medium rounded',
    md: 'px-3 py-1 text-sm font-medium rounded-lg',
  };

  return (
    <span className={`inline-block ${variantStyles[variant]} ${sizeStyles[size]} ${className}`.trim()}>
      {children}
    </span>
  );
};
