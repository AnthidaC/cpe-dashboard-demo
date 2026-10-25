'use client';
// components/DataTable.tsx — Ranked project table for G1 with row click handler

import { Project, typeColorMap, avgCostPerParticipant as defaultAvgCpp } from '@/lib/mockData';
import styles from './DataTable.module.css';
import { canPlotProject, hasProjectMetric, missingProjectMetrics, metricNames, type ProjectMetric } from '@/lib/projectAvailability';
import { useProjectTableFilter } from './useProjectTableFilter';
import { usePagination } from './Pagination';
import { percentageBandColor } from '@/lib/chartHelpers';

const TAG_CLASS: Record<string, string> = {
  วิชาการ:        styles.tagAcademic,
  นันทนาการ:      styles.tagActivity,
  บริการ:         styles.tagService,
  บำเพ็ญประโยชน์: styles.tagService2,
  พัฒนาศักยภาพ:   styles.tagDevelopment,
};

const RANK_CLASS = [styles.gold, styles.silver, styles.bronze];

interface Props {
  rows?: Project[];
  projects?: Project[];
  avgCpp?: number;
  onRowClick?: (project: Project) => void;
  enableMissingFilter?: boolean;
  filterMetrics?: ProjectMetric[];
  rateType?: 'util' | 'attendance' | 'eval' | 'satisfaction';
}

export default function DataTable({
  rows,
  projects,
  avgCpp = defaultAvgCpp,
  onRowClick,
  enableMissingFilter = false,
  filterMetrics = ['budget', 'actual', 'participants'],
  rateType = 'util',
}: Props) {
  const { data, controls } = useProjectTableFilter(rows ?? projects ?? [], filterMetrics, enableMissingFilter);
  const { visible, start, pagination } = usePagination(data);

  return (
    <>{controls}<div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>#</th>
            <th>โครงการ {onRowClick ? '(คลิกเพื่อดูรายละเอียด)' : ''}</th>
            <th>ประเภท</th>
            <th>งบจริง (บาท)</th>
            <th>{rateType === 'attendance' ? 'ผู้เข้าร่วม / เป้าหมาย' : 'ผู้เข้าร่วม'}</th>
            <th>Cost / คน</th>
            <th>
              {rateType === 'attendance'
                ? 'อัตราเข้าร่วม'
                : rateType === 'eval'
                ? 'อัตราตอบประเมิน'
                : rateType === 'satisfaction'
                ? 'ความพึงพอใจ (%)'
                : 'Util. Rate'}
            </th>
            {enableMissingFilter && <th>ข้อมูลที่ขาด</th>}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && <tr><td colSpan={enableMissingFilter ? 8 : 7} style={{ textAlign: 'center', padding: 24 }}>ไม่พบโครงการตามตัวกรองที่เลือก</td></tr>}
          {visible.map((p, i) => {
            const cpp = canPlotProject(p, ['actual', 'participants'], ['participants']) ? Math.round(p.actual / p.participants) : null;
            const util = canPlotProject(p, ['actual', 'budget'], ['budget']) ? Math.round((p.actual / p.budget) * 100) : null;
            const rankCls = RANK_CLASS[start + i] ?? styles.normal;

            const displayRate =
              rateType === 'attendance'
                ? (p.target > 0 ? +((p.participants / p.target) * 100).toFixed(1) : null)
                : rateType === 'eval'
                ? (p.evalRateAvailable !== false && p.evalRate !== undefined && p.evalRate !== null ? +p.evalRate.toFixed(1) : null)
                : rateType === 'satisfaction'
                ? (p.satisfaction > 0 ? +(p.satisfaction * 20).toFixed(1) : null)
                : util;

            const bandColor = displayRate !== null ? percentageBandColor(displayRate) : '#CBD5E1';

            return (
              <tr
                key={p.id}
                onClick={() => onRowClick && onRowClick(p)}
                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                title={onRowClick ? 'คลิกเพื่อเปิดดูรายละเอียดเจาะลึกโครงการ' : undefined}
              >
                <td><span className={`${styles.rank} ${rankCls}`}>{start + i + 1}</span></td>
                <td className={styles.nameCell} title={p.name}>
                  {p.name} {onRowClick ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '4px', verticalAlign: 'middle', color: '#059669', opacity: 0.7 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                    </span>
                  ) : null}
                </td>
                <td>
                  <span
                    className={`${styles.tag} ${TAG_CLASS[p.type] ?? ''}`}
                    style={{ color: typeColorMap[p.type] }}
                  >
                    {p.type}
                  </span>
                </td>
                <td>{hasProjectMetric(p, 'actual') ? `฿${p.actual.toLocaleString()}` : '—'}</td>
                <td>
                  {hasProjectMetric(p, 'participants')
                    ? (rateType === 'attendance' && p.target > 0
                        ? `${p.participants.toLocaleString()} / ${p.target.toLocaleString()}`
                        : p.participants.toLocaleString())
                    : '—'}
                </td>
                <td className={cpp !== null && cpp < avgCpp ? styles.good : undefined}>
                  {cpp === null ? '—' : `฿${cpp.toLocaleString()}`}
                </td>
                <td>
                  <div className={styles.progressWrap}>
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{
                          width: `${Math.min(displayRate ?? 0, 100)}%`,
                          backgroundColor: bandColor,
                        }}
                      />
                    </div>
                    <span
                      className={styles.progressText}
                      style={{ color: displayRate !== null ? bandColor : '#64748B', fontWeight: 700 }}
                    >
                      {displayRate === null ? '—' : `${displayRate}%`}
                    </span>
                  </div>
                </td>
                {enableMissingFilter && <td>{missingProjectMetrics(p, filterMetrics).map(metric => metricNames[metric]).join(', ') || '—'}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>{pagination}</>
  );
}
