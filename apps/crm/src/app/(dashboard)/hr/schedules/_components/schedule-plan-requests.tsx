'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CheckIcon, XIcon } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Label, Textarea } from '@crm/ui';
import { formatScheduleRange } from '@crm/lib';
import { reviewSchedulePlanRequestAction } from '../actions';

export type RequestRow = {
  id: string;
  employeeName: string;
  status: string;
  originalStart: string;
  originalEnd: string;
  proposedStart: string;
  proposedEnd: string;
  note?: string;
  reviewNote?: string;
  createdAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Elbírálásra vár',
  approved: 'Elfogadva',
  rejected: 'Elutasítva',
  cancelled: 'Visszavonva',
};

export function SchedulePlanRequests({
  canWrite,
  requests,
}: {
  canWrite: boolean;
  requests: RequestRow[];
}) {
  const router = useRouter();
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);

  const decide = async (id: string, decision: 'approved' | 'rejected') => {
    setPendingId(id);
    const result = await reviewSchedulePlanRequestAction({
      id,
      decision,
      reviewNote: reviewNotes[id],
    });
    setPendingId(null);

    if (!result.success) {
      toast.error(result.message);
      return;
    }
    // The decision is applied even when the notification could not go out, so a
    // non-delivery is a warning rather than a failure.
    if (result.data.mailSent) toast.success(result.message ?? 'Elbírálva.');
    else toast.warning(result.message ?? 'Elbírálva, de az e-mail nem ment ki.');
    router.refresh();
  };

  if (requests.length === 0) {
    return (
      <div className="text-muted-foreground rounded-md border border-dashed p-8 text-center text-sm">
        Nincs módosítási kérelem erre a beosztásra. A dolgozók a kiküldött e-mailből, a „Beosztásom”
        oldalon tudnak kérelmet beadni.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {requests.map((request) => {
        const isPending = request.status === 'pending';
        return (
          <Card key={request.id}>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">{request.employeeName}</CardTitle>
              <Badge
                variant={
                  request.status === 'approved'
                    ? 'secondary'
                    : request.status === 'pending'
                      ? 'destructive'
                      : 'outline'
                }
              >
                {STATUS_LABELS[request.status] ?? request.status}
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="grid gap-1 sm:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">Jelenlegi: </span>
                  {formatScheduleRange(
                    new Date(request.originalStart),
                    new Date(request.originalEnd)
                  )}
                </p>
                <p>
                  <span className="text-muted-foreground">Javasolt: </span>
                  <strong>
                    {formatScheduleRange(
                      new Date(request.proposedStart),
                      new Date(request.proposedEnd)
                    )}
                  </strong>
                </p>
              </div>

              {request.note ? (
                <p className="bg-muted/50 rounded-md p-2">
                  <span className="text-muted-foreground">A dolgozó megjegyzése: </span>
                  {request.note}
                </p>
              ) : null}

              {request.reviewNote ? (
                <p className="bg-muted/50 rounded-md p-2">
                  <span className="text-muted-foreground">Visszajelzés: </span>
                  {request.reviewNote}
                </p>
              ) : null}

              {isPending && canWrite ? (
                <div className="flex flex-col gap-2 border-t pt-3">
                  <Label htmlFor={`review-note-${request.id}`}>
                    Visszajelzés a dolgozónak (opcionális)
                  </Label>
                  <Textarea
                    id={`review-note-${request.id}`}
                    rows={2}
                    maxLength={2000}
                    placeholder="Ez a szöveg bekerül a döntésről szóló e-mailbe."
                    value={reviewNotes[request.id] ?? ''}
                    onChange={(e) =>
                      setReviewNotes((prev) => ({ ...prev, [request.id]: e.target.value }))
                    }
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      loading={pendingId === request.id}
                      onClick={() => decide(request.id, 'approved')}
                    >
                      <CheckIcon className="h-4 w-4" />
                      Elfogadás
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pendingId === request.id}
                      onClick={() => decide(request.id, 'rejected')}
                    >
                      <XIcon className="h-4 w-4" />
                      Elutasítás
                    </Button>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Elfogadás a műszakot a javasolt időpontra állítja, és e-mailt küld a dolgozónak.
                  </p>
                </div>
              ) : null}

              <p className="text-muted-foreground text-xs">
                Beadva: {new Date(request.createdAt).toLocaleString('hu-HU')}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
