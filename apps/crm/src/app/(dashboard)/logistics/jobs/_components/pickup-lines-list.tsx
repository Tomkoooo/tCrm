'use client';

import { ChevronRightIcon } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ProductSkuLabel } from '@/components/product-sku-label';
import { cn } from '@/lib/utils';

export type PickupBomComponentView = {
  productId: string;
  sku: string;
  name: string;
  quantityPerKit: number;
  totalQuantity: number;
  depth?: number;
  isAssembly?: boolean;
};

export type PickupLineListItem = {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  isPrebuild: boolean;
  bomComponents: PickupBomComponentView[];
};

function formatQty(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
}

function BomBreakdown({
  components,
  className,
}: {
  components: PickupBomComponentView[];
  className?: string;
}) {
  if (!components.length) return null;
  return (
    <ul className={cn('text-muted-foreground space-y-1 pl-1 text-xs', className)}>
      {components.map((c) => (
        <li
          key={`${c.productId}-${c.depth ?? 0}-${c.sku}`}
          className="flex justify-between gap-2"
          style={{ paddingLeft: `${(c.depth ?? 0) * 12}px` }}
        >
          <span>
            {c.isAssembly ? (
              <span className="bg-primary/10 text-primary mr-1 rounded px-1 py-0.5 text-[10px] font-medium uppercase">
                összeállítás
              </span>
            ) : null}
            <ProductSkuLabel sku={c.sku} name={c.name} layout="inline" />
          </span>
          <span className="shrink-0 tabular-nums">
            {formatQty(c.totalQuantity)} db
            <span className="opacity-70"> ({formatQty(c.quantityPerKit)}/db)</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Compact read-only list (create form, summaries). */
export function PickupLinesList({
  lines,
  className,
}: {
  lines: PickupLineListItem[];
  className?: string;
}) {
  if (!lines.length) return null;

  return (
    <ul className={cn('mt-3 space-y-2', className)}>
      {lines.map((line) =>
        line.isPrebuild && line.bomComponents.length > 0 ? (
          <li key={line.productId}>
            <Collapsible defaultOpen={false}>
              <div className="flex items-start justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                <CollapsibleTrigger className="group flex min-w-0 flex-1 items-start gap-2 text-left">
                  <ChevronRightIcon className="text-muted-foreground mt-0.5 size-4 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
                  <span className="min-w-0">
                    <ProductSkuLabel sku={line.sku} name={line.name} layout="inline" />
                    <span className="bg-primary/10 text-primary ml-1.5 inline rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                      összeszerelés
                    </span>
                  </span>
                </CollapsibleTrigger>
                <span className="text-muted-foreground shrink-0 tabular-nums">
                  {formatQty(line.quantity)} db
                </span>
              </div>
              <CollapsibleContent className="border-border ml-6 mt-1 border-l-2 pb-1 pl-3">
                <p className="text-muted-foreground mb-1.5 text-[11px]">
                  Alkatrészek (összesen a kért mennyiséghez):
                </p>
                <BomBreakdown components={line.bomComponents} />
              </CollapsibleContent>
            </Collapsible>
          </li>
        ) : (
          <li
            key={line.productId}
            className="flex justify-between gap-2 rounded-md border px-3 py-2 text-sm"
          >
            <ProductSkuLabel sku={line.sku} name={line.name} layout="inline" className="min-w-0" />
            <span className="text-muted-foreground shrink-0 tabular-nums">
              {formatQty(line.quantity)} db
            </span>
          </li>
        )
      )}
    </ul>
  );
}

/** Workflow row: line header + optional BOM + slot for quantity inputs. */
export function PickupLineWorkflowRow({
  line,
  children,
}: {
  line: PickupLineListItem & { isConsumable?: boolean };
  children?: React.ReactNode;
}) {
  const hasBom = line.isPrebuild && line.bomComponents.length > 0;

  return (
    <li className="rounded-md border text-sm">
      <div className="p-2">
        {hasBom ? (
          <Collapsible defaultOpen={false}>
            <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
              <CollapsibleTrigger className="group flex min-w-0 flex-1 items-start gap-2 text-left">
                <ChevronRightIcon className="text-muted-foreground mt-0.5 size-4 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
                <span className="font-medium">
                  <ProductSkuLabel sku={line.sku} name={line.name} layout="inline" />
                  <span className="bg-primary/10 text-primary ml-1.5 inline rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                    összeszerelés
                  </span>
                  {line.isConsumable && (
                    <span className="text-muted-foreground ml-1 text-xs font-normal">(fogyó)</span>
                  )}
                </span>
              </CollapsibleTrigger>
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                {formatQty(line.quantity)} db kért
              </span>
            </div>
            <CollapsibleContent className="border-border mb-2 border-l-2 pl-3">
              <p className="text-muted-foreground mb-1 text-[11px]">Alkatrészlista:</p>
              <BomBreakdown components={line.bomComponents} />
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <div className="mb-2 font-medium">
            <ProductSkuLabel sku={line.sku} name={line.name} layout="inline" />
            {line.isConsumable && (
              <span className="text-muted-foreground ml-1 text-xs font-normal">(fogyó)</span>
            )}
          </div>
        )}
        {children}
      </div>
    </li>
  );
}
