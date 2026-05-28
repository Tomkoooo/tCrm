import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  Counter,
  Product,
  Reservation,
  StockAdjustment,
  StockLevel,
  StockMovement,
  User,
  Warehouse,
} from '@crm/db';
import { connectDB } from '@crm/db';
import {
  cancelMovement,
  confirmMovement,
  createMovement,
  createReservation,
  releaseReservation,
} from './index';

let mongo: MongoMemoryServer;
let userId: mongoose.Types.ObjectId;
let warehouseA: mongoose.Types.ObjectId;
let warehouseB: mongoose.Types.ObjectId;
let productId: mongoose.Types.ObjectId;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  await connectDB();

  const user = await User.create({
    email: 'logistics@test.local',
    name: 'Logistics Test',
    passwordHash: 'hash',
    roleIds: [],
    directPermissionKeys: [],
    isActive: true,
  });
  userId = user._id;

  const [whA, whB] = await Warehouse.create([
    { key: 'test-a', name: 'Test A', isActive: true },
    { key: 'test-b', name: 'Test B', isActive: true },
  ]);
  warehouseA = whA._id;
  warehouseB = whB._id;

  const product = await Product.create({
    sku: 'TEST-SKU-001',
    names: { en: 'Test Product' },
    imageIds: [],
    categoryIds: [],
    components: [],
    isDiscontinued: false,
    isActive: true,
  });
  productId = product._id;

  await StockLevel.create({
    productId,
    warehouseId: warehouseA,
    onHand: 100,
    reserved: 0,
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) {
    await mongo.stop();
  }
});

beforeEach(async () => {
  await Promise.all([
    Reservation.deleteMany({}),
    StockMovement.deleteMany({}),
    StockAdjustment.deleteMany({}),
    Counter.deleteMany({}),
  ]);
  await StockLevel.updateOne({ productId, warehouseId: warehouseA }, { onHand: 100, reserved: 0 });
  await StockLevel.updateOne(
    { productId, warehouseId: warehouseB },
    { onHand: 0, reserved: 0 },
    { upsert: true }
  );
});

describe('reservations', () => {
  it('creates reservation and increments reserved', async () => {
    const reservation = await createReservation({
      productId,
      warehouseId: warehouseA,
      quantity: 10,
      sourceType: 'manual',
      createdBy: userId,
    });
    expect(reservation.status).toBe('active');

    const level = await StockLevel.findOne({ productId, warehouseId: warehouseA });
    expect(level?.reserved).toBe(10);
    expect(level?.onHand).toBe(100);
  });

  it('rejects reservation when insufficient available stock', async () => {
    await expect(
      createReservation({
        productId,
        warehouseId: warehouseA,
        quantity: 200,
        sourceType: 'manual',
        createdBy: userId,
      })
    ).rejects.toThrow(/only \d+ available/);
  });

  it('releases reservation and decrements reserved', async () => {
    const reservation = await createReservation({
      productId,
      warehouseId: warehouseA,
      quantity: 5,
      sourceType: 'manual',
      createdBy: userId,
    });
    await releaseReservation(reservation._id, 'cancelled', userId);
    const level = await StockLevel.findOne({ productId, warehouseId: warehouseA });
    expect(level?.reserved).toBe(0);
  });
});

describe('movements', () => {
  it('GRN confirm increases on-hand at destination', async () => {
    const movement = await createMovement({
      type: 'grn',
      toWarehouseId: warehouseB,
      lines: [{ productId, quantity: 25 }],
      createdBy: userId,
    });
    await confirmMovement(movement._id, userId);

    const level = await StockLevel.findOne({ productId, warehouseId: warehouseB });
    expect(level?.onHand).toBe(25);

    const confirmed = await StockMovement.findById(movement._id);
    expect(confirmed?.status).toBe('confirmed');
    expect(confirmed?.reference).toMatch(/^GRN-/);
  });

  it('pick confirm decreases on-hand and reserved when linked to reservation', async () => {
    const reservation = await createReservation({
      productId,
      warehouseId: warehouseA,
      quantity: 8,
      sourceType: 'manual',
      createdBy: userId,
    });

    const movement = await createMovement({
      type: 'pick',
      fromWarehouseId: warehouseA,
      lines: [{ productId, quantity: 8, reservationId: reservation._id }],
      createdBy: userId,
    });
    await confirmMovement(movement._id, userId);

    const level = await StockLevel.findOne({ productId, warehouseId: warehouseA });
    expect(level?.onHand).toBe(92);
    expect(level?.reserved).toBe(0);

    const updatedReservation = await Reservation.findById(reservation._id);
    expect(updatedReservation?.status).toBe('fulfilled');
  });

  it('transfer moves stock between warehouses', async () => {
    const movement = await createMovement({
      type: 'transfer',
      fromWarehouseId: warehouseA,
      toWarehouseId: warehouseB,
      lines: [{ productId, quantity: 30 }],
      createdBy: userId,
    });
    await confirmMovement(movement._id, userId);

    const fromLevel = await StockLevel.findOne({ productId, warehouseId: warehouseA });
    const toLevel = await StockLevel.findOne({ productId, warehouseId: warehouseB });
    expect(fromLevel?.onHand).toBe(70);
    expect(toLevel?.onHand).toBe(30);
  });

  it('cancel draft movement without stock changes', async () => {
    const movement = await createMovement({
      type: 'grn',
      toWarehouseId: warehouseB,
      lines: [{ productId, quantity: 10 }],
      createdBy: userId,
    });
    await cancelMovement(movement._id, userId);

    const level = await StockLevel.findOne({ productId, warehouseId: warehouseB });
    expect(level?.onHand).toBe(0);

    const cancelled = await StockMovement.findById(movement._id);
    expect(cancelled?.status).toBe('cancelled');
  });
});
