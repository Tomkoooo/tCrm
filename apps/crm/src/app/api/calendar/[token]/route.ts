import { NextResponse } from 'next/server';
import { buildEmployeeCalendarFeed, findEmployeeByCalendarToken } from '@crm/hr';
import { getAppUrl } from '@crm/mail/env';

/**
 * Personal read-only calendar feed, authenticated by the secret token in the URL
 * rather than a session — Google/iCloud/Outlook fetch it without cookies.
 *
 * The token is a 24-byte random value stored on the employee record and can be
 * rotated; the feed exposes only that employee's own schedule.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const cleaned = token.replace(/\.ics$/i, '');

  const employee = await findEmployeeByCalendarToken(cleaned);
  if (!employee) {
    return new NextResponse('Not found', { status: 404 });
  }

  const ics = await buildEmployeeCalendarFeed({ employee, appUrl: getAppUrl() });

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="beosztas.ics"',
      // Subscribed clients poll; a short cache keeps edits visible without hammering.
      'Cache-Control': 'public, max-age=900',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
