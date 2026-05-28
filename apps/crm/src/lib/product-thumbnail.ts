/** Count of media-backed images or legacy Excel bild hints. */
export function countProductImages(product: {
  imageIds?: Array<unknown>;
  externalImageHints?: string[];
}): number {
  const stored = product.imageIds?.length ?? 0;
  if (stored > 0) return stored;
  return (product.externalImageHints ?? []).filter((h) => h?.trim()).length;
}

export function resolveProductImageUrls(product: {
  imageIds?: Array<{ toString(): string } | string>;
  externalImageHints?: string[];
}): string[] {
  const fromMedia = (product.imageIds ?? []).map((id) => {
    const s = typeof id === 'string' ? id : id.toString();
    return `/api/inventory/images/${s}`;
  });
  if (fromMedia.length > 0) return fromMedia;

  return (product.externalImageHints ?? [])
    .map((h) => h?.trim())
    .filter((h): h is string => Boolean(h && /^https?:\/\//i.test(h)));
}

export function resolveProductThumbnailUrl(product: {
  imageIds?: Array<{ toString(): string } | string>;
  externalImageHints?: string[];
}): string | undefined {
  const firstId = product.imageIds?.[0];
  if (firstId) {
    const id = typeof firstId === 'string' ? firstId : firstId.toString();
    return `/api/inventory/images/${id}`;
  }
  const hint = product.externalImageHints?.[0]?.trim();
  if (hint && /^https?:\/\//i.test(hint)) {
    return hint;
  }
  return undefined;
}
