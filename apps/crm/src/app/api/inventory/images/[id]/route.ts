import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { auth } from '@crm/auth';
import { connectDB, getUploadsBucket } from '@crm/db';

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
  const bucket = getUploadsBucket();
  const fileId = new ObjectId(id);

  try {
    const files = await bucket.find({ _id: fileId }).toArray();
    if (files.length === 0) {
      return new NextResponse(null, { status: 404 });
    }
    const file = files[0];
    const stream = bucket.openDownloadStream(fileId);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    const meta = file.metadata as { contentType?: string } | undefined;
    const contentType = meta?.contentType ?? 'image/jpeg';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
