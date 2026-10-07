'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  AlertTriangleIcon,
  SendIcon,
  SettingsIcon,
  Trash2Icon,
  WandSparklesIcon,
} from 'lucide-react';
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  EntitySheet,
  Input,
  Label,
  Textarea,
  cn,
} from '@crm/ui';
import {
  deleteSchedulePlanAction,
  fillSchedulePlanAction,
  publishSchedulePlanAction,
  setSchedulePlanCellAction,
  setSchedulePlanDayNoteAction,
  updateSchedulePlanAction,
  type PublishSummary,
} from '../actions';

export type EditorEmployee = {
  id: string;
  name: string;
  email?: string;
  hasUser: boolean;
};

export type EditorCell = {
  place: string;
  startTime: string;
  endTime: string;
  description?: string;
  hours: number;
  overnight: boolean;
};

/** What the inputs hold for one cell. Empty place = no shift. */
type CellDraft = {
  place: string;
  startTime: string;
  endTime: string;
  description: string;
};

const DAY_NAMES_HU = ['vasárnap', 'hétfő', 'kedd', 'szerda', 'csütörtök', 'péntek', 'szombat'];

function dayParts(dayKey: string) {
  const [y, m, d] = dayKey.split('-').map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  const weekday = date.getUTCDay();
  return {
    short: `${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')}.`,
    weekday: DAY_NAMES_HU[weekday]!,
    isWeekend: weekday === 0 || weekday === 6,
  };
}

function cellKey(employeeId: string, dayKey: string) {
  return `${employeeId}:${dayKey}`;
}

function emptyDraft(): CellDraft {
  return { place: '', startTime: '', endTime: '', description: '' };
}

function draftFromCell(cell: EditorCell): CellDraft {
  return {
    place: cell.place,
    startTime: cell.startTime,
    endTime: cell.endTime,
    description: cell.description ?? '',
  };
}

function sameDraft(a: CellDraft, b: CellDraft) {
  return (
    a.place.trim() === b.place.trim() &&
    a.startTime.trim() === b.startTime.trim() &&
    a.endTime.trim() === b.endTime.trim() &&
    a.description.trim() === b.description.trim()
  );
}

