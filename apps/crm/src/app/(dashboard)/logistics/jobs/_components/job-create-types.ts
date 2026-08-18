import type { CrewRole } from '@crm/db-core';

export type KitComponentDraft = {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  note?: string;
};

export type DemandKitDraft = {
  name?: string;
  substitutionNote?: string;
  components: KitComponentDraft[];
};

export type DemandLineDraft = {
  localId: string;
  productId?: string;
  sku: string;
  name: string;
  quantity: number;
  isOptional: boolean;
  kit?: DemandKitDraft;
};

export type CrewDraft = {
  employeeId: string;
  name: string;
  roles: CrewRole[];
};

export type DraftRoundLine = {
  productId: string;
  sku: string;
  name: string;
  requestedQuantity: number;
  isOptional?: boolean;
};

export type DraftRound = {
  localId: string;
  warehouseId: string;
  vehicleId: string;
  vehicleWarning?: string;
  lines: DraftRoundLine[];
};

export function newLocalId(): string {
  return crypto.randomUUID();
}

export function serializeDemand(demand: DemandLineDraft[]) {
  return demand.map((line) => ({
    productId: line.productId,
    requestedQuantity: line.quantity,
    isOptional: line.isOptional,
    kit: line.kit?.components.length
      ? {
          name: line.kit.name,
          substitutionNote: line.kit.substitutionNote,
          components: line.kit.components.map((c) => ({
            productId: c.productId,
            quantity: c.quantity,
            note: c.note,
          })),
        }
      : undefined,
  }));
}

export function serializePickups(rounds: DraftRound[]) {
  return rounds
    .filter((round) => round.warehouseId && round.lines.length > 0)
    .map((round) => ({
      warehouseId: round.warehouseId,
      vehicleId: round.vehicleId || undefined,
      vehicleWarning: round.vehicleWarning,
      lines: round.lines.map((line) => ({
        productId: line.productId,
        requestedQuantity: line.requestedQuantity,
        isOptional: line.isOptional,
      })),
    }));
}

export function demandLineIsValid(line: DemandLineDraft): boolean {
  if (line.quantity <= 0) return false;
  if (line.productId) return true;
  return Boolean(line.kit?.components.length);
}

export type PlanProduct = { id: string; sku: string; name: string };
export type PlanStockSlice = { productId: string; warehouseId: string; available: number };
export type PlanDemandLine = { productId: string; requested: number; isOptional?: boolean };

export function labeledProduct(
  products: PlanProduct[],
  productId: string,
  fallback?: { sku?: string; name?: string }
): { sku: string; name: string } {
  const p = products.find((row) => row.id === productId);
  let sku = p?.sku || fallback?.sku || '—';
  let name = p?.name || fallback?.name || 'Ismeretlen tétel';
  if (!sku || sku === productId) sku = '—';
  if (!name || name === productId) name = sku !== '—' ? sku : 'Ismeretlen tétel';
  return { sku, name };
}

export function stockAtWarehouse(
  stock: PlanStockSlice[],
  productId: string,
  warehouseId: string
): number {
  if (!warehouseId) return 0;
  return stock
    .filter((row) => row.productId === productId && row.warehouseId === warehouseId)
    .reduce((n, row) => n + row.available, 0);
}

export function coverageForRounds(
  demand: PlanDemandLine[],
  rounds: DraftRound[],
  stock: PlanStockSlice[]
): Array<{ productId: string; requested: number; allocated: number }> {
  const demandLines =
    demand.length > 0
      ? demand
      : (() => {
          const merged = new Map<string, PlanDemandLine>();
          for (const round of rounds) {
            for (const line of round.lines) {
              const existing = merged.get(line.productId);
              if (existing) existing.requested += line.requestedQuantity;
              else {
                merged.set(line.productId, {
                  productId: line.productId,
                  requested: line.requestedQuantity,
                  isOptional: line.isOptional,
                });
              }
            }
          }
          return [...merged.values()];
        })();
  const claimed = new Map<string, number>();
  for (const round of rounds) {
    if (!round.warehouseId) continue;
    for (const line of round.lines) {
      const key = `${line.productId}::${round.warehouseId}`;
      claimed.set(key, (claimed.get(key) ?? 0) + line.requestedQuantity);
    }
  }
  const allocatedByProduct = new Map<string, number>();
  for (const [key, qty] of claimed) {
    const sep = key.indexOf('::');
    const productId = key.slice(0, sep);
    const warehouseId = key.slice(sep + 2);
    const avail = stockAtWarehouse(stock, productId, warehouseId);
    allocatedByProduct.set(
      productId,
      (allocatedByProduct.get(productId) ?? 0) + Math.min(qty, avail)
    );
  }
  return demandLines
    .filter((line) => !line.isOptional)
    .map((line) => ({
      productId: line.productId,
      requested: line.requested,
      allocated: Math.min(line.requested, allocatedByProduct.get(line.productId) ?? 0),
    }))
    .filter((row) => row.allocated < row.requested);
}
