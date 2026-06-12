/** How a product relates to BOM / összeszerelés structure. */
export type ProductBomRole =
  | 'assembly'
  | 'component_required'
  | 'component_optional'
  | 'standalone';

export const PRODUCT_BOM_ROLE_LABELS: Record<ProductBomRole, string> = {
  assembly: 'Összeszerelés',
  component_required: 'Kötelező alkatrész',
  component_optional: 'Opcionális alkatrész',
  standalone: 'Termék',
};

export const PRODUCT_BOM_ROLE_FILTER_OPTIONS: Array<{ value: ProductBomRole; label: string }> =
  Object.entries(PRODUCT_BOM_ROLE_LABELS).map(([value, label]) => ({
    value: value as ProductBomRole,
    label,
  }));

export type ProductBomRoleInput = {
  id: string;
  componentCount?: number;
  rentFlag?: number;
};

/**
 * Classify BOM-related roles for display and filtering.
 * `rentFlag === 2` (not standalone rentable) marks optional BOM parts from import.
 */
export function classifyProductBomRoles(
  product: ProductBomRoleInput,
  componentIdSet: ReadonlySet<string>
): ProductBomRole[] {
  const roles: ProductBomRole[] = [];
  const hasComponents = (product.componentCount ?? 0) > 0;
  const isComponent = componentIdSet.has(product.id);

  if (hasComponents) roles.push('assembly');
  if (isComponent) {
    if (product.rentFlag === 2) roles.push('component_optional');
    else roles.push('component_required');
  }
  if (!hasComponents && !isComponent) roles.push('standalone');

  return roles;
}

/** Primary badge role for compact display (assembly wins over component). */
export function primaryProductBomRole(roles: ProductBomRole[]): ProductBomRole | undefined {
  if (roles.includes('assembly')) return 'assembly';
  if (roles.includes('component_required')) return 'component_required';
  if (roles.includes('component_optional')) return 'component_optional';
  if (roles.includes('standalone')) return undefined;
  return undefined;
}
