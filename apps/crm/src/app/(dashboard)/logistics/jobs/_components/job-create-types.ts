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
  warehouseId?: string;
  kit?: DemandKitDraft;
};

export function newLocalId(): string {
  return crypto.randomUUID();
}

export function serializeDemand(demand: DemandLineDraft[]) {
  return demand.map((line) => ({
    productId: line.productId,
    requestedQuantity: line.quantity,
    isOptional: line.isOptional,
    warehouseId: line.warehouseId || undefined,
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

export function demandLineIsValid(line: DemandLineDraft): boolean {
  if (line.quantity <= 0) return false;
  if (!line.warehouseId) return false;
  if (line.productId) return true;
  return Boolean(line.kit?.components.length);
}
