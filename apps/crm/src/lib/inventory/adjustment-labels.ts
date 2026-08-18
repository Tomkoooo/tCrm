import type { StockAdjustmentReason } from '@crm/db-core';

export const STOCK_ADJUSTMENT_REASON_LABELS: Record<StockAdjustmentReason, string> = {
  physical_count: 'Leltár',
  damage: 'Sérülés',
  correction: 'Korrekció',
  initial_load: 'Kezdő készlet',
  grn: 'Bevételezés',
  pick: 'Kiadás',
  transfer: 'Raktárközi',
  return: 'Visszáru',
  reservation: 'Foglalás',
  other: 'Egyéb',
};
