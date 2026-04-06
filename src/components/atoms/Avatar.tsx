import React from 'react';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  initials?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'Avatar',
  initials,
  size = 'md',
  className = '',
}) => {
  const [imageError, setImageError] = React.useState(false);

  React.useEffect(() => {
    setImageError(false);
  }, [src]);

  const sizeStyles: Record<string, string> = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-base',
    lg: 'w-16 h-16 text-lg',
  };

  if (src && !imageError) {
    return (
      <img
        src={src}
        alt={alt}
        onError={() => setImageError(true)}
        className={`${sizeStyles[size]} rounded-full object-cover ${className}`.trim()}
      />
    );
  }

  return (
    <div
      className={`${sizeStyles[size]} rounded-full bg-primary-400 text-white flex items-center justify-center font-semibold ${className}`.trim()}
    >
      {initials || '?'}
    </div>
  );
};
