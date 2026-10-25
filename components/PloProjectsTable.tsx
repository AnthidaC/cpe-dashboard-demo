'use client';
// components/PloProjectsTable.tsx — Projects table for PLO ChartCard with PLO filter tabs and multi-PLO support
import { useState, useMemo } from 'react';
import { Project, PLONumber } from '@/lib/mockData';
import { getPloDefinition, ploShortDesc, ploDetail, defaultPloDefinitions, type PLODefinition } from '@/lib/ploLabels';
import styles from './DataTable.module.css';

interface Props {
  projects: Project[];
  ploDefinitions?: Record<number, PLODefinition>;
  onRowClick?: (project: Project) => void;
}

export default function PloProjectsTable({ projects, ploDefinitions, onRowClick }: Props) {
  const [selectedFilter, setSelectedFilter] = useState<'all' | PLONumber>('all');

  const defs = ploDefinitions ?? defaultPloDefinitions;

  // Projects that have at least one PLO
  const ploProjects = useMemo(() => {
    return projects.filter(p => p.plo && p.plo.length > 0);
  }, [projects]);

  // Filtered by selected tab
  const filteredProjects = useMemo(() => {
    if (selectedFilter === 'all') return ploProjects;
    return ploProjects.filter(p => p.plo.includes(selectedFilter));
  }, [ploProjects, selectedFilter]);

  // Counts per PLO
  const counts = useMemo(() => {
    const c: Record<PLONumber, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    ploProjects.forEach(p => {
      p.plo.forEach(n => {
        if (n in c) c[n as PLONumber]++;
      });
    });
    return c;
  }, [ploProjects]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '6px', padding: '8px 12px', borderBottom: '1px solid #E2E8F0', flexWrap: 'wrap', alignItems: 'center', background: '#F8FAFC' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginRight: '4px' }}>กรองตาม PLO:</span>
        <button
          type="button"
          onClick={() => setSelectedFilter('all')}
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            border: '1px solid',
            cursor: 'pointer',
            background: selectedFilter === 'all' ? '#7E22CE' : '#FFFFFF',
            color: selectedFilter === 'all' ? '#FFFFFF' : '#475569',
            borderColor: selectedFilter === 'all' ? '#7E22CE' : '#CBD5E1',
            transition: 'all 0.15s ease',
          }}
        >
          ทั้งหมด ({ploProjects.length})
        </button>
        {([1, 2, 3, 4] as PLONumber[]).map(num => {
          const def = getPloDefinition(num, defs);
          const isSel = selectedFilter === num;
          return (
            <button
              key={num}
              type="button"
              onClick={() => setSelectedFilter(num)}
              title={def.detail}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                border: '1px solid',
                cursor: 'pointer',
                background: isSel ? '#7E22CE' : '#FFFFFF',
                color: isSel ? '#FFFFFF' : '#475569',
                borderColor: isSel ? '#7E22CE' : '#CBD5E1',
                transition: 'all 0.15s ease',
              }}
            >
              {def.title} ({counts[num]})
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ overflowY: 'auto', flex: 1, maxHeight: '350px' }}>
        <table className={styles.table} style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
          <thead>
            <tr style={{ position: 'sticky', top: 0, background: '#F1F5F9', zIndex: 1 }}>
              <th style={{ width: '40px', textAlign: 'center' }}>#</th>
              <th>โครงการ {onRowClick ? '(คลิกเพื่อดูรายละเอียด)' : ''}</th>
              <th>PLO ที่สนับสนุน</th>
              <th style={{ textAlign: 'right' }}>งบจริง (บาท)</th>
              <th style={{ textAlign: 'right' }}>ผู้เข้าร่วม</th>
              <th style={{ textAlign: 'center' }}>ความพึงพอใจ</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.length > 0 ? (
              filteredProjects.map((p, idx) => (
                <tr
                  key={p.id}
                  onClick={() => onRowClick && onRowClick(p)}
                  style={{ cursor: onRowClick ? 'pointer' : 'default', borderBottom: '1px solid #F1F5F9' }}
                  title={onRowClick ? 'คลิกเพื่อดูรายละเอียดโครงการ' : undefined}
                >
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748B' }}>{idx + 1}</td>
                  <td className={styles.nameCell} style={{ maxWidth: '240px', fontWeight: 600 }}>
                    {p.name}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {p.plo.map(n => (
                        <span
                          key={n}
                          title={`PLO ${n} (${ploShortDesc(n, defs)}): ${ploDetail(n, defs)}`}
                          style={{
                            padding: '2px 7px',
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
                      ))}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {p.actual > 0 ? `฿${p.actual.toLocaleString()}` : '-'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {p.participants > 0 ? `${p.participants.toLocaleString()} คน` : '-'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {p.satisfaction > 0 ? (
                      <span style={{ fontWeight: 700, color: '#059669' }}>{p.satisfaction.toFixed(2)} ★</span>
                    ) : (
                      <span style={{ color: '#94A3B8' }}>-</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#64748B' }}>
                  ไม่พบโครงการที่สนับสนุน PLO ในเงื่อนไขที่เลือก
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
