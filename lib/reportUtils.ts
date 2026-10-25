import type { Project } from './mockData';
import { deriveDateContext } from './cohortUtils';

export const NOT_CALCULABLE = 'ไม่สามารถคำนวณได้';

/** Missing or invalid project dates must never be silently grouped under today's date. */
export function projectDateContext(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parts = value.split('-');
  const year = Number(parts[0]) > 2500 ? Number(parts[0]) - 543 : Number(parts[0]);
  const normalized = `${String(year).padStart(4, '0')}-${parts[1]}-${parts[2]}`;
  const date = new Date(`${normalized}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== normalized) return null;
  return deriveDateContext(normalized);
}

export function fiscalYears(projects: Project[]): number[] {
  return Array.from(new Set(projects.flatMap(p => { const date = projectDateContext(p.startDate); return date ? [date.fiscalYearBE] : []; }))).sort((a, b) => b - a);
}

export function safeRatio(numerator: number, denominator: number): number | null {
  const result = numerator / denominator;
  return denominator > 0 && Number.isFinite(numerator) && Number.isFinite(denominator) && Number.isFinite(result) ? result : null;
}

export function academicYears(projects: Project[]): number[] {
  return Array.from(new Set(projects.map(p => p.academicYear).filter((year): year is number => typeof year === 'number' && Number.isFinite(year)))).sort((a, b) => b - a);
}

export function lecturerOptions(projects: Project[]) {
  return [
    { value: 'all', label: 'ทุกผู้รับผิดชอบโครงการ' },
    ...Array.from(new Set(projects.flatMap(projectResponsibleNames)))
      .sort((a, b) => a.localeCompare(b, 'th'))
      .map(name => ({ value: name, label: name })),
  ];
}

export function ratioLabel(numerator: number, denominator: number, percent = false): string {
  const ratio = safeRatio(numerator, denominator);
  if (ratio === null) return NOT_CALCULABLE;
  return percent ? `${(ratio * 100).toFixed(1)}%`
    : Math.round(ratio).toLocaleString('th-TH');
}

export function projectResponsibleNames(project: Project): string[] {
  return project.responsibleNames?.length ? project.responsibleNames : [project.lecturer || 'ไม่ระบุ'];
}
export function matchesResponsible(project: Project, name: string) { return projectResponsibleNames(project).includes(name); }
