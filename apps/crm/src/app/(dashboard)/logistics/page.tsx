import Link from 'next/link';
import { requirePermission } from '@crm/auth';
import { connectDB, Reservation, StockMovement } from '@crm/db';
import { Container } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ReservationStatusBadge } from './_components/reservation-status-badge';

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

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Logistics</h1>
          <p className="text-muted-foreground text-sm">
            Stock movements, reservations, and warehouse operations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/logistics/movements">All movements</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/logistics/reservations">Reservations</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Draft movements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Confirmed today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{confirmedToday}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active reservations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeReservations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <Link href="/logistics/movements/new/grn" className="text-primary hover:underline">
              New GRN
            </Link>
            <Link href="/logistics/movements/new/pick" className="text-primary hover:underline">
              New pick list
            </Link>
            <Link href="/logistics/movements/new/transfer" className="text-primary hover:underline">
              New transfer
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent movements</CardTitle>
          </CardHeader>
          <CardContent>
            {recentMovements.length === 0 ? (
              <p className="text-muted-foreground text-sm">No movements yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentMovements.map((m) => (
                    <TableRow key={String(m._id)}>
                      <TableCell>
                        <Link
                          href={`/logistics/movements/${String(m._id)}`}
                          className="text-primary hover:underline"
                        >
                          {m.reference}
                        </Link>
                      </TableCell>
                      <TableCell className="uppercase">{m.type}</TableCell>
                      <TableCell>{m.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active reservations</CardTitle>
          </CardHeader>
          <CardContent>
            {activeReservations.length === 0 ? (
              <p className="text-muted-foreground text-sm">No active reservations.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Qty</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeReservations.map((r) => (
                    <TableRow key={String(r._id)}>
                      <TableCell>{r.quantity}</TableCell>
                      <TableCell>{r.sourceRef ?? r.sourceType}</TableCell>
                      <TableCell>
                        <ReservationStatusBadge status={r.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
