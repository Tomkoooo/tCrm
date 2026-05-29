import Link from 'next/link';
import mongoose from 'mongoose';
import { getCurrentUser, hasPermission, requirePermission } from '@crm/auth';
import { connectDB, LogisticsJob, type ILogisticsJob } from '@crm/db';
import {
  buildLogisticsJobWarehouseFilter,
  getWarehouseIdsForUser,
  hasGlobalLogisticsScope,
  resolveJobPickups,
} from '@crm/core';
import { Container, buildDataTableMongoQuery, parseDataTableQuery } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { JobsTable, type JobRow } from './_components/jobs-table';
import type { JobStatus } from '@crm/db';

export default async function LogisticsJobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission('logistics:read');
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
    const scopeFilter = buildLogisticsJobWarehouseFilter(warehouseIds);
    listFilter = { $and: [filter, scopeFilter] };
  }

  const [items, total] = await Promise.all([
    LogisticsJob.find(listFilter).sort(sort).skip(skip).limit(limit).lean().exec(),
    LogisticsJob.countDocuments(listFilter).exec(),
  ]);

  const data: JobRow[] = items.map((j) => {
    const pickups = resolveJobPickups(j as unknown as ILogisticsJob);
    return {
      _id: String(j._id),
      reference: j.reference,
      eventName: j.eventName,
      siteAddress: j.siteAddress,
      status: j.status as JobStatus,
      pickupCount: pickups.length,
      createdAt: j.createdAt,
    };
  });

  return (
    <Container className="flex max-w-6xl flex-col gap-3 md:gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Szállítások</h1>
          <p className="text-muted-foreground text-sm">
            Esemény szállítások — raktártól a helyszínig és vissza.
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
