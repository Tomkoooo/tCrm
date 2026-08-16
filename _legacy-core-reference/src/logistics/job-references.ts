import { Counter } from '@crm/db';

export function formatJobReference(year: number, seq: number): string {
  return `JOB-${year}-${String(seq).padStart(4, '0')}`;
}

export async function generateJobReference(): Promise<string> {
  const year = new Date().getFullYear();
  const counterKey = `job-${year}`;
  const counter = await Counter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { seq: 1 }, $setOnInsert: { key: counterKey } },
    { returnDocument: 'after', upsert: true }
  ).exec();
  const seq = counter?.seq ?? 1;
  return formatJobReference(year, seq);
}

/** Sub-reference for a pickup leg within a job (PDF/email attachment id). */
export function formatPickupReference(jobReference: string, pickupIndex: number): string {
  return `${jobReference}-P${String(pickupIndex).padStart(2, '0')}`;
}
