'use client';

import { FileText, ImageIcon } from 'lucide-react';
import { isPdfContentType, isPdfFilename } from '@crm/lib';
import { cn } from '@/lib/utils';

export function isPdfMedia(item: { filename?: string; contentType?: string }): boolean {
  return isPdfContentType(item.contentType) || isPdfFilename(item.filename ?? '');
}

export function MediaThumbnail({
  src,
  alt,
  filename,
  contentType,
  type,
  className,
}: {
  src: string;
  alt: string;
  filename?: string;
  contentType?: string;
  type?: 'file' | 'link';
  className?: string;
}) {
  if (isPdfMedia({ filename, contentType })) {
    return (
      <div
        className={cn(
          'bg-muted text-muted-foreground flex flex-col items-center justify-center gap-1 p-2',
          className
        )}
        title={alt}
      >
        <FileText className="h-8 w-8 shrink-0" aria-hidden />
        <span className="line-clamp-2 w-full text-center text-[10px] leading-tight">
          {filename}
        </span>
      </div>
    );
  }

  if (type === 'link') {
    return (
      <div
        className={cn(
          'bg-muted text-muted-foreground flex flex-col items-center justify-center gap-1',
          className
        )}
      >
        <ImageIcon className="h-8 w-8" aria-hidden />
        <span className="text-[10px]">URL</span>
      </div>
    );
  }

  return <img src={src} alt={alt} className={cn('object-cover', className)} />;
}
