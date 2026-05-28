'use client';

import type React from 'react';
import { cn } from '@crm/lib';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from './sheet';

export type EntitySheetSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type EntitySheetMode = 'view' | 'edit' | 'create';

export interface EntitySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  side?: 'right' | 'left';
  size?: EntitySheetSize;
  mode?: EntitySheetMode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function EntitySheet({
  open,
  onOpenChange,
  title,
  description,
  side = 'right',
  size = 'md',
  footer,
  children,
  className,
}: EntitySheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} size={size} className={cn('overflow-y-auto', className)}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
        {footer ? <SheetFooter>{footer}</SheetFooter> : null}
      </SheetContent>
    </Sheet>
  );
}
