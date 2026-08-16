import { countActiveAdminUsers } from './users';

export async function hasAnyAdminUser(): Promise<boolean> {
  return (await countActiveAdminUsers()) > 0;
}
