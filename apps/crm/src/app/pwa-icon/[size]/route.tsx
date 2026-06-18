import { ImageResponse } from 'next/og';
import { PwaIconMarkup } from '@/lib/pwa/icon-markup';

const ALLOWED_SIZES = new Set(['192', '512']);

export async function GET(_request: Request, context: { params: Promise<{ size: string }> }) {
  const { size } = await context.params;
  if (!ALLOWED_SIZES.has(size)) {
    return new Response('Not found', { status: 404 });
  }

  const px = Number(size);

  return new ImageResponse(<PwaIconMarkup size={px} />, {
    width: px,
    height: px,
  });
}
