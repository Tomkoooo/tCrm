import { NextResponse } from 'next/server';
import { requireAnyPermission } from '@crm/auth';
import {
  listMedia,
  resolveOrCreateLinkMedia,
  MEDIA_READ_PERMISSION_KEYS,
  MEDIA_UPLOAD_PERMISSION_KEYS,
} from '@crm/media';

export async function GET(request: Request) {
  await requireAnyPermission([...MEDIA_READ_PERMISSION_KEYS]);

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') ?? undefined;
  const type = searchParams.get('type');
  const unusedOnly = searchParams.get('unusedOnly') === 'true';
  const limit = Number(searchParams.get('limit') ?? '48');
  const skip = Number(searchParams.get('skip') ?? '0');

  const result = await listMedia({
    search,
    type: type === 'file' || type === 'link' ? type : undefined,
    unusedOnly,
    limit: Number.isFinite(limit) ? limit : 48,
    skip: Number.isFinite(skip) ? skip : 0,
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  await requireAnyPermission([...MEDIA_UPLOAD_PERMISSION_KEYS]);

  const body = (await request.json()) as { url?: string; filename?: string };
  const url = String(body.url ?? '').trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: 'Valid http(s) URL required' }, { status: 400 });
  }

  const id = await resolveOrCreateLinkMedia(url);
  return NextResponse.json({ id });
}
