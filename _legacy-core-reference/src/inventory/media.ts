import { createHash } from 'node:crypto';
import mongoose, { type Types } from 'mongoose';
import { connectDB, getUploadsBucket, Media, Product, type IMedia } from '@crm/db';

export type MediaUsageRef = {
  entityType: string;
  entityId: Types.ObjectId | string;
  fieldName?: string;
};

export function sha256Hex(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

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

export async function findFileMediaByHash(hash: string) {
  await connectDB();
  return Media.findOne({ type: 'file', hash }).lean().exec();
}

export async function uploadFileToMedia(
  buffer: Buffer,
  opts: { filename: string; contentType?: string }
): Promise<{ id: string; deduplicated: boolean }> {
  await connectDB();
  const hash = sha256Hex(buffer);
  const existing = await Media.findOne({ type: 'file', hash }).exec();
  if (existing) {
    return { id: String(existing._id), deduplicated: true };
  }

  const bucket = getUploadsBucket();
  const contentType = opts.contentType || 'application/octet-stream';

  const uploadStream = bucket.openUploadStream(opts.filename, {
    metadata: { originalName: opts.filename, contentType },
  });

  await new Promise<void>((resolve, reject) => {
    uploadStream.on('error', reject);
    uploadStream.on('finish', () => resolve());
    uploadStream.end(buffer);
  });

  const doc = await Media.create({
    type: 'file',
    hash,
    filename: opts.filename,
    contentType,
    size: buffer.length,
    gridFsId: uploadStream.id,
    useCount: 0,
    usages: [],
  });

  return { id: String(doc._id), deduplicated: false };
}

export async function resolveOrCreateLinkMedia(url: string): Promise<string> {
  await connectDB();
  const normalized = normalizeMediaUrl(url);
  if (!normalized) {
    throw new Error('Empty media URL');
  }

  const existing = await Media.findOne({ type: 'link', url: normalized }).exec();
  if (existing) {
    return String(existing._id);
  }

  const doc = await Media.create({
    type: 'link',
    url: normalized,
    filename: filenameFromUrl(normalized),
    contentType: 'image/*',
    useCount: 0,
    usages: [],
  });

  return String(doc._id);
}

export async function resolveLinkUrlsToMediaIds(urls: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const raw of urls) {
    const u = normalizeMediaUrl(raw);
    if (!u) continue;
    if (!/^https?:\/\//i.test(u)) continue;
    ids.push(await resolveOrCreateLinkMedia(u));
  }
  return ids;
}

function toObjectId(id: Types.ObjectId | string): mongoose.Types.ObjectId {
  return typeof id === 'string'
    ? new mongoose.Types.ObjectId(id)
    : new mongoose.Types.ObjectId(id.toString());
}

export async function syncMediaUsage(opts: {
  entityType: string;
  entityId: Types.ObjectId | string;
  fieldName?: string;
  previousMediaIds: Array<Types.ObjectId | string>;
  nextMediaIds: Array<Types.ObjectId | string>;
}): Promise<void> {
  await connectDB();
  const fieldName = opts.fieldName ?? 'imageIds';
  const entityId = toObjectId(opts.entityId);

  const prev = new Set(opts.previousMediaIds.map((id) => id.toString()));
  const next = new Set(opts.nextMediaIds.map((id) => id.toString()));

  const removed = [...prev].filter((id) => !next.has(id));
  const added = [...next].filter((id) => !prev.has(id));

  for (const mediaId of removed) {
    if (!mongoose.Types.ObjectId.isValid(mediaId)) continue;
    const oid = new mongoose.Types.ObjectId(mediaId);
    await Media.updateOne(
      { _id: oid },
      { $pull: { usages: { entityType: opts.entityType, entityId, fieldName } } }
    ).exec();
    const doc = await Media.findById(oid).select('usages').lean().exec();
    await Media.updateOne({ _id: oid }, { $set: { useCount: doc?.usages?.length ?? 0 } }).exec();
  }

  for (const mediaId of added) {
    if (!mongoose.Types.ObjectId.isValid(mediaId)) continue;
    const oid = new mongoose.Types.ObjectId(mediaId);
    await Media.updateOne(
      { _id: oid },
      { $addToSet: { usages: { entityType: opts.entityType, entityId, fieldName } } }
    ).exec();
    const doc = await Media.findById(oid).select('usages').lean().exec();
    await Media.updateOne({ _id: oid }, { $set: { useCount: doc?.usages?.length ?? 0 } }).exec();
  }
}

export async function setEntityMediaIds(opts: {
  entityType: string;
  entityId: Types.ObjectId | string;
  fieldName?: string;
  previousMediaIds: Array<Types.ObjectId | string>;
  nextMediaIds: Array<Types.ObjectId | string>;
}): Promise<void> {
  await syncMediaUsage(opts);
}

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

export function mediaPreviewPath(mediaId: string): string {
  return `/api/inventory/images/${mediaId}`;
}

export async function listMedia(opts: {
  search?: string;
  type?: 'file' | 'link';
  unusedOnly?: boolean;
  limit?: number;
  skip?: number;
}): Promise<{ items: MediaListItem[]; total: number }> {
  await connectDB();
  const limit = Math.min(opts.limit ?? 48, 100);
  const skip = opts.skip ?? 0;

  const filter: Record<string, unknown> = {};
  if (opts.type) filter.type = opts.type;
  if (opts.unusedOnly) filter.useCount = { $lte: 0 };

  const search = opts.search?.trim();
  if (search) {
    const productMatches = await Product.find({
      $or: [
        { sku: new RegExp(escapeRegex(search), 'i') },
        { 'names.hu': new RegExp(escapeRegex(search), 'i') },
        { 'names.en': new RegExp(escapeRegex(search), 'i') },
      ],
    })
      .select('_id sku names')
      .limit(50)
      .lean()
      .exec();

    const productIds = productMatches.map((p) => p._id);
    filter.$or = [
      { filename: new RegExp(escapeRegex(search), 'i') },
      { url: new RegExp(escapeRegex(search), 'i') },
      ...(productIds.length > 0
        ? [{ 'usages.entityId': { $in: productIds }, 'usages.entityType': 'product' }]
        : []),
    ];
  }

  const [docs, total] = await Promise.all([
    Media.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
    Media.countDocuments(filter).exec(),
  ]);

  const productIds = new Set<string>();
  for (const doc of docs) {
    for (const u of doc.usages ?? []) {
      if (u.entityType === 'product') productIds.add(String(u.entityId));
    }
  }

  const products =
    productIds.size > 0
      ? await Product.find({ _id: { $in: [...productIds] } })
          .select('sku names')
          .lean()
          .exec()
      : [];
  const productById = new Map(
    products.map((p) => [String(p._id), { label: p.names?.hu ?? p.names?.en ?? p.sku, sku: p.sku }])
  );

  const items: MediaListItem[] = docs.map((doc) => ({
    id: String(doc._id),
    type: doc.type,
    filename: doc.filename,
    url: doc.url,
    contentType: doc.contentType,
    size: doc.size,
    useCount: doc.useCount ?? 0,
    usages: (doc.usages ?? []).map((u) => {
      const product = u.entityType === 'product' ? productById.get(String(u.entityId)) : undefined;
      return {
        entityType: u.entityType,
        entityId: String(u.entityId),
        fieldName: u.fieldName,
        label: product?.label,
        sku: product?.sku,
      };
    }),
    previewUrl: mediaPreviewPath(String(doc._id)),
    createdAt: new Date(doc.createdAt).toISOString(),
  }));

  return { items, total };
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function getMediaById(id: string): Promise<IMedia | null> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return Media.findById(id).exec();
}

export async function deleteMediaById(id: string): Promise<{ ok: boolean; message?: string }> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(id)) return { ok: false, message: 'Invalid id' };

  const media = await Media.findById(id).exec();
  if (!media) return { ok: false, message: 'Not found' };

  if ((media.usages?.length ?? 0) > 0) {
    for (const u of media.usages) {
      if (u.entityType === 'product') {
        await Product.updateOne({ _id: u.entityId }, { $pull: { imageIds: media._id } }).exec();
      }
    }
  }

  if (media.type === 'file' && media.gridFsId) {
    const bucket = getUploadsBucket();
    try {
      await bucket.delete(media.gridFsId);
    } catch {
      /* file may already be gone */
    }
  }

  await Media.deleteOne({ _id: media._id }).exec();
  return { ok: true };
}

