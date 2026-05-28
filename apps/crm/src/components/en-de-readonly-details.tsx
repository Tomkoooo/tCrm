import type { ReactNode } from 'react';

/** Server-safe collapsible for EN/DE read-only blocks (native &lt;details&gt;). */
export function EnDeReadonlyDetails({
  toggleLabel = 'Angol és német változatok',
  children,
}: {
  toggleLabel?: string;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-md border border-dashed px-3 py-2">
      <summary className="text-primary cursor-pointer list-none text-sm font-medium marker:content-none hover:underline [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-1">
          <span className="text-muted-foreground inline-block transition-transform group-open:rotate-180">
            ▾
          </span>
          {toggleLabel}
        </span>
      </summary>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </details>
  );
}
