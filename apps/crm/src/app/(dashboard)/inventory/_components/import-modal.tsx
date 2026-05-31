'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { INVENTORY_COLUMNS } from '@crm/core/inventory/excel-columns';
import { detectImportGaps } from '@crm/core/inventory/import-config';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchAutocomplete, type SearchItem } from '@/components/ui/search-autocomplete';
import { cn } from '@/lib/utils';
import {
  commitImportAction,
  inspectImportFileAction,
  previewImportAction,
  type ImportState,
} from '../import-actions';
import { searchSuppliersAction } from '../search-actions';

type ImportColumnMap = Partial<Record<string, string | null>>;

type SkuMode = 'from_supplier_sku' | 'from_sm';

type ImportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type MergeFieldKey =
  | 'names'
  | 'descriptions'
  | 'colors'
  | 'pricing'
  | 'dimensions'
  | 'images'
  | 'categories'
  | 'components'
  | 'stock';

const MERGE_FIELD_OPTIONS: Array<{ key: MergeFieldKey; label: string }> = [
  { key: 'names', label: 'Terméknevek' },
  { key: 'descriptions', label: 'Leírások' },
  { key: 'colors', label: 'Színek' },
  { key: 'pricing', label: 'Árak' },
  { key: 'dimensions', label: 'Méretek és súlyok' },
  { key: 'images', label: 'Képek' },
  { key: 'categories', label: 'Kategóriák' },
  { key: 'components', label: 'Alkatrészlista (BOM)' },
  { key: 'stock', label: 'Készletszintek' },
];

const MAPPING_FIELDS: Array<{ key: string; label: string; hint?: string }> = [
  {
    key: 'product_id',
    label: 'Beszállítói azonosító',
    hint: 'Kötelező — ebből generálódik a CRM SKU',
  },
  { key: 'product_id_SM', label: 'CRM SKU (SM)', hint: 'SM import módban kötelező' },
  {
    key: 'crm_category_slug',
    label: 'CRM kategória slug',
    hint: 'Kötelező — létező Category.slug (kis- és nagybetű mindegy)',
  },
  { key: 'crm_supplier_slug', label: 'CRM beszállító slug' },
  { key: 'brand', label: 'Márka' },
  {
    key: 'warehouse 1.',
    label: 'Kispest készlet',
    hint: 'warehouse 1. / 2. / 3. — több raktár egy terméksorban',
  },
  { key: 'warehouse 2.', label: 'Erzsébet készlet' },
  { key: 'warehouse 3.', label: 'Récsei készlet' },
];

const selectClassName = cn(
  'border-input bg-background ring-offset-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs',
  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none'
);