export async function linkUrlsFromMediaIds(
  mediaIds: Array<Types.ObjectId | string>
): Promise<string[]> {
  if (mediaIds.length === 0) return [];
  await connectDB();
  const objectIds = mediaIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id.toString()))
    .map((id) => new mongoose.Types.ObjectId(id.toString()));
  const docs = await Media.find({ _id: { $in: objectIds }, type: 'link' })
    .select('url')
    .lean()
    .exec();
  return docs.map((d) => d.url).filter((u): u is string => Boolean(u));
}

export async function filterFileMediaIds(
  mediaIds: Array<Types.ObjectId | string>
): Promise<string[]> {
  if (mediaIds.length === 0) return [];
  await connectDB();
  const objectIds = mediaIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id.toString()))
    .map((id) => new mongoose.Types.ObjectId(id.toString()));
  const docs = await Media.find({ _id: { $in: objectIds }, type: 'file' })
    .select('_id')
    .lean()
    .exec();
  return docs.map((d) => String(d._id));
}

export async function migrateGridFsIdToMedia(gridFsId: string): Promise<string | null> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(gridFsId)) return null;

  const gfsOid = new mongoose.Types.ObjectId(gridFsId);
  const existing = await Media.findOne({ gridFsId: gfsOid }).lean().exec();
  if (existing) return String(existing._id);

  const bucket = getUploadsBucket();
  const files = await bucket.find({ _id: gfsOid }).toArray();
  if (files.length === 0) return null;

  const file = files[0];
  const meta = file.metadata as { contentType?: string; originalName?: string } | undefined;

  const stream = bucket.openDownloadStream(gfsOid);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);
  const hash = sha256Hex(buffer);

  const byHash = await Media.findOne({ type: 'file', hash }).exec();
  if (byHash) return String(byHash._id);

  const doc = await Media.create({
    type: 'file',
    hash,
    filename: meta?.originalName ?? file.filename,
    contentType: meta?.contentType ?? 'application/octet-stream',
    size: file.length,
    gridFsId: file._id,
    useCount: 0,
    usages: [],
  });

  return String(doc._id);
}
