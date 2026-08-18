'use client';

import { Badge, Button, Input, Label } from '@crm/ui';
import { ProductSkuLabel } from '@/components/product-sku-label';
import {
  coverageForRounds,
  labeledProduct,
  stockAtWarehouse,
  type DraftRound,
  type PlanDemandLine,
  type PlanProduct,
  type PlanStockSlice,
} from './job-create-types';

export function JobCreateRoundsStep({
  rounds,
  warehouses,
  vehicles,
  products,
  stock,
  demand,
  warnings,
  loading,
  error,
  onChange,
  onRegenerate,
}: {
  rounds: DraftRound[];
  warehouses: Array<{ id: string; name: string; key: string }>;
  vehicles: Array<{ id: string; name: string; plateNumber: string }>;
  products: PlanProduct[];
  stock: PlanStockSlice[];
  demand: PlanDemandLine[];
  warnings: string[];
  loading: boolean;
  error?: string;
  onChange: (next: DraftRound[]) => void;
  onRegenerate: () => void;
}) {
  const patch = (localId: string, next: Partial<DraftRound>) => {
    onChange(rounds.map((round) => (round.localId === localId ? { ...round, ...next } : round)));
  };

  const shortages = coverageForRounds(demand, rounds, stock);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">Átvételi körök</h3>
          <p className="text-muted-foreground text-sm">
            A rendszer a készlet helye alapján rakja össze a köröket. Ha másik raktárt választasz, a
            készletjelzés azonnal ahhoz a raktárhoz igazodik.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onRegenerate} disabled={loading}>
          {loading ? 'Összeállítás…' : 'Újrajavaslat'}
        </Button>
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {warnings
        .filter((w) => !w.startsWith('Hiány: termék'))
        .map((w) => (
          <p key={w} className="text-sm text-amber-700">
            {w}
          </p>
        ))}

      {shortages.length > 0 ? (
        <div className="border-destructive/40 rounded-md border p-3">
          <p className="mb-2 text-sm font-medium">Hiány a kiválasztott raktár(ak)ban</p>
          <ul className="space-y-1 text-sm">
            {shortages.map((s) => {
              const label = labeledProduct(products, s.productId);
              return (
                <li key={s.productId} className="flex justify-between gap-2">
                  <ProductSkuLabel sku={label.sku} name={label.name} layout="inline" />
                  <span className="tabular-nums">
                    {s.allocated}/{s.requested}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {loading && rounds.length === 0 ? (
        <p className="text-muted-foreground text-sm">Körök összeállítása…</p>
      ) : null}

      {!loading && rounds.length === 0 && !error ? (
        <p className="text-muted-foreground text-sm">
          Nincs javasolt kör. Mentheted tervezetként, és a lapon később újra javasolhatsz.
        </p>
      ) : null}

      <ul className="space-y-4">
        {rounds.map((round, index) => (
          <li key={round.localId} className="rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h4 className="text-sm font-medium">{index + 1}. kör</h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => onChange(rounds.filter((r) => r.localId !== round.localId))}
              >
                Kör törlése
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label>Raktár</Label>
                <select
                  className="border-input h-9 w-full rounded-md border bg-transparent px-2 text-sm"
                  value={round.warehouseId}
                  onChange={(e) => patch(round.localId, { warehouseId: e.target.value })}
                >
                  <option value="">— válassz raktárt —</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.key})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label>Jármű</Label>
                <select
                  className="border-input h-9 w-full rounded-md border bg-transparent px-2 text-sm"
                  value={round.vehicleId}
                  onChange={(e) =>
                    patch(round.localId, { vehicleId: e.target.value, vehicleWarning: undefined })
                  }
                >
                  <option value="">— nincs jármű —</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.plateNumber})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {round.vehicleWarning ? (
              <p className="mt-2 text-sm text-amber-700">{round.vehicleWarning}</p>
            ) : null}
            <ul className="mt-3 space-y-3">
              {round.lines.map((line) => {
                const label = labeledProduct(products, line.productId, line);
                const available = stockAtWarehouse(stock, line.productId, round.warehouseId);
                const short = round.warehouseId ? available < line.requestedQuantity : false;
                return (
                  <li key={line.productId} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <ProductSkuLabel sku={label.sku} name={label.name} layout="inline" />
                      <Input
                        type="number"
                        min={0.000001}
                        step="any"
                        className="w-24"
                        value={line.requestedQuantity}
                        onChange={(e) => {
                          const qty = Number(e.target.value) || 1;
                          patch(round.localId, {
                            lines: round.lines.map((row) =>
                              row.productId === line.productId
                                ? { ...row, requestedQuantity: qty }
                                : row
                            ),
                          });
                        }}
                      />
                    </div>
                    {round.warehouseId ? (
                      <Badge variant={short ? 'destructive' : 'secondary'} className="w-fit">
                        {short
                          ? `Ebben a raktárban: ${available} / ${line.requestedQuantity}`
                          : `Készleten itt: ${available}`}
                      </Badge>
                    ) : (
                      <p className="text-muted-foreground text-xs">Válassz raktárt a készlethez.</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
