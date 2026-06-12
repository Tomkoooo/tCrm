import Link from 'next/link';
import { productDisplayName, type ProductNamesLike } from '@crm/lib';
import { cn } from '@/lib/utils';

export type ProductSkuLabelProps = {
  sku: string;
  name?: string;
  names?: ProductNamesLike;
  layout?: 'stack' | 'inline';
  href?: string;
  className?: string;
};

export function ProductSkuLabel({
  sku,
  name,
  names,
  layout = 'stack',
  href,
  className,
}: ProductSkuLabelProps) {
  const displayName = name ?? productDisplayName(names, sku);
  const showSku = displayName !== sku;

  const content =
    layout === 'inline' ? (
      <span className={cn('min-w-0', className)}>
        {showSku ? (
          <>
            <span className="font-medium">{displayName}</span>
            <span className="text-muted-foreground"> · </span>
            <span className="font-mono text-xs">{sku}</span>
          </>
        ) : (
          <span className="font-mono text-xs">{sku}</span>
        )}
      </span>
    ) : (
      <span className={cn('flex min-w-0 flex-col', className)}>
        <span className="truncate text-sm font-medium">{displayName}</span>
        {showSku ? (
          <span className="text-muted-foreground truncate font-mono text-xs">{sku}</span>
        ) : null}
      </span>
    );

  if (href) {
    return (
      <Link href={href} className="text-primary min-w-0 hover:underline">
        {content}
      </Link>
    );
  }

  return content;
}
