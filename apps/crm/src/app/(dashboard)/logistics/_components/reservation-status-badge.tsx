import { Badge } from '@/components/ui/badge';
import type { ReservationStatus } from '@crm/db';

const LABELS: Record<ReservationStatus, string> = {
  active: 'Active',
  released: 'Released',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
};

export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  const variant =
    status === 'active'
      ? 'default'
      : status === 'fulfilled'
        ? 'secondary'
        : status === 'cancelled'
          ? 'destructive'
          : 'outline';

  return <Badge variant={variant}>{LABELS[status]}</Badge>;
}
