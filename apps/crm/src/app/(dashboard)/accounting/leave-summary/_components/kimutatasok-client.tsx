'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LeaveSummaryClient, type LeaveSummaryRowClient } from './leave-summary-client';
import {
  HoursReportsClient,
  type HoursReportRowClient,
} from '../../reports/_components/hours-reports-client';

export type KimutatasView = 'leave' | 'hours';

export function KimutatasokClient({
  view,
  year,
  month,
  companyId,
  tab,
  companies,
  leaveRows,
  hoursRows,
}: {
  view: KimutatasView;
  year: number;
  month: number;
  companyId: string;
  tab: 'regular' | 'occasional';
  companies: { _id: string; name: string }[];
  leaveRows: LeaveSummaryRowClient[];
  hoursRows: HoursReportRowClient[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setView = (next: KimutatasView) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('view', next);
    router.push(`/accounting/leave-summary?${p.toString()}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 border-b pb-3">
        <Button
          type="button"
          size="sm"
          variant={view === 'leave' ? 'default' : 'outline'}
          onClick={() => setView('leave')}
        >
          Szabadság összesítő
        </Button>
        <Button
          type="button"
          size="sm"
          variant={view === 'hours' ? 'default' : 'outline'}
          onClick={() => setView('hours')}
        >
          Havi bér és órák
        </Button>
      </div>

      {view === 'leave' ? (
        <>
          <p className="text-muted-foreground text-sm">
            Éves szabadságkeret, havi napok dátumokkal, maradék — könyvelőnek exportálható.
            Szabadság napok a jóváhagyott kérelmekből számolódnak.
          </p>
          <LeaveSummaryClient
            year={year}
            month={month}
            companyId={companyId}
            tab={tab}
            companies={companies}
            rows={leaveRows}
            basePath="/accounting/leave-summary"
          />
        </>
      ) : (
        <>
          <p className="text-muted-foreground text-sm">
            Havi ledolgozott órák, szabadság és betegnapok a <strong>beosztásból</strong> és
            jóváhagyott kérelmekből — havi vagy órabér alapján bruttó összeg. Mentés után a
            könyvelői értékek felülírhatók.
          </p>
          <HoursReportsClient
            year={year}
            month={month}
            companyId={companyId}
            companies={companies}
            rows={hoursRows}
            basePath="/accounting/leave-summary"
          />
        </>
      )}
    </div>
  );
}
