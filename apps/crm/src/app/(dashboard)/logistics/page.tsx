import Link from 'next/link';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';
import { requirePermission } from '@crm/auth';
import { connectDB, Reservation, StockMovement, User } from '@crm/db';
import { getLogisticsKpiSummary, getVehicleComplianceWarnings } from '@crm/core';
import { Container } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ActiveReservationsTable,
  RecentMovementsTable,
} from './_components/logistics-snippet-tables';

function formatHuf(n: number) {
  return new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'HUF',
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function LogisticsPage() {
  await requirePermission('logistics:read');
  await connectDB();

  const [recentMovements, activeReservations, draftCount, confirmedToday, kpi, complianceWarnings] =
    await Promise.all([
      StockMovement.find().sort({ createdAt: -1 }).limit(5).lean().exec(),
      Reservation.find({ status: 'active' }).sort({ createdAt: -1 }).limit(5).lean().exec(),
      StockMovement.countDocuments({ status: 'draft' }).exec(),
      StockMovement.countDocuments({
        status: 'confirmed',
        confirmedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }).exec(),
      getLogisticsKpiSummary(),
      getVehicleComplianceWarnings(30),
    ]);

  const driverIds = kpi.topDriversByLoss.map((d) => d.driverId);
  const drivers = driverIds.length
    ? await User.find({ _id: { $in: driverIds } })
        .select('name email')
        .lean()
        .exec()
    : [];
  const driverNameMap = new Map(
    drivers.map((d) => [String(d._id), d.name || d.email || String(d._id)])
  );

  const typeLabels: Record<string, string> = {
    grn: 'Bevételezés',
    pick: 'Kiadás',
    transfer: 'Raktárközi',
    return: 'Visszáru',
    adjustment: 'Korrekció',
  };
  const statusLabels: Record<string, string> = {
    draft: 'Tervezet',
    confirmed: 'Megerősítve',
    cancelled: 'Elutasítva',
  };

  const movementRows = recentMovements.map((m) => ({
    _id: String(m._id),
    reference: m.reference,
    type: typeLabels[m.type] ?? m.type,
    status: statusLabels[m.status] ?? m.status,
  }));

  const reservationRows = activeReservations.map((r) => ({
    _id: String(r._id),
    reference: r.sourceRef ?? r.sourceType,
    status: r.status,
    lineCount: 1,
  }));

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Logisztika</h1>
          <p className="text-muted-foreground text-sm">
            Készletmozgások, szállítások, hiánykövetés és KPI-k.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/logistics/jobs">Szállítások</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/logistics/movements">Összes mozgás</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/logistics/reservations">Foglalások</Link>
          </Button>
        </div>
      </div>

      {complianceWarnings.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-800">
              Jármű figyelmeztetések (30 nap)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {complianceWarnings.map((warning) => (
                <li
                  key={`${warning.vehicleId}-${warning.kind}`}
                  className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 last:border-0"
                >
                  <span>
                    <Link
                      href={`/logistics/vehicles/${warning.vehicleId}`}
                      className="text-primary font-medium hover:underline"
                    >
                      {warning.vehicleName}
                    </Link>
                    <span className="text-muted-foreground ml-2">{warning.plateNumber}</span>
                    <span className="text-muted-foreground block text-xs">
                      {warning.kind === 'registration' ? 'Forgalmi engedély' : 'Biztosítás'} ·{' '}
                      {format(new Date(warning.dueDate), 'yyyy. MMM d.', { locale: hu })}
                    </span>
                  </span>
                  <span
                    className={
                      warning.isOverdue
                        ? 'shrink-0 font-medium text-red-600'
                        : 'shrink-0 font-medium text-amber-700'
                    }
                  >
                    {warning.isOverdue ? 'Lejárt' : `${warning.daysUntilDue} nap múlva`}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Aktív szállítások</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.activeJobs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Hiány arány</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.lossRatePercent}%</div>
            <p className="text-muted-foreground text-xs">
              {kpi.totalLost} / {kpi.totalGathered} db (lezárt szállítások)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Hiány értéke (HUF)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatHuf(kpi.lostValueHuf)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tervezet mozgások</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftCount}</div>
            <p className="text-muted-foreground text-xs">Mai megerősítés: {confirmedToday}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Helyszínek — legtöbb hiány</CardTitle>
          </CardHeader>
          <CardContent>
            {kpi.topSitesByLoss.length === 0 ? (
              <p className="text-muted-foreground text-sm">Még nincs lezárt hiány adat.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {kpi.topSitesByLoss.map((s) => (
                  <li key={s.siteAddress} className="flex justify-between gap-2 border-b pb-2">
                    <span>
                      {s.eventName}
                      <span className="text-muted-foreground block text-xs">{s.siteAddress}</span>
                    </span>
                    <span className="shrink-0 font-medium text-amber-700">{s.totalLost} db</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sofőr / csapat — legtöbb hiány</CardTitle>
          </CardHeader>
          <CardContent>
            {kpi.topDriversByLoss.length === 0 ? (
              <p className="text-muted-foreground text-sm">Még nincs hozzárendelt hiány.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {kpi.topDriversByLoss.map((d) => (
                  <li key={d.driverId} className="flex justify-between gap-2 border-b pb-2">
                    <span>{driverNameMap.get(d.driverId) ?? d.driverId}</span>
                    <span className="shrink-0 font-medium text-amber-700">{d.totalLost} db</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Legutóbbi mozgások</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentMovementsTable data={movementRows} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aktív foglalások</CardTitle>
          </CardHeader>
          <CardContent>
            <ActiveReservationsTable data={reservationRows} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Gyors műveletek</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-sm">
          <Link href="/logistics/jobs/new" className="text-primary hover:underline">
            Új szállítás
          </Link>
          <Link href="/logistics/movements/new/grn" className="text-primary hover:underline">
            Új bevételezés (GRN)
          </Link>
          <Link href="/logistics/movements/new/pick" className="text-primary hover:underline">
            Új kiadás (PICK)
          </Link>
          <Link href="/logistics/vehicles" className="text-primary hover:underline">
            Járműflotta
          </Link>
        </CardContent>
      </Card>
    </Container>
  );
}
