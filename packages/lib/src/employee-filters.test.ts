import { describe, expect, it } from 'vitest';
import { employeeWorkerCategoryMongoFilter } from './employee-filters';

describe('employeeWorkerCategoryMongoFilter', () => {
  it('treats missing workerCategory as regular', () => {
    const filter = employeeWorkerCategoryMongoFilter('regular');
    expect(filter).toEqual({
      $or: [
        { workerCategory: 'regular' },
        { workerCategory: { $exists: false } },
        { workerCategory: null },
      ],
    });
  });

  it('occasional tab only matches explicit occasional', () => {
    expect(employeeWorkerCategoryMongoFilter('occasional')).toEqual({
      workerCategory: 'occasional',
    });
  });
});
