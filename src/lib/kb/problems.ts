// The problems inside one merged ticket. causes.ts sorts a report by its tenant; that misses
// the reports where the date moved by one day instead of swapping day and month. The desk
// marked those in desk-notes.json, so they come out first, as a problem of their own.
import { causeOf, uniqueById, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = 'parser' | 'hint' | 'one-day' | 'unplaced';

export const PROBLEMS: Record<Problem, string> = {
  parser: 'shared parser reads day-first dates month first',
  hint: 'booking-v3 form hint says MM/DD, form reads DD/MM',
  'one-day': 'date moves by one day, not a day/month swap',
  unplaced: 'no tenant on file, or tenant writes month first',
};

export function problemOf(r: Report, t: Tenant | undefined, oneDayMove: readonly string[]): Problem {
  if (oneDayMove.includes(r.id)) return 'one-day';
  return causeOf(r, t) ?? 'unplaced';
}

export type ProblemGroup = {
  problem: Problem;
  ids: string[];
  tenants: number;
  // How many intake tagged as something else than this problem.
  mistagged: number;
  firstSeen: string;
  lastSeen: string;
};

export function groupByProblem(
  reports: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): ProblemGroup[] {
  const byProblem = new Map<Problem, Report[]>();
  for (const r of uniqueById(reports).filter((r) => r.mergedInto === ticket)) {
    const p = problemOf(r, tenantOf(r), oneDayMove);
    byProblem.set(p, [...(byProblem.get(p) ?? []), r]);
  }
  return [...byProblem.entries()]
    .map(([problem, rs]) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        problem,
        ids: rs.map((r) => r.id).sort(),
        tenants: new Set(rs.map((r) => r.tenant)).size,
        mistagged: rs.filter((r) => r.meta.intakeTag !== problem).length,
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
      };
    })
    .sort((a, b) => b.ids.length - a.ids.length);
}
