import { Badge } from '@/components/ui/badge';
import { PRODUCT_BOM_ROLE_LABELS, type ProductBomRole } from '@crm/lib';
import { cn } from '@/lib/utils';

const ROLE_VARIANT: Record<
  Exclude<ProductBomRole, 'standalone'>,
  'default' | 'secondary' | 'outline'
> = {
  assembly: 'default',
  component_required: 'secondary',
  component_optional: 'outline',
};

export function ProductBomBadges({
  roles,
  className,
}: {
  roles: ProductBomRole[];
  className?: string;
}) {
  const visible = roles.filter((r) => r !== 'standalone');
  if (visible.length === 0) return <span className="text-muted-foreground text-xs">—</span>;

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {visible.map((role) => (
        <Badge key={role} variant={ROLE_VARIANT[role]} className="font-normal">
          {PRODUCT_BOM_ROLE_LABELS[role]}
        </Badge>
      ))}
    </div>
  );
}
