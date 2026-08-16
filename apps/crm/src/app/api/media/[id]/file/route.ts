import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectDB, getUploadsBucket, Media } from '@crm/db-core';

async function streamGridFs(fileId: ObjectId, contentType: string) {
  const bucket = getUploadsBucket();
  const stream = bucket.openDownloadStream(fileId);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

/**
 * Public byte stream — no auth. Media ids aren't guessable/enumerable, and this also
 * has to serve branding assets (favicon, login background) on the unauthenticated
 * login page, so it can't be gated behind a session check.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return new NextResponse(null, { status: 404 });
  }

  await connectDB();

  const media = await Media.findById(id).lean().exec();
  if (!media) {
    return new NextResponse(null, { status: 404 });
  }

  if (media.type === 'link' && media.url) {
    return NextResponse.redirect(media.url, { status: 302 });
  }

  if (media.type === 'file' && media.gridFsId) {
    try {
      return await streamGridFs(
        new ObjectId(media.gridFsId),
        media.contentType ?? 'application/octet-stream'
      );
    } catch {
      return new NextResponse(null, { status: 404 });
    }
  }

  return new NextResponse(null, { status: 404 });
}
