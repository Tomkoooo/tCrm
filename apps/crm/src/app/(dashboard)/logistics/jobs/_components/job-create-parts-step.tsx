'use client';

import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Input,
  Label,
  SearchAutocomplete,
  type SearchItem,
} from '@crm/ui';
import { productDisplayName } from '@crm/lib';
import { searchProductsAction } from '../../../inventory/search-actions';
import { loadCatalogBomAction, previewDemandAvailabilityAction } from '../plan-actions';
import { ProductSkuLabel } from '@/components/product-sku-label';
import { JobCreateKitSheet } from './job-create-kit-sheet';
import {
  type DemandKitDraft,
  type DemandLineDraft,
  newLocalId,
  serializeDemand,
} from './job-create-types';

type AvailabilityRow = Awaited<ReturnType<typeof previewDemandAvailabilityAction>>[number];

type KitEditor =
  | { mode: 'edit'; localId: string; initial: DemandKitDraft; title: string }
  | { mode: 'create'; initial: DemandKitDraft; title: string }
  | null;

export function JobCreatePartsStep({
  demand,
  onChange,
}: {
  demand: DemandLineDraft[];
  onChange: (next: DemandLineDraft[]) => void;
}) {
  const [pendingId, setPendingId] = useState('');
  const [pendingSku, setPendingSku] = useState('');
  const [pendingName, setPendingName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [optional, setOptional] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);
  const [editor, setEditor] = useState<KitEditor>(null);

  useEffect(() => {
    if (!demand.length) {
      setAvailability([]);
      return;
    }
    const timer = setTimeout(() => {
      void (async () => {
        const rows = await previewDemandAvailabilityAction(JSON.stringify(serializeDemand(demand)));
        setAvailability(rows);
      })();
    }, 350);
    return () => clearTimeout(timer);
  }, [demand]);

  const clearPending = () => {
    setPendingId('');
    setPendingSku('');
    setPendingName('');
    setQuantity('1');
    setOptional(false);
  };

  const addCatalogLine = () => {
    if (!pendingId) return;
    const qty = Number(quantity) || 1;
    onChange([
      ...demand.filter((line) => !(line.productId === pendingId && !line.kit)),
      {
        localId: newLocalId(),
        productId: pendingId,
        sku: pendingSku,
        name: pendingName,
        quantity: qty,
        isOptional: optional,
      },
    ]);
    clearPending();
  };

  const openCatalogKitEditor = async (line: DemandLineDraft) => {
    if (line.kit?.components.length) {
      setEditor({
        mode: 'edit',
        localId: line.localId,
        title: 'Összeállítás szerkesztése',
        initial: line.kit,
      });
      return;
    }
    if (!line.productId) return;
    const bom = await loadCatalogBomAction(line.productId);
    setEditor({
      mode: 'edit',
      localId: line.localId,
      title: 'Összeállítás szerkesztése ennél a szállításnál',
      initial: {
        name: line.name,
        substitutionNote: '',
        components: (bom?.components ?? []).map((c) => ({
          productId: c.productId,
          sku: c.sku,
          name: c.name,
          quantity: c.quantityPerKit,
        })),
      },
    });
  };

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h3 className="font-medium">Igénylista</h3>
        <p className="text-muted-foreground text-sm">
          A készletjelzés a jelenlegi szabad mennyiség. Az összeállítás csak erre a szállításra
          módosítható — a katalógus BOM változatlan marad.
        </p>
      </div>

      <div className="rounded-lg border p-4">
        <Label className="mb-2 block">Termék a katalógusból</Label>
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
          <div className="bg-muted/40 mt-4 flex flex-col gap-4 rounded-md p-3">
            <p className="text-sm font-medium">
              Kiválasztva: {pendingName}
              {pendingSku ? <span className="text-muted-foreground"> · {pendingSku}</span> : null}
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex w-28 flex-col gap-1">
                <Label htmlFor="demand-qty">Mennyiség</Label>
                <Input
                  id="demand-qty"
                  type="number"
                  min={0.000001}
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label>A listán</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={optional ? 'outline' : 'default'}
                    onClick={() => setOptional(false)}
                  >
                    Kötelező
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={optional ? 'default' : 'outline'}
                    onClick={() => setOptional(true)}
                  >
                    Opcionális
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" onClick={addCatalogLine}>
                  Hozzáadás a listához
                </Button>
                <Button type="button" variant="ghost" onClick={clearPending}>
                  Mégsem
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setEditor({
              mode: 'create',
              title: 'Új összeállítás ennél a szállításnál',
              initial: { name: '', substitutionNote: '', components: [] },
            })
          }
        >
          Új összeállítás a semmiből
        </Button>
      </div>

      {demand.length === 0 ? (
        <p className="text-muted-foreground text-sm">Még nincs tétel a listán.</p>
      ) : (
        <ul className="space-y-3">
          {demand.map((line, index) => {
            const avail = availability[index];
            const shortage = avail?.shortage ?? 0;
            const ok = avail ? shortage <= 0 : undefined;
            return (
              <li key={line.localId} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <ProductSkuLabel sku={line.sku} name={line.name} layout="stack" />
                    {line.kit?.name && line.productId ? (
                      <p className="text-muted-foreground mt-1 text-xs">
                        Helyi összeállítás: {line.kit.name}
                      </p>
                    ) : null}
                    {!line.productId ? (
                      <p className="text-muted-foreground mt-1 text-xs">Egyedi összeállítás</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0.000001}
                      step="any"
                      className="w-20"
                      value={line.quantity}
                      onChange={(e) => {
                        const qty = Number(e.target.value) || 1;
                        onChange(
                          demand.map((row) =>
                            row.localId === line.localId ? { ...row, quantity: qty } : row
                          )
                        );
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => onChange(demand.filter((row) => row.localId !== line.localId))}
                    >
                      Törlés
                    </Button>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {ok === true ? (
                    <Badge variant="secondary">Készleten: {avail?.available}</Badge>
                  ) : ok === false ? (
                    <Badge variant="destructive">
                      Hiány: {shortage}
                      {avail != null ? ` (van ${avail.available})` : ''}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Készlet ellenőrzése…</Badge>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant={line.isOptional ? 'default' : 'outline'}
                    onClick={() =>
                      onChange(
                        demand.map((row) =>
                          row.localId === line.localId
                            ? { ...row, isOptional: !row.isOptional }
                            : row
                        )
                      )
                    }
                  >
                    {line.isOptional ? 'Opcionális' : 'Kötelező'}
                  </Button>
                </div>

                {line.kit?.substitutionNote ? (
                  <p className="mt-2 text-sm">
                    <span className="font-medium">Csere a csapatnak: </span>
                    {line.kit.substitutionNote}
                  </p>
                ) : null}

                {avail?.components.length || line.kit?.components.length ? (
                  <Collapsible className="mt-2">
                    <CollapsibleTrigger
                      type="button"
                      className="text-muted-foreground text-xs underline-offset-2 hover:underline"
                    >
                      Alkatrészek
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <ul className="mt-2 space-y-1 text-sm">
                        {(avail?.components.length ? avail.components : line.kit!.components).map(
                          (c) => {
                            const shortageC = 'shortage' in c ? c.shortage : 0;
                            const qty = 'quantityPerKit' in c ? c.quantityPerKit : c.quantity;
                            return (
                              <li key={c.productId} className="flex justify-between gap-2">
                                <ProductSkuLabel sku={c.sku} name={c.name} layout="inline" />
                                <span className="text-muted-foreground tabular-nums">
                                  {qty}×
                                  {shortageC > 0 ? (
                                    <span className="text-destructive ml-2">hiány {shortageC}</span>
                                  ) : null}
                                </span>
                              </li>
                            );
                          }
                        )}
                      </ul>
                    </CollapsibleContent>
                  </Collapsible>
                ) : null}

                <div className="mt-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => void openCatalogKitEditor(line)}
                  >
                    {line.kit
                      ? 'Összeállítás szerkesztése'
                      : 'Összeállítás szerkesztése ennél a szállításnál'}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editor ? (
        <JobCreateKitSheet
          key={editor.mode === 'edit' ? editor.localId : 'new'}
          open
          title={editor.title}
          description="A módosítás nem írja felül a mentett termék-összeállítást."
          initial={editor.initial}
          onOpenChange={(open) => {
            if (!open) setEditor(null);
          }}
          onSave={(kit) => {
            if (editor.mode === 'create') {
              onChange([
                ...demand,
                {
                  localId: newLocalId(),
                  sku: 'egyedi',
                  name: kit.name || 'Egyedi összeállítás',
                  quantity: 1,
                  isOptional: false,
                  kit,
                },
              ]);
              return;
            }
            onChange(
              demand.map((row) =>
                row.localId === editor.localId ? { ...row, kit, name: kit.name || row.name } : row
              )
            );
          }}
        />
      ) : null}
    </section>
  );
}
