import { connectDB, Product, Vehicle, type IVehicle, type IProduct } from '@crm/db';
import type { Types } from 'mongoose';

export type CargoLineInput = {
  productId: Types.ObjectId;
  quantity: number;
};

export type CargoTotals = {
  totalWeightKg: number;
  totalVolumeM3: number;
  maxLineLengthMm: number;
  maxLineWidthMm: number;
  maxLineHeightMm: number;
};

export type VehicleFitResult = {
  vehicle: IVehicle;
  fits: boolean;
  reasons: string[];
};

function productVolumeM3(p: Pick<IProduct, 'packageVolumeM3' | 'dimensionsMm'>): number {
  if (p.packageVolumeM3 && p.packageVolumeM3 > 0) return p.packageVolumeM3;
  const { length, width, height } = p.dimensionsMm ?? {};
  if (length && width && height) {
    return (length * width * height) / 1_000_000_000;
  }
  return 0;
}

function productWeightKg(p: Pick<IProduct, 'packageWeightKg' | 'weightKg'>): number {
  return p.packageWeightKg ?? p.weightKg ?? 0;
}

export function computeCargoTotals(
  products: Array<{
    product: Pick<IProduct, 'packageVolumeM3' | 'dimensionsMm' | 'packageWeightKg' | 'weightKg'>;
    quantity: number;
  }>
): CargoTotals {
  let totalWeightKg = 0;
  let totalVolumeM3 = 0;
  let maxLineLengthMm = 0;
  let maxLineWidthMm = 0;
  let maxLineHeightMm = 0;

  for (const { product, quantity } of products) {
    totalWeightKg += productWeightKg(product) * quantity;
    totalVolumeM3 += productVolumeM3(product) * quantity;
    const { length = 0, width = 0, height = 0 } = product.dimensionsMm ?? {};
    maxLineLengthMm = Math.max(maxLineLengthMm, length);
    maxLineWidthMm = Math.max(maxLineWidthMm, width);
    maxLineHeightMm = Math.max(maxLineHeightMm, height);
  }

  return { totalWeightKg, totalVolumeM3, maxLineLengthMm, maxLineWidthMm, maxLineHeightMm };
}

export function evaluateVehicleFit(vehicle: IVehicle, totals: CargoTotals): VehicleFitResult {
  const reasons: string[] = [];
  const vehicleVolume = (vehicle.lengthMm * vehicle.widthMm * vehicle.heightMm) / 1_000_000_000;

  if (totals.totalWeightKg > vehicle.maxWeightKg) {
    reasons.push(
      `Súly túllépés: ${totals.totalWeightKg.toFixed(1)} kg > ${vehicle.maxWeightKg} kg`
    );
  }
  if (totals.totalVolumeM3 > vehicle.maxVolumeM3) {
    reasons.push(
      `Térfogat túllépés: ${totals.totalVolumeM3.toFixed(3)} m³ > ${vehicle.maxVolumeM3} m³`
    );
  }
  if (totals.maxLineLengthMm > vehicle.lengthMm) {
    reasons.push(`Egy tétel hossza (${totals.maxLineLengthMm} mm) nem fér a raktér hosszába`);
  }
  if (totals.maxLineWidthMm > vehicle.widthMm) {
    reasons.push(
      `Egy tétel szélessége (${totals.maxLineWidthMm} mm) nem fér a raktér szélességébe`
    );
  }
  if (totals.maxLineHeightMm > vehicle.heightMm) {
    reasons.push(`Egy tétel magassága (${totals.maxLineHeightMm} mm) nem fér a raktér magasságába`);
  }

  return { vehicle, fits: reasons.length === 0, reasons };
}

export async function suggestVehiclesForCargo(
  lines: CargoLineInput[]
): Promise<{ totals: CargoTotals; suggestions: VehicleFitResult[] }> {
  await connectDB();

  if (!lines.length) {
    return {
      totals: {
        totalWeightKg: 0,
        totalVolumeM3: 0,
        maxLineLengthMm: 0,
        maxLineWidthMm: 0,
        maxLineHeightMm: 0,
      },
      suggestions: [],
    };
  }

  const productIds = lines.map((l) => l.productId);
  const products = await Product.find({ _id: { $in: productIds } })
    .lean()
    .exec();
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const cargoProducts = lines.map((line) => {
    const product = productMap.get(String(line.productId));
    if (!product) throw new Error(`Product not found: ${line.productId}`);
    return { product, quantity: line.quantity };
  });

  const totals = computeCargoTotals(cargoProducts);
  const vehicles = await Vehicle.find({ isActive: true }).lean().exec();

  const suggestions = vehicles
    .map((v) => evaluateVehicleFit(v as IVehicle, totals))
    .sort((a, b) => {
      if (a.fits !== b.fits) return a.fits ? -1 : 1;
      const volA = (a.vehicle.lengthMm * a.vehicle.widthMm * a.vehicle.heightMm) / 1_000_000_000;
      const volB = (b.vehicle.lengthMm * b.vehicle.widthMm * b.vehicle.heightMm) / 1_000_000_000;
      return volA - volB;
    });

  return { totals, suggestions };
}
