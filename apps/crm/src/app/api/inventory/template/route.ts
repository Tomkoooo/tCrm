import { NextResponse } from 'next/server';

/** Legacy URL — redirect to dashboard route (same auth session, reliable download). */
export async function GET(request: Request) {
  const url = new URL('/inventory/template', request.url);
  return NextResponse.redirect(url, 307);
}
