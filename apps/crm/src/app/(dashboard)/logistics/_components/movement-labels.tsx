import type { MovementStatus, MovementType } from '@crm/db';

const TYPE_LABELS: Record<MovementType, string> = {
  grn: 'Bevételezés',
  pick: 'Kiadás',
  transfer: 'Raktárközi',
  return: 'Visszáru',
  adjustment: 'Korrekció',
};

const STATUS_LABELS: Record<MovementStatus, string> = {
  draft: 'Tervezet',
  confirmed: 'Megerősítve',
  cancelled: 'Elutasítva',
};

export function MovementTypeLabel({ type }: { type: MovementType }) {
  return <span>{TYPE_LABELS[type] ?? type}</span>;
}

export function MovementStatusLabel({ status }: { status: MovementStatus }) {
  return <span>{STATUS_LABELS[status] ?? status}</span>;
}
