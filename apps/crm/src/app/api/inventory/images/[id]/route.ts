import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { auth } from '@crm/auth';
import { connectDB, getUploadsBucket, Media } from '@crm/db';
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
      'Cache-Control': 'private, max-age=3600',
    },
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse(null, { status: 401 });
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return new NextResponse(null, { status: 404 });
  }

  await connectDB();

  const media = await Media.findById(id).lean().exec();
  if (media) {
    if (media.type === 'link' && media.url) {
      return NextResponse.redirect(media.url, { status: 302 });
    }
    if (media.type === 'file' && media.gridFsId) {
      try {
        return await streamGridFs(new ObjectId(media.gridFsId), media.contentType ?? 'image/jpeg');
      } catch {
        return new NextResponse(null, { status: 404 });
      }
    }
  }

  // Legacy: raw GridFS id (pre-Media migration)
  try {
    const bucket = getUploadsBucket();
    const files = await bucket.find({ _id: new ObjectId(id) }).toArray();
    if (files.length === 0) {
      return new NextResponse(null, { status: 404 });
    }
    const file = files[0];
    const meta = file.metadata as { contentType?: string } | undefined;
    return await streamGridFs(new ObjectId(id), meta?.contentType ?? 'image/jpeg');
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
