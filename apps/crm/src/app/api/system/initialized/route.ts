import { NextResponse } from 'next/server';
import { connectDB, hasAnyAdminUser } from '@crm/db-core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!process.env.MONGODB_URI?.trim()) {
    return NextResponse.json({ initialized: false });
  }

  try {
    await connectDB();
    const initialized = await hasAnyAdminUser();
    return NextResponse.json({ initialized }, { headers: { 'cache-control': 'no-store' } });
  } catch {
    return NextResponse.json({ initialized: false }, { headers: { 'cache-control': 'no-store' } });
  }
}
