/** Client file input `accept` and server-side upload validation. */
export const MEDIA_UPLOAD_ACCEPT = 'image/*,application/pdf';

export const MEDIA_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;

export function isPdfContentType(contentType: string | undefined): boolean {
  if (!contentType) return false;
  const ct = contentType.toLowerCase();
  return ct === 'application/pdf' || ct.endsWith('+pdf');
}

export function isImageContentType(contentType: string | undefined): boolean {
  return Boolean(contentType?.toLowerCase().startsWith('image/'));
}

export function isPdfFilename(filename: string): boolean {
  return /\.pdf$/i.test(filename);
}

export function isAllowedUploadContentType(contentType: string, filename?: string): boolean {
  const ct = contentType.toLowerCase().trim();
  if (isImageContentType(ct) || isPdfContentType(ct)) return true;
  if (filename && isPdfFilename(filename)) return true;
  return false;
}

/** Raster images go through the cropper; PDF/SVG/GIF upload as-is. */
export function fileNeedsCrop(file: File): boolean {
  const type = file.type.toLowerCase();
  if (!type.startsWith('image/')) return false;
  if (type === 'image/svg+xml' || type === 'image/gif') return false;
  return true;
}

export function mediaPreviewPath(mediaId: string): string {
  return `/api/inventory/images/${mediaId}`;
}
