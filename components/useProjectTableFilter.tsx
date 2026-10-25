'use client';

import { useState } from 'react';
import type { Project } from '@/lib/mockData';
import { missingProjectMetrics, type ProjectMetric } from '@/lib/projectAvailability';
import { ChartControlGroup } from './ChartControlGroup';

export function useProjectTableFilter(projects: Project[], metrics: ProjectMetric[], enabled: boolean) {
  const [scope, setScope] = useState<'all' | 'missing'>('all');
  const incomplete = projects.filter(project => missingProjectMetrics(project, metrics).length > 0);
  const data = enabled && scope === 'missing' ? incomplete : projects;
  const controls = enabled ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 12, fontSize: 13, lineHeight: 1.65 }}>
    <ChartControlGroup label="ข้อมูลโครงการ:" options={[
      { value: 'all', label: 'ทั้งหมด' },
      { value: 'missing', label: 'ข้อมูลไม่ครบ', badge: String(incomplete.length) },
    ]} value={scope} onChange={setScope} />
    <span style={{ color: 'var(--text-muted, #565656)' }}>— หมายถึงไม่มีข้อมูลหรือคำนวณไม่ได้</span>
  </div> : null;
  return { data, controls };
}
