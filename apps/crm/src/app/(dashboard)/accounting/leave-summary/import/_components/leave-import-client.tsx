'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { LeaveImportMatchedRow, LeaveImportPreview } from '@crm/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { commitLeaveImportAction, parseLeaveExcelAction } from '../actions';

export function LeaveImportClient() {
  const [preview, setPreview] = useState<LeaveImportPreview | null>(null);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [parsePending, startParse] = useTransition();
  const [commitPending, startCommit] = useTransition();

  const onFileChange = (file: File | null) => {
    if (!file) return;
    const fd = new FormData();
    fd.set('file', file);
    startParse(async () => {
      const res = await parseLeaveExcelAction(fd);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      setPreview(res.preview);
      setSelectedSheets(res.preview.sheetNames.filter((n: string) => /20\d{2}/.test(n)));
      toast.success(`${res.preview.rows.length} sor feldolgozva.`);
    });
  };

  const onReparse = () => {
    const input = document.getElementById('leave-import-file') as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file || !preview) return;
    const fd = new FormData();
    fd.set('file', file);
    for (const sheet of selectedSheets) fd.append('sheetNames', sheet);
    startParse(async () => {
      const res = await parseLeaveExcelAction(fd);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      setPreview(res.preview);
    });
  };

  const onCommit = () => {
    if (!preview) return;
    startCommit(async () => {
      const res = await commitLeaveImportAction(preview.rows);
      if (res.success) toast.success(res.message);
      else toast.error(res.message);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/accounting/leave-summary">← Kimutatások</Link>
        </Button>
      </div>

      <section className="border-border bg-card rounded-lg border p-4">
        <h2 className="mb-2 text-lg font-semibold">Excel feltöltés</h2>
        <p className="text-muted-foreground mb-4 text-sm">
          Töltse fel a szabadság összesítő fájlt (.xlsx). A cégeket és dolgozókat név alapján
          párosítjuk a CRM rekordokkal — CRM fiók nem szükséges, elég a dolgozó rekord.
        </p>
        <div className="flex flex-col gap-3 sm:max-w-md">
          <Label htmlFor="leave-import-file">Fájl</Label>
          <Input
            id="leave-import-file"
            type="file"
            accept=".xlsx,.xls"
            disabled={parsePending}
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          />
        </div>
      </section>

      {preview ? (
        <>
          <section className="border-border bg-card rounded-lg border p-4">
            <h2 className="mb-2 text-lg font-semibold">Munkalapok</h2>
            <p className="text-muted-foreground mb-3 text-sm">
              Válassza ki az importálandó éveket (pl. az elmúlt 6 hónap / év munkalapjait).
            </p>
            <div className="flex flex-wrap gap-3">
              {preview.sheetNames.map((name) => (
                <label key={name} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedSheets.includes(name)}
                    onChange={(e) => {
                      setSelectedSheets((prev) =>
                        e.target.checked ? [...prev, name] : prev.filter((n) => n !== name)
                      );
                    }}
                  />
                  {name}
                </label>
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3"
              loading={parsePending}
              disabled={parsePending || selectedSheets.length === 0}
              onClick={onReparse}
            >
              Kijelölés alkalmazása
            </Button>
          </section>

          <section className="border-border bg-card rounded-lg border p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">Előnézet</h2>
                <p className="text-muted-foreground text-sm">
                  {preview.summary.matched} egyező · {preview.summary.employeeUnmatched} ismeretlen
                  dolgozó · {preview.summary.companyUnmatched} ismeretlen cég
                </p>
              </div>
              <Button
                type="button"
                loading={commitPending}
                disabled={commitPending || preview.summary.matched === 0}
                onClick={onCommit}
              >
                Egyező sorok importálása
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-2">Státusz</th>
                    <th className="p-2">Excel cég</th>
                    <th className="p-2">Excel név</th>
                    <th className="p-2">CRM egyezés</th>
                    <th className="p-2">Év</th>
                    <th className="p-2">Keret</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, idx) => (
                    <ImportPreviewRow key={`${row.sheetName}-${row.rowIndex}-${idx}`} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function ImportPreviewRow({ row }: { row: LeaveImportMatchedRow }) {
  const statusLabel =
    row.status === 'matched'
      ? 'Egyező'
      : row.status === 'employee_unmatched'
        ? 'Nincs dolgozó'
        : 'Nincs cég';

  const statusClass =
    row.status === 'matched'
      ? 'text-green-700 dark:text-green-400'
      : 'text-amber-700 dark:text-amber-400';

  return (
    <tr className="border-b align-top">
      <td className={`p-2 font-medium ${statusClass}`}>{statusLabel}</td>
      <td className="p-2">{row.companyLabel}</td>
      <td className="p-2">{row.employeeName}</td>
      <td className="p-2">
        {row.status === 'matched' ? (
          <>
            <span className="block">{row.matchedEmployeeName}</span>
            <span className="text-muted-foreground text-xs">{row.companyName}</span>
          </>
        ) : row.companyName ? (
          <span className="text-muted-foreground text-xs">{row.companyName}</span>
        ) : (
          '—'
        )}
      </td>
      <td className="p-2">{row.year}</td>
      <td className="p-2">{row.entitlementDays || '—'}</td>
    </tr>
  );
}
