/** Mongo filter: legacy rows without workerCategory count as regular (schema default). */
export function employeeWorkerCategoryMongoFilter(
  category: 'regular' | 'occasional'
): Record<string, unknown> {
  if (category === 'occasional') {
    return { workerCategory: 'occasional' };
  }
  return {
    $or: [
      { workerCategory: 'regular' },
      { workerCategory: { $exists: false } },
      { workerCategory: null },
    ],
  };
}
