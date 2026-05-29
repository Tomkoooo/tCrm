import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { Company, Employee, Role, User, connectDB, ensureBaselineRbac } from '@crm/db';
import { loadAppEnv } from './load-env';

export default async function globalSetup(): Promise<void> {
  loadAppEnv();

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('[e2e] MONGODB_URI not set — skipping E2E user seed');
    return;
  }

  await connectDB();
  await ensureBaselineRbac();

  const employeeEmail = process.env.E2E_EMPLOYEE_EMAIL ?? 'e2e-employee@tcrm.local';
  const employeePassword = process.env.E2E_EMPLOYEE_PASSWORD ?? 'e2eemployee123';

  let company = await Company.findOne({ slug: 'e2e-test-co' }).exec();
  if (!company) {
    company = await Company.create({
      name: 'E2E Test Co',
      slug: 'e2e-test-co',
      isActive: true,
    });
  }

  const employeeRole = await Role.findOne({ key: 'employee' }).exec();
  const roleIds = employeeRole ? [employeeRole._id] : [];

  let user = await User.findOne({ email: employeeEmail.toLowerCase() }).exec();
  if (!user) {
    const passwordHash = await bcrypt.hash(employeePassword, 10);
    user = await User.create({
      email: employeeEmail.toLowerCase(),
      name: 'E2E Employee',
      passwordHash,
      roleIds,
      directPermissionKeys: ['hr:self'],
      isActive: true,
    });
  } else if (employeeRole && !user.roleIds.some((id) => id.equals(employeeRole._id))) {
    user.roleIds.push(employeeRole._id);
    await user.save();
  }

  const existingEmp = await Employee.findOne({ userId: user._id }).exec();
  if (!existingEmp) {
    await Employee.create({
      companyId: company._id,
      name: user.name,
      email: user.email,
      userId: user._id,
      employmentType: 'employee',
      isActive: true,
    });
  }

  await mongoose.disconnect();
}
