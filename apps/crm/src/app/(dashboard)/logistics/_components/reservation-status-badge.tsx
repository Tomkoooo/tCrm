import { Badge } from '@/components/ui/badge';
import type { ReservationStatus } from '@crm/db';

const LABELS: Record<ReservationStatus, string> = {
  active: 'Aktív',
  released: 'Feloldva',
  fulfilled: 'Teljesítve',
  cancelled: 'Törölve',
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
