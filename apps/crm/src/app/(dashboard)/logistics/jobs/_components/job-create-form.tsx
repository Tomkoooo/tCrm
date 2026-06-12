'use client';

import { useActionState, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchAutocomplete, type SearchItem } from '@/components/ui/search-autocomplete';
import { searchProductsAction } from '../../../inventory/search-actions';
import {
  createJobAction,
  enrichPickupLinesDisplayAction,
  suggestVehiclesAction,
  type JobFormState,
} from '../actions';
import { PickupLinesList, type PickupLineListItem } from './pickup-lines-list';
import { TeamMemberSelect } from './team-member-select';
import { productDisplayName } from '@crm/lib';
import { cn } from '@/lib/utils';

type Line = { productId: string; sku: string; name: string; quantity: number };

type PickupDraft = {
  id: string;
  label: string;
  warehouseId: string;
  vehicleId: string;
  teamMemberIds: string[];
  contactEmails: string;
  lines: Line[];
};

const selectClassName = cn(
  'border-input bg-background ring-offset-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs',
  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none'
);

const initialState: JobFormState = { success: false };

function newPickup(warehouseId: string): PickupDraft {
  return {
    id: crypto.randomUUID(),
    label: '',
    warehouseId,
    vehicleId: '',
    teamMemberIds: [],
    contactEmails: '',
    lines: [],
  };
}