export function SchedulePlanEditor({
  canWrite,
  planId,
  status,
  title,
  notes,
  defaultShiftHours,
  defaultStartTime,
  dayKeys,
  employees,
  candidateEmployees,
  cells,
  dayNotes,
  unreachable,
}: {
  canWrite: boolean;
  planId: string;
  status: 'draft' | 'published';
  title: string;
  notes?: string;
  defaultShiftHours: number;
  defaultStartTime: string;
  dayKeys: string[];
  employees: EditorEmployee[];
  candidateEmployees: EditorEmployee[];
  cells: Record<string, EditorCell>;
  dayNotes: Record<string, string[]>;
  unreachable: Array<{ employeeId: string; name: string; reason: string }>;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Mirrors the server grid so a saved cell shows immediately without a refetch.
  const [saved, setSaved] = useState<Record<string, EditorCell>>(cells);
  const [draft, setDraft] = useState<Record<string, CellDraft>>(() =>
    Object.fromEntries(Object.entries(cells).map(([key, cell]) => [key, draftFromCell(cell)]))
  );
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(dayKeys.map((d) => [d, (dayNotes[d] ?? []).join(' · ')]))
  );

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [fillOpen, setFillOpen] = useState(false);
  const [publishSummary, setPublishSummary] = useState<PublishSummary | null>(null);

  const unreachableIds = useMemo(
    () => new Set(unreachable.map((u) => u.employeeId)),
    [unreachable]
  );

  const getDraft = (key: string) => draft[key] ?? emptyDraft();
  const filledCount = Object.values(draft).filter((d) => d.place.trim()).length;

  const totalHours = useMemo(
    () => Object.values(saved).reduce((sum, cell) => sum + cell.hours, 0),
    [saved]
  );

  const patchDraft = (key: string, patch: Partial<CellDraft>) =>
    setDraft((d) => ({ ...d, [key]: { ...(d[key] ?? emptyDraft()), ...patch } }));

  const saveCell = (employeeId: string, dayKey: string) => {
    const key = cellKey(employeeId, dayKey);
    const next = getDraft(key);
    const previous = saved[key] ? draftFromCell(saved[key]!) : emptyDraft();
    if (sameDraft(next, previous)) return;

    setSaving((s) => ({ ...s, [key]: true }));
    startTransition(async () => {
      const result = await setSchedulePlanCellAction({
        planId,
        employeeId,
        dayKey,
        place: next.place,
        startTime: next.startTime || undefined,
        endTime: next.endTime || undefined,
        description: next.description || undefined,
      });
      setSaving((s) => ({ ...s, [key]: false }));

      if (!result.success) {
        toast.error(result.message);
        setDraft((d) => ({ ...d, [key]: previous }));
        return;
      }

      const cell = result.data.cell;
      if (!cell) {
        setSaved((s) => {
          const copy = { ...s };
          delete copy[key];
          return copy;
        });
        setDraft((d) => ({ ...d, [key]: emptyDraft() }));
      } else {
        setSaved((s) => ({ ...s, [key]: cell }));
        setDraft((d) => ({ ...d, [key]: draftFromCell(cell) }));
      }
      router.refresh();
    });
  };

  const saveDayNote = (dayKey: string, value: string) => {
    const previous = (dayNotes[dayKey] ?? []).join(' · ');
    if (value.trim() === previous.trim()) return;
    startTransition(async () => {
      const result = await setSchedulePlanDayNoteAction({
        planId,
        dayKey,
        notes: value
          .split('·')
          .map((n) => n.trim())
          .filter(Boolean),
      });
      if (!result.success) {
        toast.error(result.message);
        setNoteDraft((d) => ({ ...d, [dayKey]: previous }));
        return;
      }
      router.refresh();
    });
  };

  const inputClass = 'h-7 border-transparent bg-transparent px-1.5 text-xs shadow-none';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {canWrite ? (
          <>
            <Button type="button" size="sm" onClick={() => setPublishOpen(true)}>
              <SendIcon className="h-4 w-4" />
              {status === 'published' ? 'Újraküldés' : 'Kiküldés e-mailben'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setFillOpen(true)}>
              <WandSparklesIcon className="h-4 w-4" />
              Tömeges kitöltés
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
              <SettingsIcon className="h-4 w-4" />
              Beállítások
            </Button>
          </>
        ) : null}
        <span className="text-muted-foreground ml-auto text-xs">
          {filledCount} műszak · {Math.round(totalHours * 10) / 10} óra összesen · alap{' '}
          {defaultStartTime}, {defaultShiftHours} óra
        </span>
      </div>

      {canWrite ? (
        <p className="text-muted-foreground text-xs">
          A <strong>helyszín</strong> megadása hozza létre a műszakot (pl. „BOK”, „Kispest”). Üresen
          hagyva a cella törlődik. Az időpontokat üresen hagyva a beosztás alapértéke érvényes (
          {defaultStartTime}, {defaultShiftHours} óra). Éjfélen átnyúló műszak: írj korábbi véget,
          mint a kezdés (pl. 22:00 → 02:00).
        </p>
      ) : null}

      {unreachable.length > 0 ? (
        <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Kiküldéskor kimarad: {unreachable.map((u) => `${u.name} (${u.reason})`).join(', ')}.
          </p>
        </div>
      ) : null}

      <div className="overflow-auto rounded-md border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="bg-muted/50 sticky left-0 z-10 min-w-[6.5rem] border-b border-r p-2 text-left font-medium">
                Nap
              </th>
              <th className="min-w-[11rem] border-b border-r p-2 text-left font-medium">Esemény</th>
              {employees.map((employee) => (
                <th
                  key={employee.id}
                  className="min-w-[13rem] border-b border-r p-2 text-left font-medium last:border-r-0"
                >
                  <div className="flex items-center gap-1">
                    <span className="truncate">{employee.name}</span>
                    {unreachableIds.has(employee.id) ? (
                      <AlertTriangleIcon className="h-3 w-3 shrink-0 text-amber-600" />
                    ) : null}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dayKeys.map((dayKey) => {
              const parts = dayParts(dayKey);
              return (
                <tr key={dayKey} className={parts.isWeekend ? 'bg-muted/30' : undefined}>
                  <th
                    scope="row"
                    className={cn(
                      'sticky left-0 z-10 whitespace-nowrap border-b border-r p-2 text-left align-top font-normal',
                      parts.isWeekend ? 'bg-muted/60' : 'bg-background'
                    )}
                  >
                    <span className="font-medium">{parts.short}</span>
                    <br />
                    <span className="text-muted-foreground text-xs">{parts.weekday}</span>
                  </th>
                  <td className="border-b border-r p-1 align-top">
                    <Input
                      aria-label={`${dayKey} esemény`}
                      value={noteDraft[dayKey] ?? ''}
                      readOnly={!canWrite}
                      className={inputClass}
                      placeholder={canWrite ? 'pl. Atlétika Épül' : ''}
                      onChange={(e) => setNoteDraft((d) => ({ ...d, [dayKey]: e.target.value }))}
                      onBlur={(e) => canWrite && saveDayNote(dayKey, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                      }}
                    />
                  </td>
                  {employees.map((employee) => {
                    const key = cellKey(employee.id, dayKey);
                    const d = getDraft(key);
                    const cell = saved[key];
                    const active = Boolean(d.place.trim());
                    return (
                      <td
                        key={key}
                        className={cn(
                          'border-b border-r p-1 align-top last:border-r-0',
                          saving[key] && 'opacity-50'
                        )}
                      >
                        <div className="flex flex-col gap-0.5">
                          <Input
                            aria-label={`${employee.name} — ${dayKey} helyszín`}
                            value={d.place}
                            readOnly={!canWrite}
                            className={cn(inputClass, active && 'font-semibold')}
                            placeholder={canWrite ? 'Helyszín' : '—'}
                            onChange={(e) => patchDraft(key, { place: e.target.value })}
                            onBlur={() => canWrite && saveCell(employee.id, dayKey)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.currentTarget.blur();
                            }}
                          />
                          {canWrite || active ? (
                            <div className="flex items-center gap-0.5">
                              <Input
                                aria-label={`${employee.name} — ${dayKey} kezdés`}
                                type="time"
                                value={d.startTime}
                                readOnly={!canWrite}
                                className={cn(inputClass, 'w-[5.5rem] tabular-nums')}
                                onChange={(e) => patchDraft(key, { startTime: e.target.value })}
                                onBlur={() => canWrite && saveCell(employee.id, dayKey)}
                              />
                              <span className="text-muted-foreground text-xs">–</span>
                              <Input
                                aria-label={`${employee.name} — ${dayKey} vége`}
                                type="time"
                                value={d.endTime}
                                readOnly={!canWrite}
                                className={cn(inputClass, 'w-[5.5rem] tabular-nums')}
                                onChange={(e) => patchDraft(key, { endTime: e.target.value })}
                                onBlur={() => canWrite && saveCell(employee.id, dayKey)}
                              />
                              {cell?.overnight ? (
                                <span className="text-xs text-amber-600" title="Másnap ér véget">
                                  +1
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                          {canWrite || d.description ? (
                            <Input
                              aria-label={`${employee.name} — ${dayKey} leírás`}
                              value={d.description}
                              readOnly={!canWrite}
                              className={cn(inputClass, 'text-muted-foreground')}
                              placeholder={canWrite ? 'Leírás (opcionális)' : ''}
                              onChange={(e) => patchDraft(key, { description: e.target.value })}
                              onBlur={() => canWrite && saveCell(employee.id, dayKey)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') e.currentTarget.blur();
                              }}
                            />
                          ) : null}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <PublishDialog
        open={publishOpen}
        onOpenChange={(open) => {
          setPublishOpen(open);
          if (!open) setPublishSummary(null);
        }}
        planId={planId}
        status={status}
        employees={employees}
        unreachableIds={unreachableIds}
        summary={publishSummary}
        onSummary={setPublishSummary}
      />

      <FillSheet
        open={fillOpen}
        onOpenChange={setFillOpen}
        planId={planId}
        employees={employees}
        dayKeys={dayKeys}
        defaultStartTime={defaultStartTime}
      />

      <SettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        planId={planId}
        title={title}
        notes={notes}
        defaultShiftHours={defaultShiftHours}
        defaultStartTime={defaultStartTime}
        selectedEmployees={employees}
        candidateEmployees={candidateEmployees}
      />
    </div>
  );
}

function PublishDialog({
  open,
  onOpenChange,
  planId,
  status,
  employees,
  unreachableIds,
  summary,
  onSummary,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  status: 'draft' | 'published';
  employees: EditorEmployee[];
  unreachableIds: Set<string>;
  summary: PublishSummary | null;
  onSummary: (summary: PublishSummary | null) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [skipEmpty, setSkipEmpty] = useState(true);
  const [selected, setSelected] = useState<string[]>(() =>
    employees.filter((e) => !unreachableIds.has(e.id)).map((e) => e.id)
  );

  const submit = async () => {
    setPending(true);
    const result = await publishSchedulePlanAction({
      id: planId,
      employeeIds: selected,
      skipEmptyColumns: skipEmpty,
    });
    setPending(false);

    if (!result.success) {
      toast.error(result.message);
      return;
    }
    onSummary(result.data);
    toast.success(result.message ?? 'Kiküldve.');
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {status === 'published' ? 'Beosztás újraküldése' : 'Beosztás kiküldése'}
          </DialogTitle>
          <DialogDescription>
            Mindenki a saját oszlopát kapja meg táblázatként, egykattintásos belépő linkkel,
            naptár-feliratkozással és módosítás-kérő linkkel.
          </DialogDescription>
        </DialogHeader>

        {summary ? (
          <div className="flex flex-col gap-2 text-sm">
            <p className="font-medium">
              Kiküldve: {summary.sentCount} · Kimaradt: {summary.skippedCount}
            </p>
            <ul className="flex flex-col gap-1">
              {summary.recipients.map((r) => (
                <li key={r.employeeName} className="flex items-start justify-between gap-2">
                  <span>
                    {r.employeeName}
                    <span className="text-muted-foreground"> · {r.shiftCount} műszak</span>
                  </span>
                  {r.sent ? (
                    <Badge variant="secondary">elküldve</Badge>
                  ) : (
                    <Badge variant="outline" className="text-right text-xs font-normal">
                      {r.skippedReason}
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Bezárás
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Címzettek</Label>
              <div className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-md border p-2">
                {employees.map((employee) => (
                  <label key={employee.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selected.includes(employee.id)}
                      disabled={unreachableIds.has(employee.id)}
                      onCheckedChange={(checked) =>
                        setSelected((prev) =>
                          checked === true
                            ? [...new Set([...prev, employee.id])]
                            : prev.filter((id) => id !== employee.id)
                        )
                      }
                    />
                    <span
                      className={unreachableIds.has(employee.id) ? 'text-muted-foreground' : ''}
                    >
                      {employee.name}
                    </span>
                    {unreachableIds.has(employee.id) ? (
                      <Badge variant="outline" className="text-xs">
                        nem értesíthető
                      </Badge>
                    ) : null}
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={skipEmpty}
                onCheckedChange={(checked) => setSkipEmpty(checked === true)}
              />
              Ne küldjön annak, akinek nincs műszakja az időszakban
            </label>

            <Button
              type="button"
              onClick={submit}
              loading={pending}
              loadingText="Küldés…"
              disabled={selected.length === 0}
            >
              <SendIcon className="h-4 w-4" />
              Kiküldés ({selected.length})
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FillSheet({
  open,
  onOpenChange,
  planId,
  employees,
  dayKeys,
  defaultStartTime,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  employees: EditorEmployee[];
  dayKeys: string[];
  defaultStartTime: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [scope, setScope] = useState<'employee' | 'day'>('employee');
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? '');
  const [dayKey, setDayKey] = useState(dayKeys[0] ?? '');
  const [place, setPlace] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [onlyEmpty, setOnlyEmpty] = useState(true);
  const [skipWeekends, setSkipWeekends] = useState(true);

  const selectClassName = cn(
    'border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm'
  );

  const submit = async () => {
    setPending(true);
    const result = await fillSchedulePlanAction({
      planId,
      place,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      description: description || undefined,
      employeeId: scope === 'employee' ? employeeId : undefined,
      dayKey: scope === 'day' ? dayKey : undefined,
      onlyEmpty,
      skipWeekends: scope === 'employee' ? skipWeekends : false,
    });
    setPending(false);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message ?? 'Kitöltve.');
    onOpenChange(false);
    router.refresh();
  };

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} title="Tömeges kitöltés" size="md">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label>Mit töltünk ki?</Label>
          <select
            className={selectClassName}
            value={scope}
            onChange={(e) => setScope(e.target.value as 'employee' | 'day')}
          >
            <option value="employee">Egy dolgozó teljes oszlopa</option>
            <option value="day">Egy nap minden dolgozója</option>
          </select>
        </div>

        {scope === 'employee' ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="fill-employee">Dolgozó</Label>
            <select
              id="fill-employee"
              className={selectClassName}
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Label htmlFor="fill-day">Nap</Label>
            <select
              id="fill-day"
              className={selectClassName}
              value={dayKey}
              onChange={(e) => setDayKey(e.target.value)}
            >
              {dayKeys.map((d) => (
                <option key={d} value={d}>
                  {d} · {dayParts(d).weekday}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="fill-place">Helyszín</Label>
          <Input
            id="fill-place"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="pl. Kispest"
          />
          <p className="text-muted-foreground text-xs">
            Üresen hagyva az érintett cellák törlődnek.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="fill-start">Kezdés</Label>
            <Input
              id="fill-start"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="fill-end">Vége</Label>
            <Input
              id="fill-end"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>
        <p className="text-muted-foreground -mt-2 text-xs">
          Üresen hagyva a beosztás alapértéke érvényes (kezdés {defaultStartTime}).
        </p>

        <div className="flex flex-col gap-2">
          <Label htmlFor="fill-description">Leírás (opcionális)</Label>
          <Input
            id="fill-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={onlyEmpty}
            onCheckedChange={(checked) => setOnlyEmpty(checked === true)}
          />
          Csak az üres cellákat írja át
        </label>

        {scope === 'employee' ? (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={skipWeekends}
              onCheckedChange={(checked) => setSkipWeekends(checked === true)}
            />
            Hétvégét hagyja ki
          </label>
        ) : null}

        <Button type="button" onClick={submit} loading={pending} loadingText="Kitöltés…">
          Kitöltés
        </Button>
      </div>
    </EntitySheet>
  );
}

function SettingsSheet({
  open,
  onOpenChange,
  planId,
  title,
  notes,
  defaultShiftHours,
  defaultStartTime,
  selectedEmployees,
  candidateEmployees,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  title: string;
  notes?: string;
  defaultShiftHours: number;
  defaultStartTime: string;
  selectedEmployees: EditorEmployee[];
  candidateEmployees: EditorEmployee[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [selected, setSelected] = useState<string[]>(selectedEmployees.map((e) => e.id));

  const removed = selectedEmployees.filter((e) => !selected.includes(e.id));

  const save = async () => {
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    fd.delete('employeeIds');
    for (const id of selected) fd.append('employeeIds', id);

    setPending(true);
    const result = await updateSchedulePlanAction({ success: false }, fd);
    setPending(false);
    if (!result.success) {
      toast.error(result.message ?? 'A mentés sikertelen.');
      return;
    }
    toast.success(result.message ?? 'Mentve.');
    onOpenChange(false);
    router.refresh();
  };

  const remove = async () => {
    setPending(true);
    const result = await deleteSchedulePlanAction(planId);
    setPending(false);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message ?? 'Törölve.');
    router.push('/hr/schedules');
  };

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} title="Beosztás beállításai" size="md">
      <form ref={formRef} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={planId} />

        <div className="flex flex-col gap-2">
          <Label htmlFor="plan-title">Megnevezés</Label>
          <Input id="plan-title" name="title" defaultValue={title} maxLength={200} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="plan-start-time">Alapértelmezett kezdés</Label>
            <Input
              id="plan-start-time"
              name="defaultStartTime"
              type="time"
              defaultValue={defaultStartTime}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="plan-shift-hours">Műszak hossza (óra)</Label>
            <Input
              id="plan-shift-hours"
              name="defaultShiftHours"
              type="number"
              min={0.25}
              max={24}
              step={0.25}
              defaultValue={defaultShiftHours}
            />
          </div>
        </div>
        <p className="text-muted-foreground -mt-2 text-xs">
          Csak az ezután kitöltött cellákra hat; a meglévő műszakok nem változnak.
        </p>

        <div className="flex flex-col gap-2">
          <Label htmlFor="plan-notes">Megjegyzés a dolgozóknak</Label>
          <Textarea id="plan-notes" name="notes" rows={3} defaultValue={notes ?? ''} />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Dolgozók (oszlopok)</Label>
          <div className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-md border p-2">
            {candidateEmployees.map((employee) => (
              <label key={employee.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selected.includes(employee.id)}
                  onCheckedChange={(checked) =>
                    setSelected((prev) =>
                      checked === true
                        ? [...new Set([...prev, employee.id])]
                        : prev.filter((id) => id !== employee.id)
                    )
                  }
                />
                {employee.name}
              </label>
            ))}
          </div>
          {removed.length > 0 ? (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {removed.map((e) => e.name).join(', ')} eltávolításával a hozzájuk tartozó műszakok is
              törlődnek ebből a beosztásból.
            </p>
          ) : null}
        </div>

        <Button
          type="button"
          onClick={save}
          loading={pending}
          loadingText="Mentés…"
          disabled={selected.length === 0}
        >
          Mentés
        </Button>

        <div className="border-t pt-4">
          {confirmDelete ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm">
                A beosztás és minden hozzá tartozó műszak törlődik. A már kiküldött e-mailek nem
                vonhatók vissza.
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="destructive" onClick={remove} loading={pending}>
                  Végleges törlés
                </Button>
                <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>
                  Mégsem
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2Icon className="h-4 w-4" />
              Beosztás törlése
            </Button>
          )}
        </div>
      </form>
    </EntitySheet>
  );
}
