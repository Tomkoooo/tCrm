import { redirect } from 'next/navigation';

/** Legacy route — kimutatások are unified under leave-summary. */
export default async function ReportsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const p = new URLSearchParams();
  p.set('view', 'hours');
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === 'string' && key !== 'view') p.set(key, value);
  }
  redirect(`/accounting/leave-summary?${p.toString()}`);
}
