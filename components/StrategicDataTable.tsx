'use client';
// components/StrategicDataTable.tsx — Strategic Alignment data table with row click handler
import { Project } from '@/lib/mockData';
import { ploShortDesc, ploDetail } from '@/lib/ploLabels';
import styles from './DataTable.module.css';
import { usePagination } from './Pagination';

interface Props {
  projects?: Project[];
  onRowClick?: (project: Project) => void;
}

const RANK_CLASS = [styles.gold, styles.silver, styles.bronze];

export default function StrategicDataTable({ projects = [], onRowClick }: Props) {
  const { visible, start, pagination } = usePagination(projects);
  return (
    <><div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>#</th>
            <th>ชื่อโครงการ</th>
            <th>อัตลักษณ์ KU</th>
            <th>เป้าหมาย SDGs</th>
            <th>กรอบ TQF</th>
            <th>PLO สนับสนุน</th>
            <th>กลยุทธ์ย่อย</th>
          </tr>
        </thead>
        <tbody>
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
                <td className={styles.nameCell} style={{ maxWidth: '280px' }} title={p.name}>
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
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {p.kuList.map((ku) => {
                      const color = ku === 'I' ? '#059669' : ku === 'D' ? '#D97706' : ku === 'K' ? '#2563EB' : '#7C3AED';
                      const bg = ku === 'I' ? '#ECFDF5' : ku === 'D' ? '#FFFBEB' : ku === 'K' ? '#EFF6FF' : '#F5F3FF';
                      return (
                        <span
                          key={ku}
                          style={{
                            padding: '1px 6px',
                            background: bg,
                            color,
                            border: `1px solid ${color}33`,
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          {ku}
                        </span>
                      );
                    })}
                  </div>
                </td>
                <td>
                  {p.sdgList.length > 0 ? (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {p.sdgList.map((s) => (
                        <span
                          key={s}
                          style={{
                            padding: '1px 6px',
                            background: '#FEF3C7',
                            color: '#D97706',
                            border: '1px solid #FCD34D',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          SDG {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: '#94A3B8', fontSize: '11px' }}>-</span>
                  )}
                </td>
                <td>
                  {p.tqf.length > 0 ? (
                    <span style={{ fontSize: '12px', color: '#334155' }}>
                      ด้าน {p.tqf.join(', ')}
                    </span>
                  ) : (
                    <span style={{ color: '#94A3B8', fontSize: '11px' }}>-</span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {p.plo.length > 0 ? (
                      p.plo.map((n) => (
                        <span
                          key={n}
                          title={`PLO ${n} (${ploShortDesc(n)}): ${ploDetail(n)}`}
                          style={{
                            padding: '1px 6px',
                            background: '#F3E8FF',
                            color: '#7E22CE',
                            border: '1px solid #E9D5FF',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'help',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          PLO {n}
                        </span>
                      ))
                    ) : (
                      <span style={{ color: '#94A3B8', fontSize: '11px' }}>-</span>
                    )}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {p.strategySubs.map((n) => (
                      <span
                        key={n}
                        style={{
                          padding: '1px 6px',
                          background: '#ECFDF5',
                          color: '#047857',
                          border: '1px solid #A7F3D0',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        กลยุทธ์ {n}
                      </span>
                    ))}
                    {p.strategySubs.length === 0 && (
                      <span style={{ color: '#94A3B8', fontSize: '11px' }}>ทั่วไป</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>{pagination}</>
  );
}
