/** Count of stored images (GridFS) or Excel bild1–bild5 hints, whichever is larger. */
export function countProductImages(product: {
  imageIds?: Array<unknown>;
  externalImageHints?: string[];
}): number {
  const stored = product.imageIds?.length ?? 0;
  const hints = (product.externalImageHints ?? []).filter((h) => h?.trim()).length;
  return Math.max(stored, hints);
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
