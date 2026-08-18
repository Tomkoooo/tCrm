import { describe, expect, it } from 'vitest';
import { jobEventDisplayName, mergeJobScheduleEvents } from './calendar-merge';

describe('jobEventDisplayName', () => {
  it('keeps a plain event name', () => {
    expect(jobEventDisplayName('Nyári fesztivál')).toBe('Nyári fesztivál');
  });

  it('strips role and pickup suffixes', () => {
    expect(jobEventDisplayName('Nyári fesztivál · sofőr · JOB-2026-0001-P01')).toBe(
      'Nyári fesztivál'
    );
  });
});

describe('mergeJobScheduleEvents', () => {
  it('collapses several roles on the same job into one block', () => {
    const merged = mergeJobScheduleEvents([
      {
        id: '1',
        title: 'Gála · vezető',
        start: '2026-08-17T08:00:00.000Z',
        end: '2026-08-17T18:00:00.000Z',
        kind: 'job',
        employeeId: 'emp-1',
        jobId: 'job-1',
        roles: ['director'],
      },
      {
        id: '2',
        title: 'Gála · sofőr · P01',
        start: '2026-08-17T07:00:00.000Z',
        end: '2026-08-17T12:00:00.000Z',
        kind: 'job',
        employeeId: 'emp-1',
        jobId: 'job-1',
        roles: ['driver'],
      },
      {
        id: '3',
        title: 'Gála · átvétel · P02',
        start: '2026-08-17T10:00:00.000Z',
        end: '2026-08-17T20:00:00.000Z',
        kind: 'job',
        employeeId: 'emp-1',
        jobId: 'job-1',
        roles: ['pickup'],
      },
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.title).toBe('Gála');
    expect(merged[0]?.start).toBe('2026-08-17T07:00:00.000Z');
    expect(merged[0]?.end).toBe('2026-08-17T20:00:00.000Z');
    expect(merged[0]?.roles).toEqual(['director', 'driver', 'pickup']);
  });

  it('keeps two jobs for the same person separate', () => {
    const merged = mergeJobScheduleEvents([
      {
        id: '1',
        title: 'A',
        start: '2026-08-17T08:00:00.000Z',
        end: '2026-08-17T10:00:00.000Z',
        kind: 'job',
        employeeId: 'emp-1',
        jobId: 'job-a',
      },
      {
        id: '2',
        title: 'B',
        start: '2026-08-17T09:00:00.000Z',
        end: '2026-08-17T11:00:00.000Z',
        kind: 'job',
        employeeId: 'emp-1',
        jobId: 'job-b',
      },
    ]);
    expect(merged).toHaveLength(2);
  });

  it('does not merge leave or roster blocks', () => {
    const merged = mergeJobScheduleEvents([
      {
        id: '1',
        title: 'Szabadság',
        start: '2026-08-17T00:00:00.000Z',
        end: '2026-08-18T00:00:00.000Z',
        kind: 'off',
        employeeId: 'emp-1',
      },
      {
        id: '2',
        title: 'Gála',
        start: '2026-08-17T08:00:00.000Z',
        end: '2026-08-17T18:00:00.000Z',
        kind: 'job',
        employeeId: 'emp-1',
        jobId: 'job-1',
      },
    ]);
    expect(merged).toHaveLength(2);
  });
});