export function JobCreateForm({
  warehouses,
  vehicles,
}: {
  warehouses: Array<{ id: string; name: string; key: string }>;
  vehicles: Array<{ id: string; name: string; plateNumber: string }>;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createJobAction, initialState);
  const [pickups, setPickups] = useState<PickupDraft[]>(() => [newPickup(warehouses[0]?.id ?? '')]);
  const [activePickupId, setActivePickupId] = useState(pickups[0]?.id ?? '');
  const [productId, setProductId] = useState('');
  const [productSku, setProductSku] = useState('');
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [vehicleSuggestions, setVehicleSuggestions] = useState<
    Array<{
      vehicleId: string;
      name: string;
      plateNumber: string;
      fits: boolean;
      reasons: string[];
    }>
  >([]);
  const [displayLines, setDisplayLines] = useState<PickupLineListItem[]>([]);

  const activePickup = pickups.find((p) => p.id === activePickupId) ?? pickups[0];

  const refreshSuggestions = useCallback(async (lines: Line[]) => {
    if (!lines.length) {
      setVehicleSuggestions([]);
      return;
    }
    const linesJson = JSON.stringify(
      lines.map((l) => ({ productId: l.productId, requestedQuantity: l.quantity }))
    );
    const result = await suggestVehiclesAction(linesJson);
    if (result.success) {
      setVehicleSuggestions(result.suggestions);
    }
  }, []);

  useEffect(() => {
    if (activePickup) void refreshSuggestions(activePickup.lines);
  }, [activePickup?.lines, activePickup?.id, refreshSuggestions]);

  useEffect(() => {
    if (!activePickup?.lines.length) {
      setDisplayLines([]);
      return;
    }
    void (async () => {
      const res = await enrichPickupLinesDisplayAction(
        activePickup.lines.map((l) => ({ productId: l.productId, quantity: l.quantity }))
      );
      if (res.success) setDisplayLines(res.lines);
    })();
  }, [activePickup?.lines, activePickup?.id]);

  useEffect(() => {
    if (state.success && state.id) {
      router.push(`/logistics/jobs/${state.id}`);
    }
  }, [state, router]);

  const updatePickup = (id: string, patch: Partial<PickupDraft>) => {
    setPickups((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const addLineToActive = () => {
    if (!productId || !activePickup) return;
    const line: Line = {
      productId,
      sku: productSku,
      name: productName,
      quantity: Number(quantity) || 1,
    };
    updatePickup(activePickup.id, {
      lines: [...activePickup.lines.filter((l) => l.productId !== productId), line],
    });
    setProductId('');
    setProductSku('');
    setProductName('');
    setQuantity('1');
  };

  const pickupsJson = JSON.stringify(
    pickups.map((p) => ({
      label: p.label || undefined,
      warehouseId: p.warehouseId,
      vehicleId: p.vehicleId || undefined,
      teamMemberIds: p.teamMemberIds,
      contactEmails: p.contactEmails
        .split(/[,;]/)
        .map((e) => e.trim())
        .filter(Boolean),
      lines: p.lines.map((l) => ({ productId: l.productId, requestedQuantity: l.quantity })),
    }))
  );

  const canSubmit = pickups.every((p) => p.warehouseId && p.lines.length > 0);

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="pickupsJson" value={pickupsJson} />

      {state.message && !state.success && (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="eventName">Esemény neve</Label>
          <Input id="eventName" name="eventName" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="siteAddress">Helyszín címe</Label>
          <Input id="siteAddress" name="siteAddress" required />
        </div>
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="note">Megjegyzés (esemény)</Label>
          <Input id="note" name="note" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium">Átvételi körök</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const p = newPickup(warehouses[0]?.id ?? '');
            setPickups((prev) => [...prev, p]);
            setActivePickupId(p.id);
          }}
        >
          + Átvételi kör
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {pickups.map((p, i) => (
          <Button
            key={p.id}
            type="button"
            variant={p.id === activePickupId ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActivePickupId(p.id)}
          >
            {p.label || `Kör ${i + 1}`} ({p.lines.length})
          </Button>
        ))}
      </div>

      {activePickup && (
        <div className="rounded-lg border p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Megnevezés (pl. csapat)</Label>
              <Input
                value={activePickup.label}
                onChange={(e) => updatePickup(activePickup.id, { label: e.target.value })}
                placeholder="Építőcsapat A"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Raktár</Label>
              <select
                className={selectClassName}
                value={activePickup.warehouseId}
                onChange={(e) => updatePickup(activePickup.id, { warehouseId: e.target.value })}
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.key})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Jármű</Label>
              <select
                className={selectClassName}
                value={activePickup.vehicleId}
                onChange={(e) => updatePickup(activePickup.id, { vehicleId: e.target.value })}
              >
                <option value="">— válasszon —</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.plateNumber})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Értesítési e-mailek (vesszővel)</Label>
              <Input
                value={activePickup.contactEmails}
                onChange={(e) => updatePickup(activePickup.id, { contactEmails: e.target.value })}
                placeholder="team@example.com"
              />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <Label>Építőcsapat</Label>
              <p className="text-muted-foreground text-xs">
                Keresés szerepkör szerint csoportosítva. Raktárváltáskor a raktárhoz rendelt
                munkatársak automatikusan kitöltődnek.
              </p>
              <TeamMemberSelect
                warehouseId={activePickup.warehouseId}
                selected={activePickup.teamMemberIds}
                onChange={(teamMemberIds) => updatePickup(activePickup.id, { teamMemberIds })}
              />
            </div>
          </div>

          <div className="mt-4">
            <Label className="mb-2 block">Tételek ehhez a körhöz</Label>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[200px] flex-1">
                <SearchAutocomplete
                  placeholder="CRM SKU / név"
                  onSearch={searchProductsAction}
                  onSelect={(item: SearchItem) => {
                    const raw = item.raw as { sku?: string; names?: { hu?: string; en?: string } };
                    const sku = raw?.sku ?? item.sublabel ?? item.label;
                    setProductId(item.value);
                    setProductSku(sku);
                    setProductName(productDisplayName(raw?.names, sku));
                  }}
                />
              </div>
              <Input
                type="number"
                min={0.000001}
                step="any"
                className="w-24"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              <Button type="button" variant="secondary" size="sm" onClick={addLineToActive}>
                Hozzáadás
              </Button>
            </div>
            <PickupLinesList lines={displayLines} />
          </div>

          {vehicleSuggestions.length > 0 && (
            <div className="bg-muted/30 mt-4 rounded-md border p-3 text-sm">
              <p className="mb-2 font-medium">Jármű javaslat (ehhez a körhöz)</p>
              <ul className="space-y-1">
                {vehicleSuggestions.slice(0, 3).map((s) => (
                  <li key={s.vehicleId}>
                    {s.name} ({s.plateNumber}){s.fits ? ' ✓' : ' — nem alkalmas'}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {pickups.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-3 text-red-600"
              onClick={() => {
                const next = pickups.filter((p) => p.id !== activePickup.id);
                setPickups(next);
                setActivePickupId(next[0]?.id ?? '');
              }}
            >
              Kör törlése
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="publish" value="" disabled={pending || !canSubmit}>
          Mentés tervezetként
        </Button>
        <Button type="submit" name="publish" value="true" disabled={pending || !canSubmit}>
          Közzététel (ütemezés)
        </Button>
      </div>
    </form>
  );
}
