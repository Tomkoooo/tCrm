'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ExternalLink, ImageIcon, Link2, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  fileNeedsCrop,
  isAllowedUploadContentType,
  MEDIA_UPLOAD_ACCEPT,
  MEDIA_UPLOAD_MAX_BYTES,
  mediaPreviewPath,
} from '@crm/lib';
import { Button } from '@/components/ui/button';
import { FileUploadButton } from '@/components/ui/file-upload-button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { MediaListItem, SelectedMedia } from '@/lib/media-types';
import { ImageCropper } from './image-cropper';
import { isPdfMedia, MediaThumbnail } from './media-thumbnail';

type Tab = 'library' | 'upload' | 'link';

function filterUploadFiles(files: File[]): File[] {
  const accepted: File[] = [];
  for (const file of files) {
    if (file.size > MEDIA_UPLOAD_MAX_BYTES) {
      toast.error(`${file.name}: túl nagy fájl (max ${MEDIA_UPLOAD_MAX_BYTES / 1024 / 1024} MB)`);
      continue;
    }
    if (!isAllowedUploadContentType(file.type || '', file.name)) {
      toast.error(`${file.name}: csak kép és PDF tölthető fel`);
      continue;
    }
    accepted.push(file);
  }
  return accepted;
}

export function MediaLibraryPanel({
  active = true,
  mode,
  canUpload,
  canDelete,
  multiple = false,
  maxCount,
  selectedIds = [],
  onConfirm,
  onCancel,
}: {
  active?: boolean;
  mode: 'picker' | 'admin';
  canUpload: boolean;
  canDelete: boolean;
  multiple?: boolean;
  maxCount?: number;
  selectedIds?: string[];
  onConfirm?: (items: SelectedMedia[]) => void;
  onCancel?: () => void;
}) {
  const [tab, setTab] = useState<Tab>('library');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'file' | 'link'>('all');
  const [unusedOnly, setUnusedOnly] = useState(false);
  const [items, setItems] = useState<MediaListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set(selectedIds));
  const [detail, setDetail] = useState<MediaListItem | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkPending, setLinkPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [uploadPending, setUploadPending] = useState(false);
  const processingRef = useRef(false);
  const hadUploadBatchRef = useRef(false);

  useEffect(() => {
    if (active && mode === 'picker') {
      setPicked(new Set(selectedIds));
    }
  }, [active, mode, selectedIds]);

  const loadLibrary = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (unusedOnly) params.set('unusedOnly', 'true');
      params.set('limit', '48');
      const res = await fetch(`/api/media?${params}`);
      if (!res.ok) throw new Error('load failed');
      const json = (await res.json()) as { items: MediaListItem[]; total: number };
      setItems(json.items);
      setTotal(json.total);
    } catch {
      toast.error('Média betöltése sikertelen');
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, unusedOnly]);

  useEffect(() => {
    if (active && tab === 'library') {
      void loadLibrary();
    }
  }, [active, tab, loadLibrary]);

  const selectItem = (item: MediaListItem) => {
    setDetail(item);
    if (mode !== 'picker') return;

    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
        return next;
      }
      if (!multiple) {
        return new Set([item.id]);
      }
      const limit = maxCount ?? 20;
      if (next.size >= limit) {
        toast.message(`Legfeljebb ${limit} média választható`);
        return next;
      }
      next.add(item.id);
      return next;
    });
  };

  const registerUploadedItem = useCallback(
    (json: { id: string; contentType?: string }, filename: string) => {
      const previewUrl = mediaPreviewPath(json.id);
      const newItem: MediaListItem = {
        id: json.id,
        type: 'file',
        filename,
        contentType: json.contentType,
        previewUrl,
        useCount: 0,
        usages: [],
        createdAt: new Date().toISOString(),
      };

      if (mode === 'picker') {
        if (multiple) setPicked((p) => new Set([...p, json.id]));
        else setPicked(new Set([json.id]));
      }
      setItems((list) => [newItem, ...list]);
      setDetail(newItem);
      return newItem;
    },
    [mode, multiple]
  );

  const uploadFormFile = useCallback(
    async (file: File): Promise<boolean> => {
      if (!canUpload) {
        toast.error('Nincs jogosultság feltöltéshez');
        return false;
      }
      const fd = new FormData();
      fd.set('file', file);
      const res = await fetch('/api/uploads', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('upload failed');
      const json = (await res.json()) as {
        id: string;
        deduplicated?: boolean;
        contentType?: string;
      };
      if (json.deduplicated) toast.message(`${file.name}: már szerepel a médiatárban`);
      else toast.success(`${file.name}: feltöltve`);
      registerUploadedItem(json, file.name);
      return true;
    },
    [canUpload, registerUploadedItem]
  );

  const uploadBlob = useCallback(
    async (blob: Blob, filename: string) => {
      setUploadPending(true);
      try {
        const fd = new FormData();
        fd.set('file', new File([blob], filename, { type: blob.type || 'image/jpeg' }));
        const res = await fetch('/api/uploads', { method: 'POST', body: fd });
        if (!res.ok) throw new Error('upload failed');
        const json = (await res.json()) as {
          id: string;
          deduplicated?: boolean;
          contentType?: string;
        };
        if (json.deduplicated) toast.message('Ez a fájl már szerepel a médiatárban');
        else toast.success('Feltöltve');
        registerUploadedItem(json, filename);
        return true;
      } catch {
        toast.error('Feltöltés sikertelen');
        return false;
      } finally {
        setUploadPending(false);
      }
    },
    [registerUploadedItem]
  );

  const processUploadQueue = useCallback(async () => {
    if (processingRef.current || uploadPending || cropFile) return;
    if (uploadQueue.length === 0) return;

    processingRef.current = true;
    const file = uploadQueue[0];
    try {
      if (fileNeedsCrop(file)) {
        setCropFile(file);
        return;
      }
      setUploadPending(true);
      try {
        await uploadFormFile(file);
        setUploadQueue((q) => q.slice(1));
      } catch {
        toast.error(`${file.name}: feltöltés sikertelen`);
      } finally {
        setUploadPending(false);
      }
    } finally {
      processingRef.current = false;
    }
  }, [uploadPending, uploadQueue, cropFile, uploadFormFile]);

  useEffect(() => {
    if (tab === 'upload' && uploadQueue.length > 0 && !cropFile && !uploadPending) {
      void processUploadQueue();
    }
  }, [tab, uploadQueue, cropFile, uploadPending, processUploadQueue]);

  useEffect(() => {
    if (
      tab === 'upload' &&
      hadUploadBatchRef.current &&
      uploadQueue.length === 0 &&
      !cropFile &&
      !uploadPending
    ) {
      hadUploadBatchRef.current = false;
      setTab('library');
    }
  }, [tab, uploadQueue.length, cropFile, uploadPending]);

  const enqueueFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const accepted = filterUploadFiles([...fileList]);
    if (accepted.length === 0) return;
    hadUploadBatchRef.current = true;
    setUploadQueue((q) => [...q, ...accepted]);
    setTab('upload');
  };

  const skipCurrentCrop = () => {
    setUploadQueue((q) => q.slice(1));
    setCropFile(null);
  };

  const cancelAllUploads = () => {
    hadUploadBatchRef.current = false;
    setUploadQueue([]);
    setCropFile(null);
  };

  const handleCropped = async (blob: Blob, filename: string) => {
    const ok = await uploadBlob(blob, filename);
    if (ok) {
      setUploadQueue((q) => q.slice(1));
      setCropFile(null);
    }
  };

  const addLink = async () => {
    if (!canUpload) {
      toast.error('Nincs jogosultság link hozzáadásához');
      return;
    }
    const url = linkUrl.trim();
    if (!url) return;
    setLinkPending(true);
    try {
      const res = await fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error('link failed');
      const json = (await res.json()) as { id: string };
      toast.success('Link hozzáadva');

      const newItem: MediaListItem = {
        id: json.id,
        type: 'link',
        filename: url,
        url,
        previewUrl: mediaPreviewPath(json.id),
        useCount: 0,
        usages: [],
        createdAt: new Date().toISOString(),
      };

      if (mode === 'picker') {
        if (multiple) setPicked((p) => new Set([...p, json.id]));
        else setPicked(new Set([json.id]));
      }
      setItems((list) => [newItem, ...list]);
      setDetail(newItem);
      setLinkUrl('');
      setTab('library');
    } catch {
      toast.error('Érvénytelen vagy ismeretlen URL');
    } finally {
      setLinkPending(false);
    }
  };

  const deleteDetail = async () => {
    if (!detail || !canDelete || deletePending) return;
    if (!confirm('Biztosan törli ezt a médiát?')) return;
    setDeletePending(true);
    try {
      const res = await fetch(`/api/media/${detail.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        toast.error(err.error ?? 'Törlés sikertelen');
        return;
      }
      toast.success('Törölve');
      setPicked((p) => {
        const n = new Set(p);
        n.delete(detail.id);
        return n;
      });
      setDetail(null);
      void loadLibrary();
    } catch {
      toast.error('Törlés sikertelen');
    } finally {
      setDeletePending(false);
    }
  };

  const isUploadBusy = uploadPending || uploadQueue.length > 0 || Boolean(cropFile);

  const handleConfirm = () => {
    if (!onConfirm) return;
    const selected: SelectedMedia[] = [];
    for (const id of picked) {
      const item = items.find((i) => i.id === id);
      if (item) {
        selected.push({
          id: item.id,
          previewUrl: item.previewUrl,
          filename: item.filename,
          type: item.type,
          contentType: item.contentType,
        });
      } else if (selectedIds.includes(id)) {
        selected.push({
          id,
          previewUrl: mediaPreviewPath(id),
          filename: id,
          type: 'file',
        });
      }
    }
    onConfirm(selected);
  };

  const tabs: { id: Tab; label: string; icon: ReactNode; hidden?: boolean }[] = [
    { id: 'library', label: 'Galéria', icon: <ImageIcon className="h-4 w-4" /> },
    {
      id: 'upload',
      label: 'Feltöltés',
      icon: <Upload className="h-4 w-4" />,
      hidden: !canUpload,
    },
    { id: 'link', label: 'Link', icon: <Link2 className="h-4 w-4" />, hidden: !canUpload },
  ];

  const activeCropIndex =
    cropFile && uploadQueue.length > 0
      ? uploadQueue.findIndex((f) => f === cropFile) + 1
      : cropFile
        ? 1
        : 0;
  const activeCropTotal = uploadQueue.length > 0 ? uploadQueue.length : cropFile ? 1 : 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex border-b px-2">
        {tabs
          .filter((t) => !t.hidden)
          .map((t) => (
            <button
              key={t.id}
              type="button"
              className={cn(
                'flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors',
                tab === t.id
                  ? 'border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground border-transparent'
              )}
              onClick={() => setTab(t.id)}
            >
              {t.icon}
              {t.label}
              {t.id === 'upload' && uploadQueue.length > 0 && (
                <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-[10px]">
                  {uploadQueue.length}
                </span>
              )}
            </button>
          ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:flex-row">
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {tab === 'library' && (
            <>
              <div className="flex flex-wrap gap-2">
                <Input
                  className="min-w-[200px] flex-1"
                  placeholder="Keresés név, URL vagy termék alapján…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void loadLibrary();
                  }}
                />
                <select
                  className="border-input bg-background h-9 rounded-md border px-2 text-sm"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
                >
                  <option value="all">Minden típus</option>
                  <option value="file">Fájl</option>
                  <option value="link">Link</option>
                </select>
                {mode === 'admin' && (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={unusedOnly}
                      onCheckedChange={(c) => setUnusedOnly(c === true)}
                    />
                    Csak fel nem használt
                  </label>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  loading={loading}
                  loadingText="Keresés…"
                  onClick={() => void loadLibrary()}
                >
                  Keresés
                </Button>
              </div>
              {loading ? (
                <p className="text-muted-foreground text-sm">Betöltés…</p>
              ) : items.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nincs találat.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={cn(
                        'relative aspect-square overflow-hidden rounded-md border-2 transition-colors',
                        mode === 'picker' && picked.has(item.id)
                          ? 'border-primary ring-primary/30 ring-2'
                          : detail?.id === item.id
                            ? 'border-primary'
                            : 'hover:border-muted-foreground/30 border-transparent'
                      )}
                      onClick={() => selectItem(item)}
                    >
                      <MediaThumbnail
                        src={item.previewUrl}
                        alt={item.filename}
                        filename={item.filename}
                        contentType={item.contentType}
                        type={item.type}
                        className="size-full"
                      />
                      {item.type === 'link' && (
                        <span className="bg-background/80 absolute bottom-1 right-1 rounded px-1 text-[10px]">
                          URL
                        </span>
                      )}
                      {isPdfMedia(item) && (
                        <span className="bg-background/80 absolute bottom-1 left-1 rounded px-1 text-[10px]">
                          PDF
                        </span>
                      )}
                      {item.useCount > 0 && mode === 'admin' && (
                        <span className="bg-background/80 absolute left-1 top-1 rounded px-1 text-[10px]">
                          {item.useCount}×
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-muted-foreground text-xs">{total} média összesen</p>
            </>
          )}

          {tab === 'upload' && canUpload && (
            <div className="flex flex-col gap-4">
              {cropFile ? (
                <>
                  {activeCropTotal > 1 && (
                    <p className="text-muted-foreground text-sm">
                      Vágás: {activeCropIndex} / {activeCropTotal} — {cropFile.name}
                    </p>
                  )}
                  <ImageCropper
                    file={cropFile}
                    onCancel={skipCurrentCrop}
                    onCropped={(blob, name) => void handleCropped(blob, name)}
                  />
                  {uploadQueue.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={cancelAllUploads}>
                      Összes feltöltés megszakítása
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Label>Kép vagy PDF</Label>
                  <FileUploadButton
                    accept={MEDIA_UPLOAD_ACCEPT}
                    multiple
                    loading={isUploadBusy}
                    disabled={uploadPending}
                    onFilesSelected={(files) => enqueueFiles(files)}
                  >
                    Fájlok kiválasztása
                  </FileUploadButton>
                  {isUploadBusy && (
                    <p className="text-muted-foreground text-sm">Feltöltés folyamatban…</p>
                  )}
                  {uploadQueue.length > 0 && !uploadPending && !cropFile && (
                    <p className="text-muted-foreground text-sm">
                      {uploadQueue.length} fájl vár feltöltésre…
                    </p>
                  )}
                  <p className="text-muted-foreground text-xs">
                    Több fájl kijelölhető egyszerre. A képeket egyenként lehet vágni és feltölteni;
                    a PDF-ek közvetlenül kerülnek a médiatárba. Azonos fájl csak egyszer tárolódik
                    (hash alapú deduplikáció).
                  </p>
                </>
              )}
            </div>
          )}

          {tab === 'link' && canUpload && (
            <div className="flex flex-col gap-3">
              <Label htmlFor="media-url">Kép URL (https)</Label>
              <Input
                id="media-url"
                type="url"
                placeholder="https://…"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
              {linkUrl && /^https?:\/\//i.test(linkUrl) ? (
                <img
                  src={linkUrl}
                  alt=""
                  className="max-h-40 rounded-md border object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : null}
              <Button
                type="button"
                loading={linkPending}
                loadingText="Mentés…"
                onClick={() => void addLink()}
              >
                Link hozzáadása
              </Button>
            </div>
          )}
        </div>

        {detail && tab === 'library' && (
          <aside className="border-t pt-4 md:w-64 md:shrink-0 md:border-l md:border-t-0 md:pl-4 md:pt-0">
            <MediaThumbnail
              src={detail.previewUrl}
              alt={detail.filename}
              filename={detail.filename}
              contentType={detail.contentType}
              type={detail.type}
              className="mb-3 aspect-square w-full rounded-md border"
            />
            <p className="truncate text-sm font-medium" title={detail.filename}>
              {detail.filename}
            </p>
            <p className="text-muted-foreground text-xs">
              {detail.type === 'link' ? 'Külső link' : isPdfMedia(detail) ? 'PDF fájl' : 'Fájl'} ·{' '}
              {detail.useCount} használat
            </p>
            {detail.url && (
              <p className="text-muted-foreground mt-1 truncate text-xs" title={detail.url}>
                {detail.url}
              </p>
            )}
            {isPdfMedia(detail) && (
              <Button type="button" variant="outline" size="sm" className="mt-2 w-full" asChild>
                <a href={detail.previewUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1 h-3 w-3" />
                  PDF megnyitása
                </a>
              </Button>
            )}
            {detail.usages.length > 0 && (
              <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs">
                {detail.usages.map((u, i) => (
                  <li key={i}>
                    {u.entityType === 'product' && u.sku ? (
                      <Link href={`/inventory/${u.sku}`} className="text-primary underline">
                        {u.label ?? u.sku}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">
                        {u.entityType}: {u.label ?? u.entityId}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {canDelete && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="mt-3 w-full"
                loading={deletePending}
                loadingText="Törlés…"
                onClick={() => void deleteDetail()}
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Törlés
              </Button>
            )}
          </aside>
        )}
      </div>

      {mode === 'picker' && (
        <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
          <span className="text-muted-foreground text-sm">{picked.size} kiválasztva</span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Mégse
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={picked.size === 0}>
              Kiválasztás
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
