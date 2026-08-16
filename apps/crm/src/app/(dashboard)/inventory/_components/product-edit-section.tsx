'use client';

import { ChevronDownIcon } from 'lucide-react';

import type { ProductEditSectionId } from './use-product-edit-sections';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@crm/ui';

export function ProductEditSection({
  sectionId,
  title,
  description,
  open,
  onOpenChange,
  compact = false,
  children,
}: {
  sectionId: ProductEditSectionId;
  title: string;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  compact?: boolean;
  children: React.ReactNode;
}) {
  const cardClassName = compact ? 'border-0 shadow-none' : undefined;

  return (
    <Collapsible open={open} onOpenChange={onOpenChange} data-section={sectionId}>
      <Card className={cardClassName}>
        <CardHeader className={compact ? 'px-0 pb-2 pt-0' : 'pb-2'}>
          <CollapsibleTrigger className="flex w-full items-start gap-2 text-left [&[data-state=open]>svg]:rotate-180">
            <ChevronDownIcon className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0 transition-transform" />
            <div className="min-w-0 flex-1">
              <CardTitle className={compact ? 'text-base' : undefined}>{title}</CardTitle>
              {description ? (
                <CardDescription className="mt-1">{description}</CardDescription>
              ) : null}
            </div>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent forceMount className="data-[state=closed]:hidden">
          <CardContent className={compact ? 'px-0 pt-0' : 'pt-0'}>{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
