import { redirect } from 'next/navigation';
import { connectDB, hasAnyAdminUser } from '@crm/db';
import { SetupForm } from './setup-form';

export default async function SetupPage() {
  await connectDB();
  if (await hasAnyAdminUser()) {
    redirect('/login');
  }

  return <SetupForm />;
}
