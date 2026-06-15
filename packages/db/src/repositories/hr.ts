import type { Types } from 'mongoose';
import { AbstractRepository } from './base';
import { MonthlyWorkSummary, type IMonthlyWorkSummary } from '../models/MonthlyWorkSummary';
import { EmployeeLeaveYear, type IEmployeeLeaveYear } from '../models/EmployeeLeaveYear';

export class MonthlyWorkSummaryRepository extends AbstractRepository<IMonthlyWorkSummary> {
  constructor() {
    super(MonthlyWorkSummary);
  }

  async findForPeriod(params: {
    year: number;
    month: number;
    companyId?: Types.ObjectId;
    allowedCompanyIds: Types.ObjectId[] | null;
  }): Promise<IMonthlyWorkSummary[]> {
    const filter: Record<string, unknown> = {
      year: params.year,
      month: params.month,
    };
    if (params.companyId) filter.companyId = params.companyId;
    else if (params.allowedCompanyIds !== null) {
      if (!params.allowedCompanyIds.length) return [];
      filter.companyId = { $in: params.allowedCompanyIds };
    }
    return this.model.find(filter).sort({ employeeId: 1 }).exec();
  }

  async findByEmployeeMonth(
    employeeId: Types.ObjectId,
    year: number,
    month: number
  ): Promise<IMonthlyWorkSummary | null> {
    return this.findOne({ employeeId, year, month });
  }
}

export class EmployeeLeaveYearRepository extends AbstractRepository<IEmployeeLeaveYear> {
  constructor() {
    super(EmployeeLeaveYear);
  }

  async findForYear(params: {
    year: number;
    companyId?: Types.ObjectId;
    employeeIds?: Types.ObjectId[];
    allowedCompanyIds: Types.ObjectId[] | null;
  }): Promise<IEmployeeLeaveYear[]> {
    const q: Record<string, unknown> = { year: params.year };
    if (params.employeeIds?.length) q.employeeId = { $in: params.employeeIds };
    if (params.companyId) {
      q.companyId = params.companyId;
      if (
        params.allowedCompanyIds !== null &&
        !params.allowedCompanyIds.some((id) => id.equals(params.companyId!))
      ) {
        return [];
      }
    } else if (params.allowedCompanyIds !== null) {
      if (!params.allowedCompanyIds.length) return [];
      q.companyId = { $in: params.allowedCompanyIds };
    }
    return this.model.find(q).lean().exec() as Promise<IEmployeeLeaveYear[]>;
  }
}

export const monthlyWorkSummaryRepository = new MonthlyWorkSummaryRepository();
export const employeeLeaveYearRepository = new EmployeeLeaveYearRepository();
