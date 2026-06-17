'use client';

import { useState } from 'react';
import { DataTable, EntitySheet } from '@crm/ui';
import type { ColumnDef, DataTableQuery } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { TeamForm } from './team-form';

export type TeamRow = {
  _id: string;
  name: string;
  slug: string;
  companyName: string;
  leaderName: string;
  memberCount: number;
  teamType?: string;
  isActive: boolean;
};

const TEAM_TYPE_LABELS: Record<string, string> = {
  builders: 'Építőcsapat',
  drivers: 'Sofőrök',
  mixed: 'Vegyes',
  other: 'Egyéb',
};

export function TeamsTable({
  data,
  columns,
  query,
  total,
  companies,
}: {
  data: TeamRow[];
  columns: Array<ColumnDef<TeamRow>>;
  query: DataTableQuery;
  total: number;
  companies: { _id: string; name: string }[];
}) {
  const [createOpen, setCreateOpen] = useState(false);

  const rows = data.map((row) => ({
    ...row,
    teamType: row.teamType ? (TEAM_TYPE_LABELS[row.teamType] ?? row.teamType) : '—',
  }));

  return (
    <>
      <DataTable<TeamRow>
        mode="server"
        tableId="accounting-teams"
        data={rows}
        columns={columns}
        query={query}
        total={total}
        basePath="/accounting/teams"
        rowHref={(row) => `/accounting/teams/${row._id}`}
        emptyMessage="Még nincs csapat."
        toolbarExtra={
          <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
            Új csapat
          </Button>
        }
      />
      <EntitySheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Új csapat"
        description="Építő- vagy szállítócsapat vezetővel és tagokkal."
        mode="create"
      >
        <TeamForm companies={companies} onSuccess={() => setCreateOpen(false)} />
      </EntitySheet>
    </>
  );
}
