'use client';

import { useState } from 'react';
import {
  Button,
  EntitySheet,
  Input,
  Label,
  SearchAutocomplete,
  Textarea,
  type SearchItem,
} from '@crm/ui';
import { productDisplayName } from '@crm/lib';
import { searchProductsAction } from '../../../inventory/search-actions';
import { ProductSkuLabel } from '@/components/product-sku-label';
import { type DemandKitDraft, type KitComponentDraft } from './job-create-types';

export function JobCreateKitSheet({
  open,
  title,
  description,
  initial,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  title: string;
  description: string;
  initial: DemandKitDraft;
  onOpenChange: (open: boolean) => void;
  onSave: (kit: DemandKitDraft) => void;
}) {
  const [name, setName] = useState(initial.name ?? '');
  const [note, setNote] = useState(initial.substitutionNote ?? '');
  const [components, setComponents] = useState<KitComponentDraft[]>(initial.components);
  const [pendingId, setPendingId] = useState('');
  const [pendingSku, setPendingSku] = useState('');
  const [pendingName, setPendingName] = useState('');
  const [pendingQty, setPendingQty] = useState('1');

  const addComponent = () => {
    if (!pendingId) return;
    const qty = Number(pendingQty) || 1;
    setComponents((prev) => {
      const existing = prev.find((c) => c.productId === pendingId);
      if (existing) {
        return prev.map((c) => (c.productId === pendingId ? { ...c, quantity: qty } : c));
      }
      return [...prev, { productId: pendingId, sku: pendingSku, name: pendingName, quantity: qty }];
    });
    setPendingId('');
    setPendingSku('');
    setPendingName('');
    setPendingQty('1');
  };

  const canSave = components.length > 0;

  return (
    <EntitySheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Mégse
          </Button>
          <Button
            type="button"
            disabled={!canSave}
            onClick={() => {
              onSave({
                name: name.trim() || undefined,
                substitutionNote: note.trim() || undefined,
                components,
              });
              onOpenChange(false);
            }}
          >
            Mentés a szállításhoz
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground text-xs">
          Ez csak erre a szállításra vonatkozik — a katalógus BOM nem módosul.
        </p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="kit-name">Összeállítás neve</Label>
          <Input
            id="kit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="pl. Stand A — csövek toldóval"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="kit-note">Csere / megjegyzés a csapatnak</Label>
          <Textarea
            id="kit-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="pl. 4 m cső helyett 2×2 m + toldó, mert a 4 m nincs készleten"
            rows={3}
          />
        </div>

        <div className="rounded-lg border p-3">
          <Label className="mb-2 block">Alkatrész hozzáadása</Label>
          <SearchAutocomplete
            placeholder="CRM SKU / név"
            onSearch={searchProductsAction}
            selectedLabel={
              pendingId ? `${pendingName}${pendingSku ? ` · ${pendingSku}` : ''}` : undefined
            }
            onSelect={(item: SearchItem) => {
              const raw = item.raw as { sku?: string; names?: { hu?: string; en?: string } };
              const sku = raw?.sku ?? item.sublabel ?? item.label;
              setPendingId(item.value);
              setPendingSku(sku);
              setPendingName(productDisplayName(raw?.names, sku));
            }}
          />
          {pendingId ? (
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div className="flex w-28 flex-col gap-1">
                <Label htmlFor="kit-pending-qty">Mennyiség</Label>
                <Input
                  id="kit-pending-qty"
                  type="number"
                  min={0.000001}
                  step="any"
                  value={pendingQty}
                  onChange={(e) => setPendingQty(e.target.value)}
                />
              </div>
              <Button type="button" onClick={addComponent}>
                Alkatrész a listára
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setPendingId('');
                  setPendingSku('');
                  setPendingName('');
                }}
              >
                Mégsem
              </Button>
            </div>
          ) : null}
        </div>

        {components.length === 0 ? (
          <p className="text-muted-foreground text-sm">Még nincs alkatrész.</p>
        ) : (
          <ul className="space-y-2">
            {components.map((c) => (
              <li
                key={c.productId}
                className="flex items-center justify-between gap-2 border-b pb-2"
              >
                <ProductSkuLabel sku={c.sku} name={c.name} layout="inline" />
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0.000001}
                    step="any"
                    className="w-20"
                    value={c.quantity}
                    onChange={(e) => {
                      const qty = Number(e.target.value) || 1;
                      setComponents((prev) =>
                        prev.map((row) =>
                          row.productId === c.productId ? { ...row, quantity: qty } : row
                        )
                      );
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() =>
                      setComponents((prev) => prev.filter((row) => row.productId !== c.productId))
                    }
                  >
                    Törlés
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </EntitySheet>
  );
}
