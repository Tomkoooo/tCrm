import { Container } from '@crm/ui';
import { HelpNav } from './help-nav';
import { StartTourButton } from '@/components/start-tour-button';
import type { HelpSection } from '@/lib/help/types';

export function HelpLayout({
  sections,
  title,
  description,
  children,
}: {
  sections: HelpSection[];
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Container className="flex max-w-6xl flex-col gap-4 pb-20 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
        </div>
        <StartTourButton />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <HelpNav sections={sections} />
        </aside>
        <article className="min-w-0">{children}</article>
      </div>
    </Container>
  );
}
