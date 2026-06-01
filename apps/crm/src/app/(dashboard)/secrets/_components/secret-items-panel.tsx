'use client';

import { useActionState, useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CopyIcon, EyeIcon, EyeOffIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EntitySheet } from '@crm/ui';
import type { SecretValueFormat } from '@crm/db';
import {
  addSecretItemAction,
  deleteSecretItemAction,
  revealSecretValueAction,
  type SecretFormState,
} from '../actions';
import { EditSecretItemSheet } from './edit-secret-item-sheet';

export type SecretItemRow = {
  id: string;
  key: string;
  valueFormat?: SecretValueFormat;
  description?: string;
};

const MASK = '••••••••••••';

function ValuePreview({ text, multiline }: { text: string; multiline: boolean }) {
  if (multiline) {
    return (
      <pre className="max-h-32 max-w-full overflow-auto whitespace-pre-wrap break-all font-mono text-xs leading-relaxed">
        {text}
      </pre>
    );
  }
  return (
    <span className="wrap-anywhere block max-w-full break-all font-mono text-sm leading-relaxed">
      {text}
    </span>
  );
}

export function SecretItemsPanel({
  projectId,
  items,
  canWrite,
}: {
  projectId: string;
  items: SecretItemRow[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<SecretItemRow | null>(null);
  const [valueFormat, setValueFormat] = useState<SecretValueFormat>('single');
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [pendingReveal, setPendingReveal] = useState<Record<string, boolean>>({});
  const boundAdd = addSecretItemAction.bind(null, projectId);
  const [addState, addAction, addPending] = useActionState(boundAdd, {
    success: false,
  } satisfies SecretFormState);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (addState.success) {
      toast.success(addState.message);
      setAddOpen(false);
      setValueFormat('single');
      router.refresh();
    } else if (addState.message && !addState.success) {
      toast.error(addState.message);
    }
  }, [addState, router]);

  const closeEdit = () => {
    if (editItem) {
      setRevealed((r) => {
        const next = { ...r };
        delete next[editItem.id];
        return next;
      });
    }
    setEditItem(null);
  };

  const fetchValue = useCallback(
    async (itemId: string): Promise<string | null> => {
      if (revealed[itemId]) return revealed[itemId];
      setPendingReveal((p) => ({ ...p, [itemId]: true }));
      try {
        const result = await revealSecretValueAction(projectId, itemId);
        if (!result.success || result.value === undefined) {
          toast.error(result.message ?? 'Nem sikerült betölteni az értéket.');
          return null;
        }
        setRevealed((r) => ({ ...r, [itemId]: result.value! }));
        return result.value;
      } finally {
        setPendingReveal((p) => ({ ...p, [itemId]: false }));
      }
    },
    [projectId, revealed]
  );

  const toggleReveal = async (itemId: string) => {
    if (revealed[itemId]) {
      setRevealed((r) => {
        const next = { ...r };
        delete next[itemId];
        return next;
      });
      return;
    }
    await fetchValue(itemId);
  };

  const copyValue = async (itemId: string) => {
    const value = await fetchValue(itemId);
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Másolva a vágólapra');
    } catch {
      toast.error('Vágólap másolás sikertelen');
    }
  };

  const handleDelete = (itemId: string) => {
    if (!confirm('Biztosan törli ezt a titkot?')) return;
    startTransition(async () => {
      const result = await deleteSecretItemAction(projectId, itemId);
      if (result.success) {
        toast.success(result.message);
        setRevealed((r) => {
          const next = { ...r };
          delete next[itemId];
          return next;
        });
        router.refresh();
      } else {
        toast.error(result.message ?? 'Törlés sikertelen');
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          Kulcs–érték párok a projekthez (pl. banki adatok, API kulcsok). Többsoros értékhez
          válassza a szövegmezőt.
        </p>
        {canWrite && (
          <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
            Kulcs hozzáadása
          </Button>
        )}
      </div>

      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[18%]">Kulcs</TableHead>
            <TableHead className="w-[10%]">Típus</TableHead>
            <TableHead className="w-[38%]">Érték</TableHead>
            <TableHead className="w-[22%]">Leírás</TableHead>
            <TableHead className="w-[12%]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground text-center">
                Még nincs titok ebben a projektben. Adjon hozzá kulcsokat a fenti gombbal.
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => {
              const multiline =
                item.valueFormat === 'multiline' || (revealed[item.id]?.includes('\n') ?? false);
              return (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-normal break-all align-top font-mono text-sm">
                    {item.key}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-normal align-top text-xs">
                    {item.valueFormat === 'multiline' ? 'Többsoros' : 'Egysoros'}
                  </TableCell>
                  <TableCell className="min-w-0 whitespace-normal align-top">
                    {revealed[item.id] ? (
                      <ValuePreview text={revealed[item.id]} multiline={multiline} />
                    ) : (
                      <span className="font-mono text-sm">{MASK}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground wrap-break-word whitespace-normal align-top text-sm">
                    {item.description ?? '—'}
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title={revealed[item.id] ? 'Elrejtés' : 'Megjelenítés'}
                        loading={pendingReveal[item.id] || isPending}
                        disabled={pendingReveal[item.id] || isPending}
                        onClick={() => toggleReveal(item.id)}
                      >
                        {revealed[item.id] ? (
                          <EyeOffIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Másolás"
                        loading={pendingReveal[item.id] || isPending}
                        disabled={pendingReveal[item.id] || isPending}
                        onClick={() => copyValue(item.id)}
                      >
                        <CopyIcon className="h-4 w-4" />
                      </Button>
                      {canWrite && (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title="Szerkesztés"
                            loading={isPending}
                            disabled={isPending}
                            onClick={() => setEditItem(item)}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title="Törlés"
                            loading={isPending}
                            disabled={isPending}
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {canWrite && (
        <EntitySheet
          open={addOpen}
          onOpenChange={(open) => {
            setAddOpen(open);
            if (!open) setValueFormat('single');
          }}
          title="Új kulcs–érték pár"
          size="lg"
          mode="create"
        >
          <form action={addAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="key">Kulcs</Label>
              <Input
                id="key"
                name="key"
                required
                placeholder="pl. BANK_ACCOUNT vagy COMPANY_DATA"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Érték típusa</Label>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="valueFormat"
                    value="single"
                    checked={valueFormat === 'single'}
                    onChange={() => setValueFormat('single')}
                  />
                  Egysoros (jelszó, token)
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="valueFormat"
                    value="multiline"
                    checked={valueFormat === 'multiline'}
                    onChange={() => setValueFormat('multiline')}
                  />
                  Többsoros (cég-, bankadatok)
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="value">Érték</Label>
              {valueFormat === 'multiline' ? (
                <Textarea
                  id="value"
                  name="value"
                  required
                  rows={8}
                  className="font-mono text-sm"
                  placeholder={'pl.\nIBAN: HU42 …\nSWIFT: …\nSzámlatulajdonos: …'}
                  autoComplete="off"
                />
              ) : (
                <Input id="value" name="value" required type="password" autoComplete="off" />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Leírás (opcionális)</Label>
              <Input id="description" name="description" placeholder="Mihez tartozik ez a kulcs?" />
            </div>
            <Button
              type="submit"
              loading={addPending || isPending}
              disabled={addPending || isPending}
            >
              {addPending ? 'Mentés…' : 'Hozzáadás'}
            </Button>
          </form>
        </EntitySheet>
      )}

      {canWrite && editItem && (
        <EditSecretItemSheet
          projectId={projectId}
          item={editItem}
          open={Boolean(editItem)}
          onOpenChange={(open) => {
            if (!open) closeEdit();
          }}
        />
      )}
    </div>
  );
}
