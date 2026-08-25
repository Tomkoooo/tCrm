import { connectDB, Employee, Product, type ILogisticsJob } from '@crm/db-core';
import type { Types } from 'mongoose';
import { sendTemplatedEmail, resolvePublicAppUrl, type SendTemplatedEmailResult } from '@crm/mail';

function formatDateTimeHu(date?: Date): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('hu-HU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function buildPartsListHtml(job: ILogisticsJob): Promise<string> {
  const productIds = [
    ...job.demandLines.map((l) => l.productId).filter(Boolean),
    ...job.demandLines.flatMap((l) => (l.kit?.components ?? []).map((c) => c.productId)),
  ] as Types.ObjectId[];
  const products = productIds.length
    ? await Product.find({ _id: { $in: productIds } })
        .select({ sku: 1, names: 1 })
        .lean()
        .exec()
    : [];
  const productMap = new Map(products.map((p) => [String(p._id), p]));
  const label = (id?: Types.ObjectId) => {
    if (!id) return null;
    const p = productMap.get(String(id));
    if (!p) return null;
    return `${p.names?.hu ?? p.names?.en ?? p.sku} (${p.sku})`;
  };

  const rows = job.demandLines.map((line) => {
    const name = label(line.productId) ?? line.kit?.name ?? 'Egyedi összeállítás';
    const parts = [`<strong>${escapeHtml(name)}</strong> — ${line.requestedQuantity} db`];
    if (line.isOptional) parts.push('<em>(opcionális)</em>');
    const sub = line.kit?.substitutionNote
      ? `<br/><small>${escapeHtml(line.kit.substitutionNote)}</small>`
      : '';
    const components = (line.kit?.components ?? [])
      .map((c) => `${escapeHtml(label(c.productId) ?? '—')} × ${c.quantity}`)
      .join(', ');
    const componentsHtml = components ? `<br/><small>Összetevők: ${components}</small>` : '';
    return `<li>${parts.join(' ')}${sub}${componentsHtml}</li>`;
  });

  return `<ul>${rows.join('')}</ul>`;
}

export async function sendJobAssignmentEmail(
  job: ILogisticsJob,
  role: 'pickup' | 'dropoff',
  actorUserId: Types.ObjectId
): Promise<SendTemplatedEmailResult> {
  await connectDB();

  const employeeId =
    role === 'pickup' ? job.pickupEmployeeId : (job.dropoffEmployeeId ?? job.pickupEmployeeId);
  if (!employeeId) return { sent: false, skipped: true, reason: 'No employee assigned' };

  const employee = await Employee.findById(employeeId).select({ email: 1 }).lean().exec();
  if (!employee?.email) return { sent: false, skipped: true, reason: 'Employee has no email' };

  const partsListHtml = await buildPartsListHtml(job);
  const jobUrl = `${resolvePublicAppUrl()}/logistics/jobs/${job._id}`;

  return sendTemplatedEmail({
    templateKey: role === 'pickup' ? 'job_pickup_assigned' : 'job_dropoff_assigned',
    to: employee.email,
    variables: {
      eventName: job.eventName,
      siteAddress: job.siteAddress,
      pickupAt: formatDateTimeHu(job.pickupAt),
      eventAt: formatDateTimeHu(job.eventAt),
      returnAt: formatDateTimeHu(job.returnAt),
      partsListHtml,
      jobUrl,
    },
    actorUserId,
  });
}
