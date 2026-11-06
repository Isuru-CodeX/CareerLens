/**
 * frontend/src/utils/years.ts - Standard year calculation and intervals merging logic.
 * Follows the core rule:
 * - 2023 to 2025 is 2 years
 * - 2023 to 2026 is 3 years
 * - Current jobs calculate dynamically up to current year
 * - Overlapping intervals across multiple jobs are merged and counted once!
 */

export interface Period {
  startYear: number;
  endYear?: number | null;
  isCurrent: boolean;
}

export const INDUSTRIES: string[] = [
  'Information Technology',
  'Software & SaaS',
  'Finance & Banking',
  'Healthcare',
  'Education',
  'Manufacturing',
  'Retail & E-commerce',
  'Telecommunications',
  'Marketing & Advertising',
  'Consulting',
  'Government & Public Sector',
  'Engineering & Construction',
  'Hospitality & Tourism',
  'Logistics & Transport',
  'Media & Entertainment',
  'Non-profit',
  'Other',
];

export const currentYear = (): number => new Date().getFullYear();

const endOf = (p: Period, today: number): number => {
  if (p.isCurrent) return today;
  if (p.endYear !== null && p.endYear !== undefined) return p.endYear;
  return p.startYear;
};

export function yearsCount(p: Period, today: number = currentYear()): number {
  return Math.max(0, endOf(p, today) - p.startYear);
}

export function totalYears(periods: Period[], today: number = currentYear()): number {
  if (!periods.length) return 0;

  const intervals = periods
    .map((p) => [p.startYear, endOf(p, today)] as [number, number])
    .filter(([start, end]) => end >= start)
    .sort((a, b) => a[0] - b[0]);

  if (!intervals.length) return 0;

  let total = 0;
  let cur: [number, number] | null = null;

  for (const [s, e] of intervals) {
    if (!cur) {
      cur = [s, e];
    } else if (s <= cur[1]) {
      cur[1] = Math.max(cur[1], e);
    } else {
      total += cur[1] - cur[0];
      cur = [s, e];
    }
  }

  if (cur) {
    total += cur[1] - cur[0];
  }

  return total;
}

