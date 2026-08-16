import { Counter } from '@crm/db';
import type { MovementType } from '@crm/db';

const TYPE_PREFIX: Record<MovementType, string> = {
  grn: 'GRN',
  pick: 'PICK',
  transfer: 'TRF',
  adjustment: 'ADJ',
  return: 'RET',
};

export function formatMovementReference(type: MovementType, year: number, seq: number): string {
  const prefix = TYPE_PREFIX[type];
  return `${prefix}-${year}-${String(seq).padStart(5, '0')}`;
}

export async function generateMovementReference(type: MovementType): Promise<string> {
  const year = new Date().getFullYear();
  const counterKey = `${type}-${year}`;
  const counter = await Counter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { seq: 1 }, $setOnInsert: { key: counterKey } },
    { returnDocument: 'after', upsert: true }
  ).exec();
  const seq = counter?.seq ?? 1;
  return formatMovementReference(type, year, seq);
}
