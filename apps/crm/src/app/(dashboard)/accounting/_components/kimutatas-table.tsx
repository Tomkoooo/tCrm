'use client';

import { cn } from '@crm/lib';

export function KimutatasTable({
  children,
  className,
  minWidth = '960px',
}: {
  children: React.ReactNode;
  className?: string;
  minWidth?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full text-sm', className)} style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function KimutatasTableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b text-left">{children}</tr>
    </thead>
  );
}

export function KimutatasTableTh({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <th className={cn('p-2', className)}>{children}</th>;
}

export function KimutatasTableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function KimutatasTableRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <tr className={cn('border-b align-top', className)}>{children}</tr>;
}

export function KimutatasTableTd({
  children,
  className,
  colSpan,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
  title?: string;
}) {
  return (
    <td className={cn('p-2', className)} colSpan={colSpan} title={title}>
      {children}
    </td>
  );
}

export function KimutatasEmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <KimutatasTableRow>
      <KimutatasTableTd colSpan={colSpan} className="text-muted-foreground">
        {message}
      </KimutatasTableTd>
    </KimutatasTableRow>
  );
}
