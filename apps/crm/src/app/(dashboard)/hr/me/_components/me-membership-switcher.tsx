import Link from 'next/link';
import { Button } from '@crm/ui';

export function MeCompanyTabs({
  companies,
  activeCompanyId,
}: {
  companies: Array<{ id: string; name: string }>;
  /** Undefined means the combined “all companies” view. */
  activeCompanyId?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm">
        Több cégben is dolgozol. Válassz egyet, vagy nézd <strong>összes</strong> feladatod egyben.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant={!activeCompanyId ? 'default' : 'outline'}>
          <Link href="/hr/me">Összes cég</Link>
        </Button>
        {companies.map((c) => (
          <Button
            key={c.id}
            asChild
            size="sm"
            variant={activeCompanyId === c.id ? 'default' : 'outline'}
          >
            <Link href={`/hr/me?company=${c.id}`}>{c.name}</Link>
          </Button>
        ))}
      </div>
    </div>
  );
}
