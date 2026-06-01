'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function hasEnDeContent(values?: { en?: string | null; de?: string | null }): boolean {
  if (!values) return false;
  return Boolean(String(values.en ?? '').trim() || String(values.de ?? '').trim());
}

export function OptionalEnDeFields({
  children,
  toggleLabel = 'Angol és német változatok',
  defaultOpen = false,
  className,
}: {
  children: ReactNode;
  toggleLabel?: string;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-primary flex w-fit items-center gap-1.5 text-sm font-medium hover:underline"
        aria-expanded={open}
      >
        <ChevronDown
          className={cn('size-4 shrink-0 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
        {toggleLabel}
      </button>
      <div className={cn(!open && 'hidden')} aria-hidden={!open}>
        {children}
      </div>
    </div>
  );
}
