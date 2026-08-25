import Link from 'next/link';
import mongoose from 'mongoose';
import { getCurrentUser, hasPermission, requireAnyPermission } from '@crm/auth';
import { LOGISTICS_READ_PERMISSION_KEYS } from '@crm/logistics/permissions';
import { connectDB, Employee, LogisticsJob } from '@crm/db-core';
import {
  buildLogisticsJobAccessFilter,
  getWarehouseIdsForUser,
  hasGlobalLogisticsScope,
} from '@crm/logistics';
import { listMembershipsForUser } from '@crm/hr';
import { Container, buildDataTableMongoQuery, parseDataTableQuery } from '@crm/ui';
import { Button } from '@crm/ui';
import { JobsTable, type JobRow } from './_components/jobs-table';
import type { JobStatus } from '@crm/db-core';

export default async function LogisticsJobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAnyPermission([...LOGISTICS_READ_PERMISSION_KEYS]);
  await connectDB();

  const canWrite = await hasPermission('logistics:write');
  const query = parseDataTableQuery(await searchParams);

  const { filter, sort, skip, limit } = buildDataTableMongoQuery(query, [
    { key: 'reference', label: '', type: 'string' },
    { key: 'eventName', label: '', type: 'string' },
    { key: 'siteAddress', label: '', type: 'string' },
    { key: 'status', label: '', type: 'string' },
    { key: 'createdAt', label: '', type: 'date' },
  ]);

  const user = await getCurrentUser();
  let listFilter: Record<string, unknown> = filter;
  if (user && !hasGlobalLogisticsScope(user.permissions)) {
    const warehouseIds = await getWarehouseIdsForUser(new mongoose.Types.ObjectId(user.id));
    const memberships = await listMembershipsForUser(user.id);
    const employeeId = memberships[0]?._id;
    const scopeFilter = buildLogisticsJobAccessFilter(warehouseIds, employeeId);
    listFilter = { $and: [filter, scopeFilter] };
  }

  const [items, total] = await Promise.all([
    LogisticsJob.find(listFilter).sort(sort).skip(skip).limit(limit).lean().exec(),
    LogisticsJob.countDocuments(listFilter).exec(),
  ]);

  const employeeIds = [
    ...new Set(
      items.flatMap((j) => [j.pickupEmployeeId, j.dropoffEmployeeId].filter(Boolean).map(String))
    ),
  ];
  const employees = employeeIds.length
    ? await Employee.find({ _id: { $in: employeeIds } })
        .select({ name: 1 })
        .lean()
        .exec()
    : [];
  const employeeMap = new Map(employees.map((e) => [String(e._id), e.name]));

  const data: JobRow[] = items.map((j) => {
    const kitOverride = (j.demandLines ?? []).some((l) => (l.kit?.components?.length ?? 0) > 0);
    return {
      _id: String(j._id),
      reference: j.reference,
      eventName: j.eventName,
      siteAddress: j.siteAddress,
      status: j.status as JobStatus,
      pickupEmployeeName: j.pickupEmployeeId
        ? employeeMap.get(String(j.pickupEmployeeId))
        : undefined,
      dropoffEmployeeName: j.dropoffEmployeeId
        ? employeeMap.get(String(j.dropoffEmployeeId))
        : undefined,
      createdAt: j.createdAt,
      kitOverride,
    };
  });

  return (
    <Container className="flex max-w-6xl flex-col gap-3 md:gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Szállítások</h1>
          <p className="text-muted-foreground text-sm">
            Igénylista, átvételért és leadásért felelős dolgozó, csapat visszajelzés.
          </p>
        </div>
        {canWrite && (
          <Button asChild size="sm">
            <Link href="/logistics/jobs/new">Új szállítás</Link>
          </Button>
        )}
      </div>

      <JobsTable data={data} query={query} total={total} />
    </Container>
  );
}
