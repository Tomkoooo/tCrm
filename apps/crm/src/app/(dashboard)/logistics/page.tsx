import Link from 'next/link';
import { requirePermission } from '@crm/auth';
import { connectDB, Reservation, StockMovement } from '@crm/db';
import { Container } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ActiveReservationsTable,
  RecentMovementsTable,
} from './_components/logistics-snippet-tables';

export default async function LogisticsPage() {
  await requirePermission('logistics:read');
  await connectDB();

  const [recentMovements, activeReservations, draftCount, confirmedToday] = await Promise.all([
    StockMovement.find().sort({ createdAt: -1 }).limit(5).lean().exec(),
    Reservation.find({ status: 'active' }).sort({ createdAt: -1 }).limit(5).lean().exec(),
    StockMovement.countDocuments({ status: 'draft' }).exec(),
    StockMovement.countDocuments({
      status: 'confirmed',
      confirmedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    }).exec(),
  ]);

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
            Készletmozgások, foglalások és raktári műveletek.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/logistics/movements">Összes mozgás</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/logistics/reservations">Foglalások</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tervezet mozgások</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Mai megerősítések</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{confirmedToday}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Aktív foglalások</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeReservations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gyors műveletek</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <Link href="/logistics/movements/new/grn" className="text-primary hover:underline">
              Új bevételezés (GRN)
            </Link>
            <Link href="/logistics/movements/new/pick" className="text-primary hover:underline">
              Új kiadás (PICK)
            </Link>
            <Link href="/logistics/movements/new/transfer" className="text-primary hover:underline">
              Új raktárközi átadás
            </Link>
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
    </Container>
  );
}
