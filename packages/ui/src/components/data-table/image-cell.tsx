'use client';

import { ImageIcon } from 'lucide-react';
import { cn } from '@crm/lib';

export function DataTableImageCell({
  src,
  alt = '',
  size = 'sm',
}: {
  src?: string | null;
  alt?: string;
  size?: 'sm' | 'md';
}) {
  const dim = size === 'md' ? 'h-12 w-12' : 'h-9 w-9';

  if (!src) {
    return (
      <div
        className={cn(
          'bg-muted text-muted-foreground flex shrink-0 items-center justify-center rounded-md border',
          dim
        )}
        aria-hidden
      >
        <ImageIcon className="size-2.5 opacity-50" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn('shrink-0 rounded-md border object-cover', dim)}
      loading="lazy"
    />
  );
}
