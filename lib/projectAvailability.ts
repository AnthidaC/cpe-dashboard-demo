import type { Project } from './mockData';

export type ProjectMetric = 'budget' | 'actual' | 'target' | 'participants' | 'respondents' | 'satisfaction' | 'hours';

export const metricNames: Record<ProjectMetric, string> = {
  budget: 'งบอนุมัติ', actual: 'งบใช้จริง', target: 'เป้าหมายผู้เข้าร่วม',
  participants: 'ผู้เข้าร่วมจริง', respondents: 'ผู้ตอบแบบสอบถาม',
  satisfaction: 'คะแนนความพึงพอใจ', hours: 'ชั่วโมงกิจกรรม',
};

export function hasProjectMetric(project: Project, metric: ProjectMetric): boolean {
  if (project.missingMetrics?.includes(metric)) return false;
  const value = project[metric];
  return Number.isFinite(value) && (metric !== 'satisfaction' || value > 0);
}

export function canPlotProject(project: Project, metrics: ProjectMetric[], positive: ProjectMetric[] = []): boolean {
  return metrics.every(metric => hasProjectMetric(project, metric))
    && positive.every(metric => project[metric] > 0);
}

export function projectCoverage(projects: Project[], metrics: ProjectMetric[], positive: ProjectMetric[] = []) {
  return { available: projects.filter(project => canPlotProject(project, metrics, positive)).length, total: projects.length };
}

export function missingProjectMetrics(project: Project, metrics: ProjectMetric[]) {
  return metrics.filter(metric => !hasProjectMetric(project, metric));
}
