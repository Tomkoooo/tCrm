import { auth } from './auth-instance';

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;

  return {
    id: session.user.id,
    email: session.user.email ?? '',
    name: session.user.name ?? '',
    image: session.user.image,
    permissions: session.user.permissions ?? [],
  };
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    const { redirect } = await import('next/navigation');
    redirect('/login');
  }
  return user;
}

export async function requirePermission(permissionKey: string) {
  const user = await requireAuth();
  if (!user?.permissions.includes(permissionKey)) {
    const { notFound } = await import('next/navigation');
    notFound();
  }
  return user;
}

export async function hasPermission(permissionKey: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return user.permissions.includes(permissionKey);
}

export async function hasAnyPermission(permissionKeys: string[]): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return permissionKeys.some((key) => user.permissions.includes(key));
}
