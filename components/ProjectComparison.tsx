'use client';

import type { Project } from '@/lib/mockData';
import styles from './ProjectComparison.module.css';

export default function ProjectComparison({ projects, onProjectClick }: {
  projects: Project[]; onProjectClick: (index: number) => void;
}) {
  const maxCost = Math.max(1, ...projects.map(project => project.actual / project.participants));
  return <div className={styles.comparison}>
    <div className={styles.heading} aria-hidden="true"><span>ความพึงพอใจ (เต็ม 5)</span><span>โครงการ</span><span>ต้นทุน (บาท/คน)</span></div>
    {projects.map((project, index) => {
      const cost = project.actual / project.participants;
      return <div key={project.id} className={styles.row}>
        <button type="button" className={styles.name} onClick={() => onProjectClick(index)} title={project.name}>{project.name}</button>
        <div className={styles.score}>
          <span className={styles.mobileLabel}>ความพึงพอใจ</span>
          <div className={styles.barLine}><strong>{project.satisfaction.toFixed(2)} / 5</strong><span className={styles.track}><span style={{ width: `${project.satisfaction / 5 * 100}%` }} /></span></div>
        </div>
        <div className={styles.cost}>
          <span className={styles.mobileLabel}>ต้นทุนต่อคน</span>
          <div className={styles.barLine}><span className={styles.track}><span style={{ width: `${cost / maxCost * 100}%` }} /></span><strong>฿{Math.round(cost).toLocaleString()}</strong></div>
        </div>
      </div>;
    })}
  </div>;
}
