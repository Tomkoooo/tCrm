'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PencilIcon, UndoIcon } from 'lucide-react';
import {
  Badge,
  Button,
  EntitySheet,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '@crm/ui';
import { formatHrDateTimeLocal } from '@crm/lib';
import { cancelScheduleChangeAction, requestScheduleChangeAction } from '../schedule-actions';

export type MyScheduleRow = {
  dayKey: string;
  entryId: string;
  label: string;
  start: string;
  end: string;
  pendingRequestId?: string;
};

const DAY_NAMES_HU = ['vasárnap', 'hétfő', 'kedd', 'szerda', 'csütörtök', 'péntek', 'szombat'];

function weekdayOf(dayKey: string) {
  const [y, m, d] = dayKey.split('-').map(Number);
  return DAY_NAMES_HU[new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay()]!;
}

export function MyScheduleTable({
  rows,
  dayNotes,
}: {
  rows: MyScheduleRow[];
  dayNotes: Record<string, string[]>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<MyScheduleRow | null>(null);
  const [pending, setPending] = useState(false);

  const cancel = async (id: string) => {
    setPending(true);
    const result = await cancelScheduleChangeAction(id);
    setPending(false);
    if (!result.success) toast.error(result.message);
    else {
      toast.success(result.message);
      router.refresh();
    }
  };

  if (rows.length === 0) {
    return (
      <div className="text-muted-foreground rounded-md border border-dashed p-8 text-center text-sm">
        Ebben a beosztásban nincs műszakod.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nap</TableHead>
              <TableHead>Műszak</TableHead>
              <TableHead>Esemény</TableHead>
              <TableHead className="text-right">Módosítás</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.entryId}>
                <TableCell className="whitespace-nowrap">
                  {row.dayKey}
                  <span className="text-muted-foreground ml-1 text-xs">
                    {weekdayOf(row.dayKey)}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap font-medium">{row.label}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {(dayNotes[row.dayKey] ?? []).join(' · ')}
                </TableCell>
                <TableCell className="text-right">
                  {row.pendingRequestId ? (
                    <div className="flex items-center justify-end gap-2">
                      <Badge variant="destructive">Kérelem folyamatban</Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => cancel(row.pendingRequestId!)}
                      >
                        <UndoIcon className="h-4 w-4" />
                        Visszavonás
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(row)}
                    >
                      <PencilIcon className="h-4 w-4" />
                      Módosítást kérek
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EntitySheet
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Módosítási kérelem"
        size="md"
      >
        {editing ? (
          <ChangeRequestForm
            row={editing}
            onDone={() => {
              setEditing(null);
              router.refresh();
            }}
          />
        ) : null}
      </EntitySheet>
    </>
  );
}

function ChangeRequestForm({ row, onDone }: { row: MyScheduleRow; onDone: () => void }) {
  const [start, setStart] = useState(formatHrDateTimeLocal(new Date(row.start)));
  const [end, setEnd] = useState(formatHrDateTimeLocal(new Date(row.end)));
  const [note, setNote] = useState('');
  const [pending, setPending] = useState(false);

  const submit = async () => {
    setPending(true);
    const result = await requestScheduleChangeAction({
      scheduleEntryId: row.entryId,
      proposedStart: start,
      proposedEnd: end,
      note: note.trim() || undefined,
    });
    setPending(false);

    if (!result.success) {
      toast.error(result.message);
      return;
    }
    if (result.notified) toast.success(result.message);
    else toast.warning(result.message);
    onDone();
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        Jelenlegi műszak: <strong>{row.label}</strong> ({row.dayKey}). Add meg, mikor felelne meg —
        a beosztás készítője e-mailben kap értesítést, és a döntésről te is kapsz egyet.
      </p>

      <div className="flex flex-col gap-2">
        <Label htmlFor="proposed-start">Javasolt kezdés</Label>
        <Input
          id="proposed-start"
          type="datetime-local"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="proposed-end">Javasolt vége</Label>
        <Input
          id="proposed-end"
          type="datetime-local"
          value={end}
          min={start}
          onChange={(e) => setEnd(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="request-note">Indoklás (opcionális)</Label>
        <Textarea
          id="request-note"
          rows={3}
          maxLength={2000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="pl. aznap 10-ig orvosnál vagyok"
        />
      </div>

      <Button type="button" onClick={submit} loading={pending} loadingText="Küldés…">
        Kérelem beadása
      </Button>
    </div>
  );
}
