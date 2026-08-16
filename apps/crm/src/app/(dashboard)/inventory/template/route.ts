import { NextResponse } from 'next/server';
import { requirePermission } from '@crm/auth';
import { getImportTemplateXlsx } from '@crm/inventory/import-template';

export const runtime = 'nodejs';

const FILENAME_ASCII = 'keszlet-import-sablon.xlsx';
const FILENAME_UTF8 = 'készlet-import-sablon.xlsx';

export async function GET() {
  await requirePermission('inventory:import');

  const buf = getImportTemplateXlsx();

  return new NextResponse(Buffer.from(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${FILENAME_ASCII}"; filename*=UTF-8''${encodeURIComponent(FILENAME_UTF8)}`,
      'Cache-Control': 'private, no-store',
    },
  });
}
