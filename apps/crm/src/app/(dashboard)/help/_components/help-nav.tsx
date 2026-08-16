'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@crm/lib';
import type { HelpSection } from '@/lib/help/types';

export function HelpNav({ sections }: { sections: HelpSection[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-4" aria-label="Súgó tartalomjegyzék">
      {sections.map((section) => (
        <div key={section.name} className="flex flex-col gap-1">
          <p className="text-muted-foreground px-2 text-xs font-semibold uppercase tracking-wide">
            {section.name}
          </p>
          <ul className="flex flex-col gap-0.5">
            {section.articles.map((article) => {
              const href = article.slug === 'index' ? '/help' : `/help/${article.slug}`;
              const isActive =
                pathname === href || (article.slug === 'index' && pathname === '/help');

              return (
                <li key={article.slug}>
                  <Link
                    href={href}
                    className={cn(
                      'block rounded-md px-2 py-1.5 text-sm transition-colors',
                      isActive
                        ? 'bg-muted font-medium'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    )}
                  >
                    {article.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
