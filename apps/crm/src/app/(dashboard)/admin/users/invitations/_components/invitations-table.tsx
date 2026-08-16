'use client';

import { useState } from 'react';
import { CopyIcon } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable } from '@crm/ui';
import type { ColumnDef, DataTableQuery } from '@crm/ui';
import { Button } from '@crm/ui';

export type InvitationRow = {
  _id: string;
  name: string;
  email: string;
  status: 'pending' | 'used' | 'expired';
  inviteLink: string;
  invitedByName: string;
  roleNames: string;
  createdAt: Date;
  expiresAt: Date;
};

const STATUS_LABELS: Record<InvitationRow['status'], string> = {
  pending: 'Függőben',
  used: 'Felhasználva',
  expired: 'Lejárt',
};

function InviteLinkCell({ link }: { link: string }) {
  const [copyPending, setCopyPending] = useState(false);

  const copy = async () => {
    if (copyPending) return;
    setCopyPending(true);
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Meghívó link másolva');
    } catch {
      toast.error('Vágólap másolás sikertelen');
    } finally {
      setCopyPending(false);
    }
  };

  return (
    <div className="flex min-w-0 max-w-md items-start gap-2">
      <span className="min-w-0 flex-1 break-all font-mono text-xs leading-relaxed" title={link}>
        {link}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0"
        title="Link másolása"
        loading={copyPending}
        onClick={() => void copy()}
      >
        <CopyIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}

const defaultQuery: DataTableQuery = { page: 1, pageSize: 20 };

export function InvitationsTable({ data }: { data: InvitationRow[] }) {
  const columns: Array<ColumnDef<InvitationRow>> = [
    {
      key: 'email',
      label: 'E-mail',
      type: 'string',
      sortable: true,
      searchable: true,
    },
    {
      key: 'name',
      label: 'Név',
      type: 'string',
      sortable: true,
      searchable: true,
    },
    {
      key: 'status',
      label: 'Állapot',
      type: 'enum',
      sortable: true,
      filterable: true,
      enumValues: [
        { value: 'pending', label: STATUS_LABELS.pending },
        { value: 'used', label: STATUS_LABELS.used },
        { value: 'expired', label: STATUS_LABELS.expired },
      ],
      render: (_value, row) => STATUS_LABELS[row.status],
    },
    {
      key: 'inviteLink',
      label: 'Meghívó link',
      type: 'string',
      sortable: false,
      searchable: false,
      filterable: false,
      render: (_value, row) => <InviteLinkCell link={row.inviteLink} />,
    },
    {
      key: 'invitedByName',
      label: 'Meghívó',
      type: 'string',
      sortable: true,
      searchable: true,
    },
    {
      key: 'roleNames',
      label: 'Szerepkörök',
      type: 'string',
      sortable: false,
      searchable: false,
    },
    {
      key: 'createdAt',
      label: 'Kiküldve',
      type: 'date',
      sortable: true,
    },
    {
      key: 'expiresAt',
      label: 'Lejár',
      type: 'date',
      sortable: true,
    },
  ];

  return (
    <DataTable<InvitationRow>
      mode="client"
      tableId="admin-user-invitations"
      data={data}
      columns={columns}
      query={defaultQuery}
      total={data.length}
      basePath="/admin/users/invitations"
      emptyMessage="Még nincs kiküldött meghívó."
    />
  );
}
