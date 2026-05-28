'use client';

import { InfoIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip';

export function DataTableHeaderHint({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground inline-flex shrink-0 rounded-sm"
          aria-label="További információ"
          onClick={(e) => e.stopPropagation()}
        >
          <InfoIcon className="size-2.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-balance">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
