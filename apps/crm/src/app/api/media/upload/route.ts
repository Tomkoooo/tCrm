import { NextResponse } from 'next/server';
import { requireAnyPermission } from '@crm/auth';
import {
  isAllowedUploadContentType,
  MEDIA_UPLOAD_MAX_BYTES,
  MEDIA_UPLOAD_PERMISSION_KEYS,
  uploadFileToMedia,
} from '@crm/media';

export async function POST(request: Request) {
  await requireAnyPermission([...MEDIA_UPLOAD_PERMISSION_KEYS]);

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'File required' }, { status: 400 });
  }

  if (file.size > MEDIA_UPLOAD_MAX_BYTES) {
    return NextResponse.json({ error: 'File too large' }, { status: 413 });
  }

  const contentType = file.type || 'application/octet-stream';
  if (!isAllowedUploadContentType(contentType, file.name)) {
    return NextResponse.json({ error: 'Only images and PDF files are allowed' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await uploadFileToMedia(buffer, {
    filename: file.name,
    contentType,
  });

  return NextResponse.json({
    id: result.id,
    deduplicated: result.deduplicated,
    contentType,
  });
}
