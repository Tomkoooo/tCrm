import { cookies } from 'next/headers';
import mongoose from 'mongoose';
import { listEmployeesForUser, getEmployeeForUser } from '@crm/core';
import type { IEmployee } from '@crm/db';

export const ACTIVE_EMPLOYEE_COOKIE = 'hr_active_employee_id';

export async function resolveActiveEmployee(
  userId: mongoose.Types.ObjectId,
  preferredEmployeeId?: string | null
): Promise<IEmployee | null> {
  const employees = await listEmployeesForUser(userId);
  if (employees.length === 0) return null;
  if (employees.length === 1) return employees[0]!;

  if (preferredEmployeeId && mongoose.Types.ObjectId.isValid(preferredEmployeeId)) {
    const match = employees.find((e) => e._id.toString() === preferredEmployeeId);
    if (match) return match;
  }

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(ACTIVE_EMPLOYEE_COOKIE)?.value;
  if (fromCookie && mongoose.Types.ObjectId.isValid(fromCookie)) {
    const match = employees.find((e) => e._id.toString() === fromCookie);
    if (match) return match;
  }

  return employees[0]!;
}

export async function setActiveEmployeeCookie(employeeId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_EMPLOYEE_COOKIE, employeeId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function getActiveEmployeeOrThrow(
  userId: mongoose.Types.ObjectId,
  employeeIdParam?: string | null
): Promise<IEmployee> {
  const emp = await resolveActiveEmployee(userId, employeeIdParam);
  if (!emp) throw new Error('NO_LINKED_EMPLOYEE');
  return emp;
}

export async function listEmployeeMemberships(userId: mongoose.Types.ObjectId) {
  const employees = await listEmployeesForUser(userId);
  return employees.map((e) => ({
    _id: e._id.toString(),
    name: e.name,
    companyId: e.companyId.toString(),
  }));
}

export { getEmployeeForUser, listEmployeesForUser };
