import { redirect } from 'next/navigation';
import { isPublicRegistrationEnabled } from '@crm/lib';
import { RegisterForm } from './register-form';

export default async function RegisterPage() {
  if (!isPublicRegistrationEnabled()) {
    redirect('/login');
  }

  return <RegisterForm />;
}
