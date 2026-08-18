'use client';

import { useState, useTransition } from 'react';
import { Button } from '@crm/ui';
import { previewLeaveImportAction, commitLeaveImportAction } from '../../../actions';
import type { LeaveImportMatchedRow } from '@crm/hr';

export function LeaveImportClient() {
  const [preview, setPreview] = useState<{
    rows: LeaveImportMatchedRow[];
    summary: {
      total: number;
      matched: number;
      companyUnmatched: number;
      employeeUnmatched: number;
    };
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            const result = await previewLeaveImportAction(fd);
            if (!result.success || !result.preview) {
              setMessage(result.message ?? 'Hiba');
              setPreview(null);
              return;
            }
            setMessage(null);
            setPreview(result.preview);
          });
        }}
      >
        <input type="file" name="file" accept=".xlsx,.xls" required />
        <Button type="submit" loading={pending} disabled={pending}>
          Előnézet
        </Button>
      </form>

      {message ? <p className="text-sm text-red-600">{message}</p> : null}

      {preview ? (
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm">
            Összesen {preview.summary.total} · egyezik {preview.summary.matched} · cég nélkül{' '}
            {preview.summary.companyUnmatched} · dolgozó nélkül {preview.summary.employeeUnmatched}
          </p>
          <div className="max-h-80 overflow-auto rounded-md border text-xs">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2">Név</th>
                  <th className="p-2">Cég</th>
                  <th className="p-2">Státusz</th>
                  <th className="p-2">Keret</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 100).map((r, i) => (
                  <tr key={`${r.employeeName}-${i}`} className="border-b">
                    <td className="p-2">{r.employeeName}</td>
                    <td className="p-2">{r.companyLabel}</td>
                    <td className="p-2">{r.status}</td>
                    <td className="p-2">{r.entitlementDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            type="button"
            disabled={pending || preview.summary.matched === 0}
            loading={pending}
            onClick={() => {
              startTransition(async () => {
                const result = await commitLeaveImportAction(JSON.stringify(preview.rows));
                setMessage(result.message ?? (result.success ? 'Kész' : 'Hiba'));
              });
            }}
          >
            Egyező sorok mentése
          </Button>
        </div>
      ) : null}
    </div>
  );
}
