import { Badge } from '@crm/ui';
import type { ReservationStatus } from '@crm/db-core';

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
