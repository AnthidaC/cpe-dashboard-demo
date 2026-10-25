'use client';
// components/PlanHoursDataTable.tsx — Group 5 Plans & Hours data table with row click handler
import { Project } from '@/lib/mockData';
import styles from './DataTable.module.css';
import { hasProjectMetric, missingProjectMetrics, metricNames } from '@/lib/projectAvailability';
import { useProjectTableFilter } from './useProjectTableFilter';
import { usePagination } from './Pagination';

interface Props {
  projects?: Project[];
  onRowClick?: (project: Project) => void;
}

const RANK_CLASS = [styles.gold, styles.silver, styles.bronze];

const PLAN_SHORT_NAMES = [
  'แผน 1: อัตลักษณ์นิสิต',
  'แผน 2: ทักษะการทำงาน',
  'แผน 3: ยกระดับการเรียนรู้',
  'แผน 4: ความผูกพันภูมิใจ',
  'แผน 5: ร่วมมือนิสิตเก่า'
];

export default function PlanHoursDataTable({ projects = [], onRowClick }: Props) {
  const metrics = ['hours', 'participants', 'satisfaction'] as const;
  const { data, controls } = useProjectTableFilter(projects, [...metrics], true);
  const { visible, start, pagination } = usePagination(data);
  return (
    <>{controls}<div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>#</th>
            <th>โครงการ {onRowClick ? '(คลิกเพื่อดูรายละเอียด)' : ''}</th>
            <th>ผู้รับผิดชอบหลัก</th>
            <th>แผนพัฒนานิสิต 1–5 ที่สอดรับ</th>
            <th>ชั่วโมงจัดงาน</th>
            <th>ผู้เข้าร่วมจริง</th>
            <th>ความพึงพอใจเฉลี่ย</th>
            <th>ข้อมูลที่ขาด</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24 }}>ไม่พบโครงการตามตัวกรองที่เลือก</td></tr>}
          {visible.map((p, i) => {
            const rankCls = RANK_CLASS[start + i] ?? styles.normal;
            return (
              <tr
                key={p.id}
                onClick={() => onRowClick && onRowClick(p)}
                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                title={onRowClick ? 'คลิกเพื่อเปิดดูรายละเอียดเจาะลึกโครงการ' : undefined}
              >
                <td><span className={`${styles.rank} ${rankCls}`}>{start + i + 1}</span></td>
                <td className={styles.nameCell} style={{ maxWidth: '250px' }} title={p.name}>
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
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    {p.lecturer || 'ไม่ระบุ/โครงการส่วนกลาง'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {p.studentPlans.map((planNum) => (
                      <span
                        key={planNum}
                        title={PLAN_SHORT_NAMES[planNum - 1]}
                        style={{
                          padding: '1px 6px',
                          background: '#EFF6FF',
                          color: '#1E40AF',
                          border: '1px solid #BFDBFE',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        แผน {planNum}
                      </span>
                    ))}
                    {p.studentPlans.length === 0 && (
                      <span style={{ color: '#94A3B8', fontSize: '11px' }}>-</span>
                    )}
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    {hasProjectMetric(p, 'hours') ? `${p.hours} ชม.` : '—'}
                  </span>
                </td>
                <td>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    {hasProjectMetric(p, 'participants') ? `${p.participants.toLocaleString()} คน` : '—'}
                  </span>
                </td>
                <td>
                  {hasProjectMetric(p, 'satisfaction') ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#D97706' }}>
                        {p.satisfaction.toFixed(2)}
                      </span>
                      <span style={{ color: '#F59E0B', fontSize: '11px' }}>★</span>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted, #565656)', fontSize: '12px' }}>—</span>
                  )}
                </td>
                <td>{missingProjectMetrics(p, [...metrics]).map(metric => metricNames[metric]).join(', ') || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>{pagination}</>
  );
}
