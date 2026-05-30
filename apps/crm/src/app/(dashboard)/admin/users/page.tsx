import Link from 'next/link';
import { hasPermission, requirePermission } from '@crm/auth';
import { connectDB, User } from '@crm/db';
import { Container, parseDataTableQuery, buildDataTableMongoQuery } from '@crm/ui';
import type { ColumnDef } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { UsersTable, type UserRow } from './_components/users-table';

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission('users:read');
  await connectDB();

  const canManage = await hasPermission('users:write');
  const query = parseDataTableQuery(await searchParams);

  const columns: Array<ColumnDef<UserRow>> = [
    {
      key: 'name',
      label: 'Név',
      type: 'string',
      sortable: true,
      filterable: true,
      searchable: true,
    },
    {
      key: 'email',
      label: 'E-mail',
      type: 'string',
      sortable: true,
      filterable: true,
      searchable: true,
    },
    { key: 'isActive', label: 'Aktív', type: 'boolean', sortable: true, filterable: true },
    {
      key: 'roleNames',
      label: 'Szerepkörök',
      type: 'string',
      sortable: false,
      filterable: false,
      searchable: false,
    },
    { key: 'createdAt', label: 'Létrehozva', type: 'date', sortable: true, filterable: false },
  ];

  const { filter, sort, skip, limit } = buildDataTableMongoQuery(query, columns);

  const [items, total] = await Promise.all([
    User.find(filter)
      .populate({ path: 'roleIds', select: 'name' })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),
    User.countDocuments(filter).exec(),
  ]);

  const data: UserRow[] = items.map((u) => {
    const roles = (u.roleIds ?? []) as Array<{ name?: string }>;
    return {
      _id: String(u._id),
      name: u.name,
      email: u.email,
      isActive: Boolean(u.isActive),
      roleNames:
        roles
          .map((r) => r.name ?? '')
          .filter(Boolean)
          .join(', ') || '—',
      createdAt: u.createdAt,
    };
  });

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Felhasználók</h1>
          <p className="text-muted-foreground text-sm">
            Fiókok, szerepkörök és aktivitás kezelése. Törlés helyett inaktiválás.
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/users/invitations">Meghívók</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/users/invite">Meghívó küldése</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/users/new">Új felhasználó</Link>
            </Button>
          </div>
        )}
      </div>

      <UsersTable data={data} columns={columns} query={query} total={total} canManage={canManage} />
    </Container>
  );
}