export function ImportModal({ open, onOpenChange }: ImportModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [sheetName, setSheetName] = useState('');
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [gaps, setGaps] = useState<string[]>([]);
  const [showMapping, setShowMapping] = useState(false);
  const [columnMap, setColumnMap] = useState<ImportColumnMap>({});
  const [allowMissingSupplier, setAllowMissingSupplier] = useState(false);
  const [skuMode, setSkuMode] = useState<SkuMode>('from_supplier_sku');
  const [supplierSkuLength, setSupplierSkuLength] = useState('6');
  const [supplierKey, setSupplierKey] = useState('');
  const [supplierLabel, setSupplierLabel] = useState('');
  const [matchKey, setMatchKey] = useState<'sku' | 'supplierSku' | 'ean'>('sku');
  const [isMerge, setIsMerge] = useState(false);
  const [mergeSelective, setMergeSelective] = useState(false);
  const [mergeFields, setMergeFields] = useState<MergeFieldKey[]>(['names']);
  const [preview, setPreview] = useState<Extract<ImportState, { success: true }> | null>(null);
  const [commitResult, setCommitResult] = useState<Extract<ImportState, { success: true }> | null>(
    null
  );
  const [pending, setPending] = useState(false);

  const reset = () => {
    setPreview(null);
    setCommitResult(null);
    setSheetNames([]);
    setSheetName('');
    setExcelHeaders([]);
    setGaps([]);
    setShowMapping(false);
    setColumnMap({});
    setAllowMissingSupplier(false);
    setSkuMode('from_supplier_sku');
    setSupplierSkuLength('6');
    setSupplierKey('');
    setSupplierLabel('');
    setMatchKey('sku');
    setIsMerge(false);
    setMergeSelective(false);
    setMergeFields(['names']);
    if (fileRef.current) fileRef.current.value = '';
  };

  const buildImportConfigJson = () =>
    JSON.stringify({
      sheetName: sheetName || undefined,
      columnMap,
      allowMissingSupplier,
      skuMode,
      supplierSkuCut:
        skuMode === 'from_sm' && supplierSkuLength.trim()
          ? { supplierSkuLength: Number(supplierSkuLength) }
          : undefined,
    });

  useEffect(() => {
    if (excelHeaders.length === 0) return;
    setGaps(detectImportGaps(excelHeaders, columnMap, { skuMode }));
  }, [excelHeaders, columnMap, skuMode]);

  const buildFormData = () => {
    const fd = new FormData();
    fd.set('supplierKey', supplierKey);
    fd.set('matchKey', matchKey);
    fd.set('isMerge', isMerge ? 'true' : 'false');
    fd.set('mergeFieldsJson', JSON.stringify(isMerge && mergeSelective ? mergeFields : []));
    fd.set('importConfigJson', buildImportConfigJson());
    const file = fileRef.current?.files?.[0];
    if (file) fd.set('file', file);
    return fd;
  };

  const inspectFile = async (file: File) => {
    setPending(true);
    try {
      const fd = new FormData();
      fd.set('file', file);
      const result = await inspectImportFileAction(fd);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      setSheetNames(result.sheetNames);
      setSheetName(result.suggestedSheet ?? result.sheetNames[0] ?? '');
      setExcelHeaders(result.headers);
      setGaps(result.gaps);
      if (result.suggestedColumnMap) {
        setColumnMap(result.suggestedColumnMap);
        setShowMapping(result.gaps.length > 0);
      }
    } finally {
      setPending(false);
    }
  };

  const onFileChange = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setPreview(null);
    setCommitResult(null);
    await inspectFile(file);
  };

  const toggleMergeField = (key: MergeFieldKey, checked: boolean) => {
    setMergeFields((prev) =>
      checked ? [...new Set([...prev, key])] : prev.filter((field) => field !== key)
    );
  };

  const runPreview = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error('Válasszon Excel fájlt.');
      return;
    }
    setCommitResult(null);
    setPending(true);
    try {
      const result = await previewImportAction({ success: false, message: '' }, buildFormData());
      if (result.success) {
        setPreview(result);
        toast.info(result.message);
      } else {
        toast.error(result.message);
      }
    } finally {
      setPending(false);
    }
  };

  const runCommit = async () => {
    if (!preview || (preview.preview?.importable ?? 0) === 0) return;
    setPending(true);
    try {
      const result = await commitImportAction({ success: false, message: '' }, buildFormData());
      if (result.success) {
        setCommitResult(result);
        toast.success(result.message);
        if ((result.report?.skipped ?? 0) === 0) {
          reset();
          onOpenChange(false);
        }
      } else {
        toast.error(result.message);
      }
    } finally {
      setPending(false);
    }
  };

  if (!open) return null;

  const skippedList = commitResult?.report?.skippedIssues ?? preview?.preview?.skippedIssues ?? [];
  const headerOptions = ['', ...excelHeaders];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Bezárás"
        onClick={() => {
          reset();
          onOpenChange(false);
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-modal-title"
        className="bg-background relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border shadow-lg"
      >
        <div className="shrink-0 border-b p-6 pb-4">
          <h2 id="import-modal-title" className="text-xl font-bold">
            Készlet importálás
          </h2>
          <p className="text-muted-foreground text-sm">
            Töltse fel a sablon szerinti Excel fájlt. A raktár jelenlét a warehouse 1./2./3. készlet
            oszlopokból származik — üres cella = nincs készlet az adott raktárban.
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="import-file">
              Excel fájl <span className="text-red-600">*</span>
            </Label>
            <Input
              id="import-file"
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={onFileChange}
            />
          </div>

          {sheetNames.length > 1 && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="import-sheet">Munkalap</Label>
              <select
                id="import-sheet"
                className={selectClassName}
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
              >
                {sheetNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {gaps.length > 0 && (
            <div className="border-destructive/40 bg-destructive/5 rounded-md border p-3 text-sm">
              <p className="font-medium">Hiányzó mezők az oszlopokban: {gaps.join(', ')}</p>
              <p className="text-muted-foreground mt-1">
                Állítsa be az oszlop-párosítást alább, vagy töltse ki a sablon hiányzó oszlopait.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="show-mapping"
              checked={showMapping}
              onCheckedChange={(checked) => setShowMapping(checked === true)}
            />
            <Label htmlFor="show-mapping" className="text-sm font-normal">
              Oszlopok párosítása
            </Label>
          </div>

          {showMapping && excelHeaders.length > 0 && (
            <div className="bg-muted/30 flex flex-col gap-3 rounded-md border p-3">
              <p className="text-sm font-medium">Oszlop-párosítás</p>
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {MAPPING_FIELDS.map((field) => (
                  <div
                    key={field.key}
                    className="grid grid-cols-1 gap-1 sm:grid-cols-2 sm:items-center"
                  >
                    <div>
                      <p className="text-sm">{field.label}</p>
                      {field.hint && <p className="text-muted-foreground text-xs">{field.hint}</p>}
                    </div>
                    <select
                      className={selectClassName}
                      value={columnMap[field.key as keyof ImportColumnMap] ?? ''}
                      onChange={(e) =>
                        setColumnMap((prev) => ({
                          ...prev,
                          [field.key]: e.target.value || null,
                        }))
                      }
                    >
                      {headerOptions.map((h) => (
                        <option key={h || 'empty'} value={h}>
                          {h || '— nincs —'}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-muted/30 flex flex-col gap-3 rounded-md border p-3">
            <p className="text-sm font-medium">SKU import mód</p>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="sku-mode"
                  checked={skuMode === 'from_supplier_sku'}
                  onChange={() => setSkuMode('from_supplier_sku')}
                />
                Beszállítói SKU-ból (product_id) — CRM SKU generálás kategória előtaggal
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="sku-mode"
                  checked={skuMode === 'from_sm'}
                  onChange={() => setSkuMode('from_sm')}
                />
                SM SKU-ból (product_id_SM) — beszállítói SKU az SM végéről
              </label>
            </div>
            {skuMode === 'from_sm' && (
              <div className="flex flex-col gap-2 border-t pt-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="supplier-sku-length" className="text-sm">
                    Beszállítói SKU hossza (számjegy)
                  </Label>
                  <Input
                    id="supplier-sku-length"
                    type="number"
                    min={1}
                    required
                    placeholder="pl. 4 vagy 6"
                    value={supplierSkuLength}
                    onChange={(e) => setSupplierSkuLength(e.target.value)}
                    className="max-w-xs"
                  />
                  <p className="text-muted-foreground text-xs">
                    Az SM SKU végéről ennyi számjegy = beszállítói SKU. Példa: 9 jegyű SM
                    „100030001”, hossz 6 → „030001” (előtag + nullák + beszállítói cikk).
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="allow-missing-supplier"
                checked={allowMissingSupplier}
                onCheckedChange={(checked) => setAllowMissingSupplier(checked === true)}
              />
              <Label htmlFor="allow-missing-supplier" className="text-sm font-normal">
                Import beszállító nélkül (később: Tömeges módosítás)
              </Label>
            </div>
            {!allowMissingSupplier && (
              <SearchAutocomplete
                placeholder="Beszállító slug…"
                emptyMessage="Nincs beszállító"
                onSearch={searchSuppliersAction}
                onSelect={(item: SearchItem) => {
                  setSupplierKey(item.sublabel ?? item.value);
                  setSupplierLabel(item.label);
                }}
              />
            )}
            {supplierLabel && (
              <p className="text-muted-foreground text-xs">
                Beszállító: {supplierLabel} ({supplierKey})
              </p>
            )}
          </div>

          <div className="bg-muted/30 flex flex-col gap-3 rounded-md border p-3">
            <p className="text-sm font-medium">Összefűzés (opcionális)</p>
            <div className="flex items-center gap-2">
              <Checkbox
                id="import-is-merge"
                checked={isMerge}
                onCheckedChange={(checked) => setIsMerge(checked === true)}
              />
              <Label htmlFor="import-is-merge" className="text-sm font-normal">
                Meglévő termékek frissítése
              </Label>
            </div>
            {isMerge && (
              <>
                <select
                  className={selectClassName}
                  value={matchKey}
                  onChange={(e) => setMatchKey(e.target.value as 'sku' | 'supplierSku' | 'ean')}
                >
                  <option value="sku">CRM SKU</option>
                  <option value="supplierSku">Beszállítói SKU</option>
                  <option value="ean">EAN</option>
                </select>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={mergeSelective}
                    onCheckedChange={(checked) => setMergeSelective(checked === true)}
                  />
                  Csak kijelölt mezők
                </label>
                {mergeSelective && (
                  <div className="grid grid-cols-2 gap-2">
                    {MERGE_FIELD_OPTIONS.map((field) => (
                      <label key={field.key} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={mergeFields.includes(field.key)}
                          onCheckedChange={(checked) =>
                            toggleMergeField(field.key, checked === true)
                          }
                        />
                        {field.label}
                      </label>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <p className="text-muted-foreground text-xs">
            Sablon:{' '}
            <a
              href="/inventory/template"
              download="keszlet-import-sablon.xlsx"
              className="text-primary underline"
            >
              Excel letöltése (.xlsx)
            </a>{' '}
            — mintasor + Útmutató lap · {INVENTORY_COLUMNS.length} oszlop ·{' '}
            <Link href="/inventory/categories" className="text-primary underline">
              Kategóriák
            </Link>
          </p>

          {preview?.preview && (
            <div className="bg-muted/30 rounded-md border p-3 text-sm">
              <p>
                Importálható: <strong>{preview.preview.importable}</strong> · Kihagyva:{' '}
                <strong className="text-destructive">{preview.preview.skipped}</strong>
              </p>
            </div>
          )}

          {skippedList.length > 0 && (
            <div className="rounded-md border p-3 text-sm">
              <p className="mb-2 font-medium">Kihagyott sorok ({skippedList.length})</p>
              <ul className="text-destructive list-inside list-disc space-y-1">
                {skippedList.map((e, i) => (
                  <li key={i}>
                    {e.row}. sor{e.field ? ` (${e.field})` : ''}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t p-6 pt-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={runPreview} disabled={pending}>
              {pending ? 'Feldolgozás…' : 'Előnézet'}
            </Button>
            <Button
              type="button"
              onClick={runCommit}
              disabled={pending || !preview || (preview.preview?.importable ?? 0) === 0}
            >
              {pending ? 'Mentés…' : 'Import mentése'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              Bezárés
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
