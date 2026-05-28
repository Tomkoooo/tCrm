import { NextResponse } from 'next/server';
import { requireAnyPermission, requirePermission } from '@crm/auth';
import { MEDIA_READ_PERMISSION_KEYS } from '@crm/lib';
import { deleteMediaById, getMediaById } from '@crm/core';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAnyPermission([...MEDIA_READ_PERMISSION_KEYS]);
  const { id } = await params;
  const media = await getMediaById(id);
  if (!media) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: String(media._id),
    type: media.type,
    filename: media.filename,
    url: media.url,
    contentType: media.contentType,
    size: media.size,
    useCount: media.useCount,
    usages: media.usages,
    previewUrl: `/api/inventory/images/${String(media._id)}`,
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePermission('media:delete');
  const { id } = await params;
  const result = await deleteMediaById(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.message ?? 'Delete failed' }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
