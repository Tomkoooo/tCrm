import { Types } from 'mongoose';
import { Product } from '@crm/db-core';
import type { ProductBomRole } from '@crm/lib';

export async function loadBomComponentProductIds(): Promise<Set<string>> {
  const kits = await Product.find({ 'components.0': { $exists: true } })
    .select({ 'components.productId': 1 })
    .lean()
    .exec();

  const ids = new Set<string>();
  for (const kit of kits) {
    for (const line of kit.components ?? []) {
      ids.add(String(line.productId));
    }
  }
  return ids;
}

function withoutComponentsFilter(): Record<string, unknown> {
  return {
    $or: [{ components: { $size: 0 } }, { components: { $exists: false } }],
  };
}

function componentIdsFilter(componentIdSet: ReadonlySet<string>): Record<string, unknown> {
  const ids = [...componentIdSet].map((id) => new Types.ObjectId(id));
  return ids.length > 0 ? { _id: { $in: ids } } : { _id: { $in: [] } };
}

function roleToMongoCondition(
  role: ProductBomRole,
  componentIdSet: ReadonlySet<string>
): Record<string, unknown> {
  switch (role) {
    case 'assembly':
      return { 'components.0': { $exists: true } };
    case 'standalone':
      return {
        $and: [
          withoutComponentsFilter(),
          { _id: { $nin: [...componentIdSet].map((id) => new Types.ObjectId(id)) } },
        ],
      };
    case 'component_required':
      return {
        $and: [
          componentIdsFilter(componentIdSet),
          {
            $or: [{ 'rental.rentFlag': { $ne: 2 } }, { 'rental.rentFlag': { $exists: false } }],
          },
        ],
      };
    case 'component_optional':
      return {
        $and: [componentIdsFilter(componentIdSet), { 'rental.rentFlag': 2 }],
      };
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

export function applyBomRoleMongoFilter(
  filter: Record<string, unknown>,
  bomRole: unknown,
  componentIdSet: ReadonlySet<string>
): Record<string, unknown> {
  if (bomRole === undefined || bomRole === null || bomRole === '') return filter;

  const roles = (Array.isArray(bomRole) ? bomRole : [bomRole])
    .map(String)
    .filter(Boolean) as ProductBomRole[];

  if (roles.length === 0) return filter;

  const roleConditions = roles.map((role) => roleToMongoCondition(role, componentIdSet));
  const next: Record<string, unknown> = { ...filter };

  const existingAnd = Array.isArray(next.$and) ? [...next.$and] : [];
  existingAnd.push(roleConditions.length === 1 ? roleConditions[0]! : { $or: roleConditions });
  next.$and = existingAnd;

  return next;
}

export function stripBomRoleFromMongoFilter(
  filter: Record<string, unknown>
): Record<string, unknown> {
  if (!('bomRole' in filter)) return filter;
  const rest = { ...filter };
  delete rest.bomRole;
  return rest;
}
