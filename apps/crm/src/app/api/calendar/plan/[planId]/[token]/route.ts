import { NextResponse } from 'next/server';
import {
  buildPlanCalendarForEmployee,
  findEmployeeByCalendarToken,
  getSchedulePlanById,
} from '@crm/hr';
import { getAppUrl } from '@crm/mail/env';

/**
 * One-off ".ics letöltés" from a published schedule e-mail: just that plan's shifts
 * for the employee the token belongs to. Token-authenticated like the rolling feed.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ planId: string; token: string }> }
) {
  const { planId, token } = await params;
  const cleaned = token.replace(/\.ics$/i, '');

  const [employee, plan] = await Promise.all([
    findEmployeeByCalendarToken(cleaned),
    getSchedulePlanById(planId),
  ]);
  if (!employee || !plan) return new NextResponse('Not found', { status: 404 });

  // A token for one company's employee must not read another company's plan.
  if (!plan.employeeIds.some((id) => id.equals(employee._id))) {
    return new NextResponse('Not found', { status: 404 });
  }

  const ics = await buildPlanCalendarForEmployee({
    planId: plan._id,
    employee,
    planTitle: plan.title,
    appUrl: getAppUrl(),
  });

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="beosztas.ics"',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
