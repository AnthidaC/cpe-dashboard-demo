import type { Project, KUIdentity } from './mockData';
import { academicYears, projectDateContext } from './reportUtils';

export type ActivityPeriod = 'quarter' | 'month' | 'year';

const months = [
  { month: 6, label: 'มิ.ย.' }, { month: 7, label: 'ก.ค.' },
  { month: 8, label: 'ส.ค.' }, { month: 9, label: 'ก.ย.' },
  { month: 10, label: 'ต.ค.' }, { month: 11, label: 'พ.ย.' },
  { month: 12, label: 'ธ.ค.' }, { month: 1, label: 'ม.ค.' },
  { month: 2, label: 'ก.พ.' }, { month: 3, label: 'มี.ค.' },
  { month: 4, label: 'เม.ย.' }, { month: 5, label: 'พ.ค.' },
];

/** Input already follows the page filters; dates must also fall within that academic year. */
export function cumulativeAcademicActivities(projects: Project[], period: ActivityPeriod) {
  const periods = period === 'month'
    ? months.map(({ month, label }) => ({ label, months: [month] }))
    : period === 'year'
      ? [{ label: 'มิ.ย. - พ.ค.', months: months.map(item => item.month) }]
      : [
        { label: 'Q1 (มิ.ย. - ส.ค.)', months: [6, 7, 8] },
        { label: 'Q2 (ก.ย. - พ.ย.)', months: [9, 10, 11] },
        { label: 'Q3 (ธ.ค. - ก.พ.)', months: [12, 1, 2] },
        { label: 'Q4 (มี.ค. - พ.ค.)', months: [3, 4, 5] },
      ];
  const datedProjects = projects.map(project => ({ project, date: projectDateContext(project.startDate) }));
  const labels: string[] = [];
  const newCounts: number[] = [];
  const countsByGroup: Record<KUIdentity, number[]> = { I: [], D: [], K: [], U: [] };
  const groups: KUIdentity[] = ['I', 'D', 'K', 'U'];

  academicYears(projects).reverse().forEach(year => {
    const runningCounts: Record<KUIdentity, number> = { I: 0, D: 0, K: 0, U: 0 };
    periods.forEach(bucket => {
      labels.push(`ปีการศึกษา ${year} ${bucket.label}`);
      const matching = datedProjects.filter(({ project, date }) =>
        project.academicYear === year && date !== null &&
        date.academicYearBE === year && bucket.months.includes(date.month));
      newCounts.push(matching.length);
      groups.forEach(group => {
        runningCounts[group] += matching.filter(({ project }) => project.ku === group).length;
        countsByGroup[group].push(runningCounts[group]);
      });
    });
  });

  return { labels, newCounts, countsByGroup };
}
