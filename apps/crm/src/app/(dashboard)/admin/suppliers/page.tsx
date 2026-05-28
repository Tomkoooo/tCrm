import { redirect } from 'next/navigation';

export default function AdminSuppliersRedirect() {
  redirect('/inventory/suppliers');
}
