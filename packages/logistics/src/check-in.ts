export function warehousePickQuantity(gathered: number, inboundHandoff = 0): number {
  return Math.max(0, gathered - Math.max(0, inboundHandoff));
}

export type CheckInLineDestinationInput = {
  productId: string;
  checkedQuantity: number;
  destinationKind?: 'warehouse' | 'job';
  warehouseId?: string;
  jobId?: string;
};

export type WarehouseReturnGroup = {
  warehouseId: string;
  lines: Array<{ productId: string; quantity: number }>;
};

export type JobHandoffGroup = {
  jobId: string;
  lines: Array<{ productId: string; quantity: number }>;
};

export function groupCheckInDestinations(
  lines: CheckInLineDestinationInput[],
  defaultWarehouseId: string
): { warehouseReturns: WarehouseReturnGroup[]; jobHandoffs: JobHandoffGroup[] } {
  const warehouses = new Map<string, Array<{ productId: string; quantity: number }>>();
  const jobs = new Map<string, Array<{ productId: string; quantity: number }>>();

  for (const line of lines) {
    if (line.checkedQuantity <= 0) continue;
    if (line.destinationKind === 'job') {
      const jobId = line.jobId?.trim();
      if (!jobId) {
        throw new Error('A következő esemény megadása kötelező az átadáshoz.');
      }
      const list = jobs.get(jobId) ?? [];
      list.push({ productId: line.productId, quantity: line.checkedQuantity });
      jobs.set(jobId, list);
      continue;
    }

    const warehouseId = line.warehouseId?.trim() || defaultWarehouseId;
    if (!warehouseId) {
      throw new Error('A célraktár megadása kötelező.');
    }
    const list = warehouses.get(warehouseId) ?? [];
    list.push({ productId: line.productId, quantity: line.checkedQuantity });
    warehouses.set(warehouseId, list);
  }

  return {
    warehouseReturns: [...warehouses.entries()].map(([warehouseId, grouped]) => ({
      warehouseId,
      lines: grouped,
    })),
    jobHandoffs: [...jobs.entries()].map(([jobId, grouped]) => ({
      jobId,
      lines: grouped,
    })),
  };
}
