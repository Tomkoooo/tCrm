import { connectDB, Vehicle, type IVehicle } from '@crm/db-core';

/** Active fleet for the optional vehicle picker on a job. */
export async function listActiveVehicles(): Promise<IVehicle[]> {
  await connectDB();
  return Vehicle.find({ isActive: true }).sort({ name: 1 }).exec();
}
