export type OptimizerDemandLine = {
  productId: string;
  requestedQuantity: number;
  isOptional?: boolean;
  weightKg: number;
  volumeM3: number;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
};

export type OptimizerStockSlice = {
  productId: string;
  warehouseId: string;
  available: number;
};

export type OptimizerVehicle = {
  vehicleId: string;
  maxWeightKg: number;
  maxVolumeM3: number;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  booked: boolean;
};

export type ProposedRoundLine = {
  productId: string;
  requestedQuantity: number;
  isOptional?: boolean;
};

export type ProposedRound = {
  warehouseId: string;
  vehicleId?: string;
  vehicleWarning?: string;
  lines: ProposedRoundLine[];
};

export type Shortage = {
  productId: string;
  requested: number;
  allocated: number;
};

export type ProposePickupRoundsResult = {
  rounds: ProposedRound[];
  shortages: Shortage[];
  warnings: string[];
};

type Allocation = {
  productId: string;
  warehouseId: string;
  quantity: number;
  isOptional?: boolean;
  weightKg: number;
  volumeM3: number;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
};

function cargoFits(
  vehicle: OptimizerVehicle,
  lines: Allocation[]
): { fits: boolean; reasons: string[] } {
  let weight = 0;
  let volume = 0;
  let maxL = 0;
  let maxW = 0;
  let maxH = 0;
  for (const line of lines) {
    weight += line.weightKg * line.quantity;
    volume += line.volumeM3 * line.quantity;
    maxL = Math.max(maxL, line.lengthMm);
    maxW = Math.max(maxW, line.widthMm);
    maxH = Math.max(maxH, line.heightMm);
  }
  const reasons: string[] = [];
  if (weight > vehicle.maxWeightKg) reasons.push('súly');
  if (volume > vehicle.maxVolumeM3) reasons.push('térfogat');
  if (maxL > vehicle.lengthMm) reasons.push('hossz');
  if (maxW > vehicle.widthMm) reasons.push('szélesség');
  if (maxH > vehicle.heightMm) reasons.push('magasság');
  return { fits: reasons.length === 0, reasons };
}

function allocateStock(
  lines: OptimizerDemandLine[],
  stock: OptimizerStockSlice[]
): { allocations: Allocation[]; shortages: Shortage[] } {
  const slicesByProduct = new Map<string, OptimizerStockSlice[]>();
  for (const slice of stock) {
    const list = slicesByProduct.get(slice.productId) ?? [];
    list.push(slice);
    slicesByProduct.set(slice.productId, list);
  }
  for (const list of slicesByProduct.values()) {
    list.sort((a, b) => b.available - a.available);
  }

  const remainingStock = new Map<string, Map<string, number>>();
  for (const slice of stock) {
    const byWh = remainingStock.get(slice.productId) ?? new Map<string, number>();
    byWh.set(slice.warehouseId, slice.available);
    remainingStock.set(slice.productId, byWh);
  }

  const allocations: Allocation[] = [];
  const shortages: Shortage[] = [];

  const ordered = [...lines.filter((l) => !l.isOptional), ...lines.filter((l) => l.isOptional)];

  for (const line of ordered) {
    let left = line.requestedQuantity;
    const slices = slicesByProduct.get(line.productId) ?? [];
    for (const slice of slices) {
      if (left <= 0) break;
      const byWh = remainingStock.get(line.productId);
      const avail = byWh?.get(slice.warehouseId) ?? 0;
      if (avail <= 0) continue;
      const take = Math.min(avail, left);
      allocations.push({
        productId: line.productId,
        warehouseId: slice.warehouseId,
        quantity: take,
        isOptional: line.isOptional,
        weightKg: line.weightKg,
        volumeM3: line.volumeM3,
        lengthMm: line.lengthMm,
        widthMm: line.widthMm,
        heightMm: line.heightMm,
      });
      byWh?.set(slice.warehouseId, avail - take);
      left -= take;
    }
    const allocated = line.requestedQuantity - left;
    if (left > 0 && !line.isOptional) {
      shortages.push({
        productId: line.productId,
        requested: line.requestedQuantity,
        allocated,
      });
    }
  }

  return { allocations, shortages };
}

