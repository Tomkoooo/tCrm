import { NextResponse } from 'next/server';
import { hasAnyAdminUser } from '@crm/db';

export const runtime = 'nodejs';

export async function GET() {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json({ initialized: false });
  }

  try {
    const initialized = await hasAnyAdminUser();
    return NextResponse.json({ initialized });
  } catch {
    // Treat DB errors as "not initialized" so middleware can redirect to /setup quickly
    return NextResponse.json({ initialized: false });
  }
}
