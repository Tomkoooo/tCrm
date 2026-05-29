import mongoose from 'mongoose';
import { hasPermission, requirePermission } from '@crm/auth';
import { connectDB, SecretProject, User } from '@crm/db';
import { buildSecretProjectListFilter, canManageAllSecrets, toSecretAccessUser } from '@crm/core';
import { Container, parseDataTableQuery, buildDataTableMongoQuery } from '@crm/ui';
import type { ColumnDef } from '@crm/ui';
import { SecretsTable, type SecretProjectRow } from './_components/secrets-table';

function buildAccessMongoFilter(accessUser: ReturnType<typeof toSecretAccessUser>) {
  const base = buildSecretProjectListFilter(accessUser);
  if (Object.keys(base).length === 0) {
    return {};
  }

  const creatorId = new mongoose.Types.ObjectId(accessUser.id);
  const roleObjectIds = accessUser.roleIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const or: Record<string, unknown>[] = [{ createdBy: creatorId }, { allowedUsers: creatorId }];
  if (roleObjectIds.length > 0) {
    or.push({ allowedRoles: { $in: roleObjectIds } });
  }
  return { $or: or };
}

export default async function SecretsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sessionUser = await requirePermission('secrets:read');
  if (!sessionUser) return null;
  await connectDB();

  const dbUser = await User.findById(sessionUser.id).select('roleIds').lean().exec();
  if (!dbUser) {
    return null;
  }
  const accessUser = toSecretAccessUser(sessionUser, dbUser.roleIds ?? []);

  const canWrite = await hasPermission('secrets:write');
  const query = parseDataTableQuery(await searchParams);

  const columns: Array<ColumnDef<SecretProjectRow>> = [
    {
      key: 'name',
      label: 'Projekt',
      type: 'string',
      sortable: true,
      filterable: true,
      searchable: true,
    },
    {
      key: 'description',
      label: 'Leírás',
      type: 'string',
      sortable: true,
      filterable: true,
      searchable: true,
    },
    {
      key: 'secretCount',
      label: 'Titkok száma',
      type: 'number',
      sortable: true,
    },
    {
      key: 'updatedAt',
      label: 'Frissítve',
      type: 'date',
      sortable: true,
    },
  ];

  const accessFilter = buildAccessMongoFilter(accessUser);
  const { filter: tableFilter, sort, skip, limit } = buildDataTableMongoQuery(query, columns);

  const filter =
    Object.keys(accessFilter).length === 0 ? tableFilter : { $and: [accessFilter, tableFilter] };

  const [items, total] = await Promise.all([
    SecretProject.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('name description secrets createdBy createdAt updatedAt')
      .lean()
      .exec(),
    SecretProject.countDocuments(filter).exec(),
  ]);

  const data: SecretProjectRow[] = items.map((p) => ({
    _id: String(p._id),
    name: p.name,
    description: p.description ?? '',
    secretCount: p.secrets?.length ?? 0,
    isOwner: p.createdBy?.toString() === accessUser.id,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

  return (
    <Container className="flex max-w-6xl flex-col gap-3 md:gap-4">
      <div>
        <h1 className="text-2xl font-bold">Titoktár</h1>
        <p className="text-muted-foreground text-sm">
          Titkok projektenként: először hozzon létre egy projektet (pl. ügyfél vagy rendszer neve),
          majd a projekt oldalán adjon hozzá kulcs–érték párokat — egysoros (jelszó) vagy többsoros
          (cég-, bankadatok) mezővel. Az értékek titkosítva tárolódnak; megtekintés és másolás
          kérésre történik.
          {canManageAllSecrets(accessUser) && (
            <span className="block">Ön minden projektet lát (secrets:manage).</span>
          )}
        </p>
        {canWrite && (
          <ol className="text-muted-foreground mt-2 list-decimal space-y-1 pl-5 text-sm">
            <li>Kattintson az „Új projekt” gombra a táblázat felett.</li>
            <li>Nyissa meg a projektet, és adja hozzá a titkokat kulcsonként.</li>
            <li>Opcionálisan ossza meg a projektet szerepkörökkel vagy felhasználókkal.</li>
          </ol>
        )}
      </div>

      <SecretsTable data={data} columns={columns} query={query} total={total} canWrite={canWrite} />
    </Container>
  );
}
