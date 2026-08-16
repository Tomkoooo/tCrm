'use client';

import { useSession } from 'next-auth/react';
import './types';

export function useAuth() {
  const { data: session, status } = useSession();

  return {
    user: session?.user
      ? {
          id: session.user.id,
          email: session.user.email ?? '',
          name: session.user.name ?? '',
          image: session.user.image,
          permissions: session.user.permissions ?? [],
        }
      : null,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
  };
}

export function usePermission(permissionKey: string): boolean {
  const { user } = useAuth();
  return user?.permissions.includes(permissionKey) ?? false;
}
