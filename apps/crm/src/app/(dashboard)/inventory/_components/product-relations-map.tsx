'use client';

import Link from 'next/link';
import { ArrowDownIcon, ArrowUpIcon, BoxesIcon, PackageIcon, PuzzleIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProductRelationsData } from '@/lib/inventory/product-relations';

type CardRole = 'center' | 'parent' | 'component';

type RelationCardProps = {
  sku: string;
  name: string;
  thumbnailUrl?: string;
  stockSummary?: string;
  quantity?: number;
  available?: number;
  highlighted?: boolean;
  role: CardRole;
};

function quantityLabel(role: CardRole, quantity: number): string | undefined {
  if (quantity <= 0) return undefined;
  if (role === 'component') {
    return `${quantity} db / összeszerelés`;
  }
  if (role === 'parent') {
    return `${quantity} db ebbe a késztermékbe`;
  }
  return undefined;
}

function RelationCard({
  sku,
  name,
  thumbnailUrl,
  stockSummary,
  quantity,
  available,
  highlighted = false,
  role,
}: RelationCardProps) {
  const qtyText = quantity !== undefined ? quantityLabel(role, quantity) : undefined;

  return (
    <Link
      href={`/inventory/${encodeURIComponent(sku)}`}
      className={cn(
        'bg-card flex w-full max-w-[220px] flex-col overflow-hidden rounded-lg border shadow-sm transition-shadow hover:shadow-md',
        highlighted && 'ring-primary max-w-[260px] ring-2',
        role === 'parent' && 'border-dashed',
        role === 'component' && 'border-muted-foreground/30'
      )}
    >
      <div className="bg-muted aspect-4/3 relative w-full">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={name} className="size-full object-cover" />
        ) : (
          <div className="text-muted-foreground flex size-full items-center justify-center">
            <PackageIcon className="size-10 opacity-40" aria-hidden />
          </div>
        )}
        {role === 'parent' && (
          <span className="bg-secondary text-secondary-foreground absolute left-2 top-2 flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium">
            <BoxesIcon className="size-3" aria-hidden />
            Összeszerelés
          </span>
        )}
        {role === 'component' && (
          <span className="bg-secondary text-secondary-foreground absolute left-2 top-2 flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium">
            <PuzzleIcon className="size-3" aria-hidden />
            Alkatrész
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-2 text-sm font-medium leading-snug">{name}</p>
        <p className="text-muted-foreground font-mono text-xs">{sku}</p>
        {qtyText ? (
          <p className="text-primary text-xs font-medium" title="BOM mennyiség">
            {qtyText}
          </p>
        ) : null}
        <p className="text-muted-foreground mt-auto text-xs">
          {stockSummary ? <span>Készlet: {stockSummary}</span> : <span>Nincs készlet</span>}
        </p>
        {available !== undefined && role === 'component' ? (
          <p className="text-xs">
            Szabad készlet: <strong>{available}</strong>
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function FlowConnector({ direction, label }: { direction: 'up' | 'down'; label: string }) {
  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-1 py-2">
      {direction === 'down' ? (
        <>
          <ArrowDownIcon className="text-muted-foreground size-5" aria-hidden />
          <div className="bg-border h-8 w-px" aria-hidden />
        </>
      ) : (
        <>
          <div className="bg-border h-8 w-px" aria-hidden />
          <ArrowUpIcon className="text-muted-foreground size-5" aria-hidden />
        </>
      )}
      <p className="text-muted-foreground max-w-md text-center text-sm">{label}</p>
    </div>
  );
}

export function ProductRelationsMap({ data }: { data: ProductRelationsData }) {
  const hasParents = data.parents.length > 0;
  const hasComponents = data.components.length > 0;
  const isAssembly = hasComponents;
  const isComponentOnly = hasParents && !hasComponents;

  if (!hasParents && !hasComponents) {
    return (
      <p className="text-muted-foreground text-sm">
        Nincs BOM alkatrész és nincs szülő összeszerelés — egyszerű, önálló termék.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-muted-foreground mb-2 max-w-xl text-center text-sm">
        {isAssembly
          ? 'Ez egy összeszerelés (késztermék): alul az alkatrészek, amelyekből felépül.'
          : isComponentOnly
            ? 'Ez egy alkatrész: alul az összeszerelések, amelyekbe beépül — nem fordítva.'
            : 'Középen a jelenlegi termék; felfelé késztermékek, lefelé alkatrészek.'}
      </p>

      {/* 1. Current product always on top */}
      <section className="flex w-full flex-col items-center gap-2">
        <RelationCard {...data.center} highlighted role="center" />
        {isAssembly && data.canBuild !== undefined ? (
          <p className="text-muted-foreground text-center text-sm">
            Összeszerelhető ebből a BOM-ból:{' '}
            <strong className="text-foreground">{data.canBuild}</strong> db
          </p>
        ) : null}
      </section>

      {/* 2. Components below — this assembly is MADE FROM these */}
      {hasComponents && (
        <>
          <FlowConnector
            direction="down"
            label="Ebből az összeszerelésből áll össze (alkatrészek — nem fordítva)"
          />
          <section className="flex w-full flex-col items-center gap-3">
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
              <PuzzleIcon className="size-3.5" />
              Alkatrészek (BOM)
            </p>
            <div className="grid w-full grid-cols-1 justify-items-center gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data.components.map((component) => (
                <RelationCard key={component.sku} {...component} role="component" />
              ))}
            </div>
          </section>
        </>
      )}

      {/* 3. Parent assemblies below — this item is USED IN those kits */}
      {hasParents && (
        <>
          <FlowConnector
            direction="down"
            label={
              hasComponents
                ? 'Ez az alkatrész ezekben a nagyobb összeszerelésekben is szerepel'
                : 'Ez az alkatrész ezekbe a késztermékekbe épül be (nem ők ebbe)'
            }
          />
          <section className="flex w-full flex-col items-center gap-3">
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
              <BoxesIcon className="size-3.5" />
              Összeszerelések (késztermék)
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {data.parents.map((parent) => (
                <RelationCard key={parent.sku} {...parent} role="parent" />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
