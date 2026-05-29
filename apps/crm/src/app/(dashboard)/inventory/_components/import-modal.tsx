'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchAutocomplete, type SearchItem } from '@/components/ui/search-autocomplete';
import { commitImportAction, previewImportAction, type ImportState } from '../import-actions';
import { searchSuppliersAction, searchWarehousesAction } from '../search-actions';

type ImportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ImportModal({ open, onOpenChange }: ImportModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [supplierKey, setSupplierKey] = useState('');
  const [supplierLabel, setSupplierLabel] = useState('');
  const [warehouseKey, setWarehouseKey] = useState('');
  const [warehouseLabel, setWarehouseLabel] = useState('');
  const [preview, setPreview] = useState<Extract<ImportState, { success: true }> | null>(null);
  const [commitResult, setCommitResult] = useState<Extract<ImportState, { success: true }> | null>(
    null
  );
  const [pending, setPending] = useState(false);

  const reset = () => {
    setPreview(null);
    setCommitResult(null);
    setSupplierKey('');
    setSupplierLabel('');
    setWarehouseKey('');
    setWarehouseLabel('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const buildFormData = () => {
    const fd = new FormData();
    fd.set('supplierKey', supplierKey);
    fd.set('warehouseKey', warehouseKey);
    const file = fileRef.current?.files?.[0];
    if (file) fd.set('file', file);
    return fd;
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
        className="bg-background relative z-10 flex max-h-[90vh] w-full max-w-xl flex-col gap-4 overflow-y-auto rounded-lg border p-6 shadow-lg"
      >
        <div>
          <h2 id="import-modal-title" className="text-xl font-bold">
            Készlet importálás
          </h2>
          <p className="text-muted-foreground text-sm">
            A <strong>CRM SKU</strong> automatikusan készül: kategória SKU előtag +{' '}
            <strong>product_id</strong> (beszállítói cikkszám). Kötelező:{' '}
            <strong>crm_category_slug</strong>, <strong>product_id</strong>.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Sablon letöltése</Label>
          <Button type="button" variant="outline" asChild>
            <a href="/api/inventory/template" download>
              Excel sablon (.xlsx)
            </a>
          </Button>
        </div>

        <div className="border-primary/30 bg-primary/5 rounded-md border p-3 text-sm">
          <p className="font-medium">Beszállítók felvétele</p>
          <p className="text-muted-foreground mt-1">
            Előbb regisztrálja a partnert:{' '}
            <Link href="/inventory/suppliers" className="text-primary font-medium underline">
              Készletkezelés → Beszállítók
            </Link>
            . A kulcs (slug) kerül a <code className="text-xs">crm_supplier_slug</code> oszlopba.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Alapértelmezett beszállító (opcionális)</Label>
          <SearchAutocomplete
            placeholder="Ha a sorban nincs crm_supplier_slug…"
            emptyMessage="Nincs beszállító — hozza létre a Beszállítók menüben"
            onSearch={searchSuppliersAction}
            onSelect={(item: SearchItem) => {
              setSupplierKey(item.sublabel ?? item.value);
              setSupplierLabel(item.label);
            }}
          />
          {supplierLabel && (
            <p className="text-muted-foreground text-xs">
              Kiválasztva: {supplierLabel} ({supplierKey})
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label>Alapértelmezett raktár (opcionális)</Label>
          <SearchAutocomplete
            placeholder="Ha a sorban nincs crm_warehouse_slug…"
            emptyMessage="Nincs raktár — hozza létre: Admin → Raktárak"
            onSearch={searchWarehousesAction}
            onSelect={(item: SearchItem) => {
              setWarehouseKey(item.value);
              setWarehouseLabel(item.label);
            }}
          />
          {warehouseLabel && (
            <p className="text-muted-foreground text-xs">
              Kiválasztva: {warehouseLabel} ({warehouseKey})
            </p>
          )}
          <p className="text-muted-foreground text-xs">
            Oszlop: <code className="text-xs">crm_warehouse_slug</code> — több raktár:{' '}
            <code className="text-xs">kispest,erzsebet</code>
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="import-file">
            Excel fájl <span className="text-red-600">*</span>
          </Label>
          <Input id="import-file" ref={fileRef} type="file" accept=".xlsx,.xls" />
        </div>

        {preview?.preview && (
          <div className="bg-muted/30 rounded-md border p-3 text-sm">
            <p>
              Importálható: <strong>{preview.preview.importable}</strong> · Kihagyva:{' '}
              <strong className="text-destructive">{preview.preview.skipped}</strong> ·
              Figyelmeztetés: <strong>{preview.preview.warnings}</strong>
            </p>
          </div>
        )}

        {skippedList.length > 0 && (
          <div className="max-h-48 overflow-y-auto rounded-md border p-3 text-sm">
            <p className="text-destructive mb-2 font-medium">Kihagyott / hibás sorok</p>
            <ul className="text-destructive list-inside list-disc space-y-1">
              {skippedList.map((e, i) => (
                <li key={i}>
                  {e.row}. sor{e.field ? ` (${e.field})` : ''}: {e.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {commitResult?.report && (
          <div className="bg-muted/30 rounded-md border p-3 text-sm">
            <p>
              Létrehozva: {commitResult.report.created} · Frissítve: {commitResult.report.updated} ·
              Kihagyva: {commitResult.report.skipped}
            </p>
          </div>
        )}

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
            Bezárás
          </Button>
        </div>
      </div>
    </div>
  );
}