function pickVehicle(
  cargo: Allocation[],
  vehicles: OptimizerVehicle[]
): { vehicle?: OptimizerVehicle; warning?: string } {
  const unbookedFit = vehicles.filter((v) => !v.booked && cargoFits(v, cargo).fits);
  if (unbookedFit.length) {
    unbookedFit.sort((a, b) => a.maxVolumeM3 - b.maxVolumeM3);
    return { vehicle: unbookedFit[0] };
  }
  const bookedFit = vehicles.filter((v) => v.booked && cargoFits(v, cargo).fits);
  if (bookedFit.length) {
    bookedFit.sort((a, b) => a.maxVolumeM3 - b.maxVolumeM3);
    return {
      vehicle: bookedFit[0],
      warning: 'A javasolt jármű ebben az időszakban foglalt — válassz másikat, vagy hagyd jóvá.',
    };
  }
  const unbookedAny = vehicles.filter((v) => !v.booked);
  if (unbookedAny.length) {
    unbookedAny.sort((a, b) => b.maxVolumeM3 - a.maxVolumeM3);
    const v = unbookedAny[0];
    const { reasons } = cargoFits(v, cargo);
    return {
      vehicle: v,
      warning: `A rakomány nem fér a járműbe (${reasons.join(', ')}). Osztás vagy másik jármű kell.`,
    };
  }
  if (vehicles.length) {
    const v = [...vehicles].sort((a, b) => b.maxVolumeM3 - a.maxVolumeM3)[0];
    return {
      vehicle: v,
      warning: 'Nincs szabad jármű ebben az időszakban. A javasolt jármű foglalt.',
    };
  }
  return { warning: 'Nincs jármű a flottában.' };
}

function packWarehouse(
  warehouseId: string,
  lines: Allocation[],
  vehicles: OptimizerVehicle[]
): ProposedRound[] {
  const remaining = [...lines];
  const rounds: ProposedRound[] = [];
  const usedVehicleIds = new Set<string>();

  const available = () =>
    vehicles.filter((v) => !usedVehicleIds.has(v.vehicleId) || vehicles.length === 1);

  while (remaining.length) {
    const pool = available();
    const { vehicle, warning } = pickVehicle(remaining, pool.length ? pool : vehicles);
    const packed: Allocation[] = [];
    if (vehicle) {
      const leftover: Allocation[] = [];
      for (const line of remaining) {
        const trial = [...packed, line];
        if (cargoFits(vehicle, trial).fits) packed.push(line);
        else leftover.push(line);
      }
      if (!packed.length) {
        packed.push(remaining[0]);
        remaining.splice(0, 1);
      } else {
        remaining.length = 0;
        remaining.push(...leftover);
      }
      usedVehicleIds.add(vehicle.vehicleId);
    } else {
      packed.push(...remaining);
      remaining.length = 0;
    }

    rounds.push({
      warehouseId,
      vehicleId: vehicle?.vehicleId,
      vehicleWarning: warning,
      lines: packed.map((l) => ({
        productId: l.productId,
        requestedQuantity: l.quantity,
        isOptional: l.isOptional,
      })),
    });

    if (!vehicle) break;
  }

  return rounds;
}

/**
 * Greedy pickup-round planner: place stock, group by warehouse, pack vans.
 * Never auto-locks — caller reviews the proposal.
 */
export function proposePickupRounds(
  demand: OptimizerDemandLine[],
  stock: OptimizerStockSlice[],
  vehicles: OptimizerVehicle[]
): ProposePickupRoundsResult {
  const warnings: string[] = [];
  if (!demand.length) {
    return { rounds: [], shortages: [], warnings: ['A igénylista üres.'] };
  }

  const { allocations, shortages } = allocateStock(demand, stock);

  const byWarehouse = new Map<string, Allocation[]>();
  for (const a of allocations) {
    const list = byWarehouse.get(a.warehouseId) ?? [];
    list.push(a);
    byWarehouse.set(a.warehouseId, list);
  }

  const rounds: ProposedRound[] = [];
  for (const [warehouseId, lines] of byWarehouse) {
    rounds.push(...packWarehouse(warehouseId, lines, vehicles));
  }

  if (!rounds.length && demand.some((d) => !d.isOptional)) {
    warnings.push('Egyetlen raktárban sincs elérhető készlet a kötelező tételekre.');
  }

  return { rounds, shortages, warnings };
}
