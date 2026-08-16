import type { Types } from 'mongoose';

/**
 * Pure, client-safe pieces of the media service — no `@crm/db-core` import here.
 * Client components must import from this file (or `./upload-constraints`), never
 * from `./service`, which pulls in mongoose and cannot be bundled for the browser.
 */

export type MediaUsageRef = {
  entityType: string;
  entityId: Types.ObjectId | string;
  fieldName?: string;
};

export type MediaListItem = {
  id: string;
  type: 'file' | 'link';
  filename: string;
  url?: string;
  contentType?: string;
  size?: number;
  useCount: number;
  usages: Array<{
    entityType: string;
    entityId: string;
    fieldName: string;
    label?: string;
    sku?: string;
  }>;
  previewUrl: string;
  createdAt: string;
};

export type SelectedMedia = {
  id: string;
  previewUrl: string;
  filename: string;
  type: 'file' | 'link';
  contentType?: string;
};

export function normalizeMediaUrl(url: string): string {
  return url.trim();
}

export function filenameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const base = pathname.split('/').filter(Boolean).pop();
    if (base) return decodeURIComponent(base);
  } catch {
    /* ignore */
  }
  return url.slice(0, 120);
}

export function mediaPreviewPath(mediaId: string): string {
  return `/api/media/${mediaId}/file`;
}
