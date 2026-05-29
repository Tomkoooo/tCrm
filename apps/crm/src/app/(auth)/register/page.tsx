import { redirect } from 'next/navigation';
import { connectDB, Company } from '@crm/db';
import { isPublicRegistrationEnabled } from '@crm/lib';
import { RegisterForm } from './register-form';

export default async function RegisterPage() {
  if (!isPublicRegistrationEnabled()) {
    redirect('/login');
  }

  await connectDB();
  const companies = await Company.find({ isActive: true }).sort({ name: 1 }).lean().exec();

  return <RegisterForm companies={companies.map((c) => ({ _id: String(c._id), name: c.name }))} />;
}
