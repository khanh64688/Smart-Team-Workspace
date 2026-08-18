import React from 'react';

type AvatarSize = 'sm' | 'md' | 'lg';

interface UserAvatarLike {
  full_name?: string | null;
  avatar?: string | null;
}

interface UserAvatarProps {
  user?: UserAvatarLike | null;
  size?: AvatarSize;
  className?: string;
}

const sizeStyles: Record<AvatarSize, string> = {
  sm: 'w-5 h-5 text-[9px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-12 h-12 text-base',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({ user, size = 'md', className = '' }) => {
  const dimensions = sizeStyles[size];
  const name = user?.full_name || '';

  if (!user) {
    return (
      <div
        className={`${dimensions} rounded-full border border-dashed border-gray-700 flex items-center justify-center font-bold text-gray-600 shrink-0 ${className}`}
        title="Unassigned"
      >
        ?
      </div>
    );
  }

  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={name}
        title={name}
        className={`${dimensions} rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${dimensions} rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shrink-0 ${className}`}
      title={name}
    >
      {name.charAt(0).toUpperCase() || 'U'}
    </div>
  );
};
