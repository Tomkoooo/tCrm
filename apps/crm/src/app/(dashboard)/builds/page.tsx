import { redirect } from 'next/navigation';

export default function BuildsRedirectPage() {
  redirect('/inventory/builds');
}
