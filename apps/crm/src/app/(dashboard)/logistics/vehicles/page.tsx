import { hasPermission, requireAnyPermission } from '@crm/auth';
import { LOGISTICS_VEHICLES_READ_PERMISSION_KEYS } from '@crm/lib';
import { connectDB, Vehicle } from '@crm/db';
import { Container, buildDataTableMongoQuery, parseDataTableQuery } from '@crm/ui';
import type { ColumnDef } from '@crm/ui';
import { VehiclesTable, type VehicleRow } from './_components/vehicles-table';

export default async function LogisticsVehiclesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAnyPermission([...LOGISTICS_VEHICLES_READ_PERMISSION_KEYS]);
  await connectDB();

  const canWrite = await hasPermission('logistics:write');
  const query = parseDataTableQuery(await searchParams);

  const columns: Array<ColumnDef<VehicleRow>> = [
    {
      key: 'name',
      label: 'Név',
      type: 'string',
      sortable: true,
      filterable: true,
      searchable: true,
    },
    {
      key: 'plateNumber',
      label: 'Rendszám',
      type: 'string',
      sortable: true,
      filterable: true,
      searchable: true,
    },
    { key: 'maxWeightKg', label: 'Max. súly (kg)', type: 'number', sortable: true },
    { key: 'maxVolumeM3', label: 'Max. térfogat (m³)', type: 'number', sortable: true },
    { key: 'isActive', label: 'Aktív', type: 'boolean', sortable: true, filterable: true },
  ];

  const { filter, sort, skip, limit } = buildDataTableMongoQuery(query, columns);

  const [items, total] = await Promise.all([
    Vehicle.find(filter).sort(sort).skip(skip).limit(limit).lean().exec(),
    Vehicle.countDocuments(filter).exec(),
  ]);

  const data: VehicleRow[] = items.map((v) => ({
    _id: String(v._id),
    name: v.name,
    plateNumber: v.plateNumber,
    maxWeightKg: v.maxWeightKg,
    maxVolumeM3: v.maxVolumeM3,
    isActive: Boolean(v.isActive),
  }));

  return (
    <Container className="flex max-w-6xl flex-col gap-3 md:gap-4">
      <div>
        <h1 className="text-2xl font-bold">Járműflotta</h1>
        <p className="text-muted-foreground text-sm">
          Járművek méretei és kapacitása a szállítás optimalizáláshoz.
        </p>
      </div>

      <VehiclesTable
        data={data}
        columns={columns}
        query={query}
        total={total}
        canWrite={canWrite}
      />
    </Container>
  );
}
