'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ImageIcon, Link2, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { MediaListItem, SelectedMedia } from '@/lib/media-types';
import { ImageCropper } from './image-cropper';

type Tab = 'library' | 'upload' | 'link';

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
  const [linkUrl, setLinkUrl] = useState('');
  const [linkPending, setLinkPending] = useState(false);
  const [uploadPending, setUploadPending] = useState(false);

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
        toast.message(`Legfeljebb ${limit} kép választható`);
        return next;
      }
      next.add(item.id);
      return next;
    });
  };

  const uploadBlob = async (blob: Blob, filename: string) => {
    if (!canUpload) {
      toast.error('Nincs jogosultság feltöltéshez');
      return;
    }
    setUploadPending(true);
    try {
      const fd = new FormData();
      fd.set('file', new File([blob], filename, { type: blob.type || 'image/jpeg' }));
      const res = await fetch('/api/uploads', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('upload failed');
      const json = (await res.json()) as { id: string; deduplicated?: boolean };
      if (json.deduplicated) toast.message('Ez a kép már szerepel a médiatárban');
      else toast.success('Feltöltve');

      const newItem: MediaListItem = {
        id: json.id,
        type: 'file',
        filename,
        previewUrl: `/api/inventory/images/${json.id}`,
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
      setCropFile(null);
      setTab('library');
    } catch {
      toast.error('Feltöltés sikertelen');
    } finally {
      setUploadPending(false);
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
        previewUrl: `/api/inventory/images/${json.id}`,
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
    if (!detail || !canDelete) return;
    if (!confirm('Biztosan törli ezt a médiát?')) return;
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
    }
  };

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
        });
      } else if (selectedIds.includes(id)) {
        selected.push({
          id,
          previewUrl: `/api/inventory/images/${id}`,
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
                <Button type="button" variant="secondary" onClick={() => void loadLibrary()}>
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
                      <img
                        src={item.previewUrl}
                        alt={item.filename}
                        className="size-full object-cover"
                      />
                      {item.type === 'link' && (
                        <span className="bg-background/80 absolute bottom-1 right-1 rounded px-1 text-[10px]">
                          URL
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
                <ImageCropper
                  file={cropFile}
                  onCancel={() => setCropFile(null)}
                  onCropped={(blob, name) => void uploadBlob(blob, name)}
                />
              ) : (
                <>
                  <Label htmlFor="media-file">Kép fájl</Label>
                  <Input
                    id="media-file"
                    type="file"
                    accept="image/*"
                    disabled={uploadPending}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setCropFile(f);
                    }}
                  />
                  <p className="text-muted-foreground text-xs">
                    A feltöltés előtt vágás és nagyítás állítható. Azonos fájl csak egyszer kerül
                    tárolásra (hash alapú deduplikáció).
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
              <Button type="button" disabled={linkPending} onClick={() => void addLink()}>
                {linkPending ? 'Mentés…' : 'Link hozzáadása'}
              </Button>
            </div>
          )}
        </div>

        {detail && tab === 'library' && (
          <aside className="border-t pt-4 md:w-64 md:shrink-0 md:border-l md:border-t-0 md:pl-4 md:pt-0">
            <img
              src={detail.previewUrl}
              alt={detail.filename}
              className="mb-3 aspect-square w-full rounded-md border object-cover"
            />
            <p className="truncate text-sm font-medium" title={detail.filename}>
              {detail.filename}
            </p>
            <p className="text-muted-foreground text-xs">
              {detail.type === 'link' ? 'Külső link' : 'Fájl'} · {detail.useCount} használat
            </p>
            {detail.url && (
              <p className="text-muted-foreground mt-1 truncate text-xs" title={detail.url}>
                {detail.url}
              </p>
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
