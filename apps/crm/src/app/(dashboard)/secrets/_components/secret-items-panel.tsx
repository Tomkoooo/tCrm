'use client';

import { useActionState, useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CopyIcon, EyeIcon, EyeOffIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EntitySheet } from '@crm/ui';
import {
  addSecretItemAction,
  deleteSecretItemAction,
  revealSecretValueAction,
  type SecretFormState,
} from '../actions';

export type SecretItemRow = {
  id: string;
  key: string;
  description?: string;
};

const MASK = '••••••••••••';

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
      router.refresh();
    } else if (addState.message && !addState.success) {
      toast.error(addState.message);
    }
  }, [addState, router]);

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
        <h2 className="text-lg font-semibold">Titkok</h2>
        {canWrite && (
          <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
            Kulcs hozzáadása
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kulcs</TableHead>
            <TableHead>Érték</TableHead>
            <TableHead>Leírás</TableHead>
            <TableHead className="w-[120px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground text-center">
                Még nincs titok ebben a projektben.
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-sm">{item.key}</TableCell>
                <TableCell className="max-w-xs truncate font-mono text-sm">
                  {revealed[item.id] ?? MASK}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {item.description ?? '—'}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title={revealed[item.id] ? 'Elrejtés' : 'Megjelenítés'}
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
                      disabled={pendingReveal[item.id] || isPending}
                      onClick={() => copyValue(item.id)}
                    >
                      <CopyIcon className="h-4 w-4" />
                    </Button>
                    {canWrite && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Törlés"
                        disabled={isPending}
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {canWrite && (
        <EntitySheet
          open={addOpen}
          onOpenChange={setAddOpen}
          title="Új kulcs–érték pár"
          size="md"
          mode="create"
        >
          <form action={addAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="key">Kulcs</Label>
              <Input id="key" name="key" required placeholder="pl. API_KEY" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="value">Érték</Label>
              <Input id="value" name="value" required type="password" autoComplete="off" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Leírás (opcionális)</Label>
              <Input id="description" name="description" />
            </div>
            <Button type="submit" disabled={addPending || isPending}>
              {addPending ? 'Mentés…' : 'Hozzáadás'}
            </Button>
          </form>
        </EntitySheet>
      )}
    </div>
  );
}
