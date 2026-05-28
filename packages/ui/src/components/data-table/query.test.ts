import { describe, expect, it } from 'vitest';
import { buildDataTableMongoQuery } from './query';
import type { ColumnDef } from './types';

type Row = {
  sku: string;
  brand: string;
  isActive: boolean;
  price: number;
  createdAt: string;
};

const cols: Array<ColumnDef<Row>> = [
  { key: 'sku', label: 'SKU', type: 'string', sortable: true, filterable: true, searchable: true },
  { key: 'brand', label: 'Brand', type: 'enum', sortable: true, filterable: true },
  { key: 'isActive', label: 'Active', type: 'boolean', sortable: true, filterable: true },
  { key: 'price', label: 'Price', type: 'number', sortable: true, filterable: true },
  { key: 'createdAt', label: 'Created', type: 'date', sortable: true },
];

describe('buildDataTableMongoQuery', () => {
  it('builds pagination skip/limit', () => {
    const q = buildDataTableMongoQuery({ page: 2, pageSize: 25 }, cols);
    expect(q.skip).toBe(25);
    expect(q.limit).toBe(25);
  });

  it('builds sort asc/desc', () => {
    const asc = buildDataTableMongoQuery({ sort: 'sku' }, cols);
    expect(asc.sort).toEqual({ sku: 1 });

    const desc = buildDataTableMongoQuery({ sort: '-sku' }, cols);
    expect(desc.sort).toEqual({ sku: -1 });
  });

  it('builds boolean filter', () => {
    const q = buildDataTableMongoQuery({ filters: { isActive: 'false' } }, cols);
    expect(q.filter.isActive).toBe(false);
  });

  it('builds enum filter', () => {
    const q = buildDataTableMongoQuery({ filters: { brand: ['ALUTENT', 'OTHER'] } }, cols);
    expect(q.filter.brand).toEqual({ $in: ['ALUTENT', 'OTHER'] });
  });

  it('builds number range filter', () => {
    const q = buildDataTableMongoQuery({ filters: { price: ['10', '20'] } }, cols);
    expect(q.filter.price).toEqual({ $gte: 10, $lte: 20 });
  });

  it('builds search across searchable columns', () => {
    const q = buildDataTableMongoQuery({ search: '1000' }, cols);
    expect(q.filter.$and).toBeTruthy();
  });
});
