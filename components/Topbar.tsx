'use client';
// components/Topbar.tsx — Formal Executive Topbar Component with Executive Excel Export

import { useState, useEffect, useRef } from 'react';
import type { Project } from '@/lib/mockData';
import { academicYears } from '@/lib/reportUtils';
import styles from './Topbar.module.css';
import { useFilters } from '@/lib/FilterContext';
import { getProjects } from '@/lib/db/dataService';
import { exportDashboardToExcel } from '@/lib/exportExcel';

interface TopbarProps {
  exportProjects?: Project[];
  title: string;
  subtitle: string;
  badge?: string;
  academicYear?: string;
  onYearChange?: (year: string) => void;
  semester?: string;
  onSemesterChange?: (semester: string) => void;
}

export default function Topbar({
  exportProjects,
  title,
  subtitle,
  badge,
  academicYear: propAcademicYear,
  onYearChange: propOnYearChange,
  semester: propSemester,
  onSemesterChange: propOnSemesterChange,
}: TopbarProps) {
  const context = useFilters();

  // Prefer context state but fallback to props for backward compatibility
  const academicYear = propAcademicYear ?? context.academicYear;
  const semester = propSemester ?? context.semester;
  const onYearChange = propOnYearChange ?? context.setAcademicYear;
  const onSemesterChange = propOnSemesterChange ?? context.setSemester;

  const [years, setYears] = useState<number[]>([]);
  const [exportError, setExportError] = useState('');
  useEffect(() => {
    getProjects()
      .then(({ projects }) => {
        const activeYears = academicYears(projects);
        setYears(activeYears);
        if (academicYear !== 'all' && !activeYears.map(String).includes(academicYear)) {
          onYearChange?.('all');
        }
      })
      .catch(() => setExportError('โหลดรายการปีไม่สำเร็จ กรุณาลองใหม่'));
  }, [academicYear, onYearChange]);

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [exportYearChoice, setExportYearChoice] = useState<string>('current');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleExport = async (type: 'full' | 'projects-only' | 'participants-only' = 'full') => {
    if (isExporting) return;
    try {
      setIsExporting(true);
      setExportError('');
      setMenuOpen(false);
      const targetYear = exportYearChoice === 'current' ? academicYear : exportYearChoice;
      const { projects: allDwProjects } = await getProjects();
      const targetProjects = exportYearChoice !== 'current' ? allDwProjects : (exportProjects ?? allDwProjects);
      await exportDashboardToExcel(targetProjects, {
        academicYear: targetYear,
        semester: targetYear === 'all' ? 'all' : semester,
        exportType: type,
      });
      setIsExporting(false);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2600);
    } catch (err) {
      console.error('[Topbar] Export to Excel failed:', err);
      setExportError('ส่งออกไม่สำเร็จ กรุณากดส่งออกอีกครั้ง');
      setIsExporting(false);
    }
  };

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <div className={styles.accentBar} />
        <div className={styles.titleWrapper}>
          <div className={styles.titleRow}>
            <h2 title={title}>{title}</h2>
            {badge && !badge.includes('Connection') && !badge.includes('Simulation') && badge !== 'Loading' && (
              <span className={styles.badge}>{badge}</span>
            )}
          </div>
          <p className={styles.subtitle} title={subtitle}>{subtitle}</p>
        </div>
      </div>

      <div className={styles.right}>
        {exportError && <span role="alert">{exportError}</span>}
        {exportProjects && <span style={{ fontSize: 12 }}>ส่งออกตามตัวกรองในหน้านี้ ({exportProjects.length} โครงการ)</span>}
        <div className={styles.filterGroup}>
          <div className={styles.selectWrapper}>
            <select
              value={academicYear}
              onChange={(e) => onYearChange?.(e.target.value)}
              className={styles.pillSelect}
              title="เลือกปีการศึกษา"
            >
              <option value="all">ทุกปีการศึกษา</option>
              {years.map(String).map(year => <option key={year} value={year}>ปีการศึกษา {year}</option>)}
            </select>
          </div>

          <div className={styles.selectWrapper}>
            <select
              value={semester}
              onChange={(e) => onSemesterChange?.(e.target.value)}
              className={styles.pillSelect}
              title="เลือกช่วงเวลา/ภาคเรียน"
            >
              <option value="all">ทั้งปีการศึกษา</option>
              <option value="t1">ภาคเรียนที่ 1 (ต้นปี)</option>
              <option value="t2">ภาคเรียนที่ 2 (ปลายปี)</option>
              <option value="summer">ภาคฤดูร้อน</option>
            </select>
          </div>
        </div>

        {/* Executive Excel Export Dropdown & Action */}
        <div className={styles.exportWrapper} ref={dropdownRef}>
          <div className={styles.exportButtonGroup}>
            <button
              type="button"
              className={styles.exportMainBtn}
              onClick={() => handleExport('full')}
              disabled={isExporting}
              title="คลิกเพื่อส่งออกรายงานสรุปผู้บริหาร Excel ฉบับสมบูรณ์ (.xlsx)"
            >
              {isExporting ? (
                <span className={styles.spinner} />
              ) : exportSuccess ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="8" y1="13" x2="16" y2="13" />
                  <line x1="8" y1="17" x2="16" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              )}
              <span>{isExporting ? 'กำลังส่งออก...' : exportSuccess ? 'ส่งออกสำเร็จ!' : 'Export Excel'}</span>
              <span className={styles.formatBadge}>.XLSX</span>
            </button>

            <button
              type="button"
              className={`${styles.exportToggleBtn} ${menuOpen ? styles.toggleActive : ''}`}
              onClick={() => setMenuOpen(!menuOpen)}
              disabled={isExporting}
              title="เลือกรูปแบบรายงาน Excel เพิ่มเติม"
              aria-label="ตัวเลือกการส่งออก Excel"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>

          {menuOpen && (
            <div className={styles.dropdownMenu}>
              <div className={styles.dropdownHeader}>
                รูปแบบการส่งออกไฟล์ EXCEL (.XLSX)
              </div>
              <div style={{ padding: '8px 14px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                  เลือกปีการศึกษาสำหรับ Export:
                </label>
                <select
                  value={exportYearChoice}
                  onChange={(e) => setExportYearChoice(e.target.value)}
                  style={{ fontSize: '12px', padding: '5px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#1E293B', cursor: 'pointer' }}
                >
                  <option value="current">ตามตัวกรองปัจจุบัน ({academicYear === 'all' ? 'ทุกปีการศึกษา' : 'ปี ' + academicYear})</option>
                  <option value="all">ทุกปีการศึกษา (ข้อมูลทั้งหมด)</option>
                  {years.map(y => (
                    <option key={y} value={String(y)}>เฉพาะปีการศึกษา {y}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className={styles.dropdownItem}
                onClick={() => handleExport('full')}
              >
                <div className={styles.itemIcon}>📊</div>
                <div className={styles.itemContent}>
                  <div className={styles.itemTitle}>รายงานฉบับสมบูรณ์ (Executive Report)</div>
                  <div className={styles.itemDesc}>สรุป KPI, ทะเบียนโครงการ, ยุทธศาสตร์ SDGs/PLO, สถิตินิสิต (5 แผ่นงาน)</div>
                </div>
                <span className={styles.recommendTag}>แนะนำ</span>
              </button>

              <button
                type="button"
                className={styles.dropdownItem}
                onClick={() => handleExport('projects-only')}
              >
                <div className={styles.itemIcon}>📋</div>
                <div className={styles.itemContent}>
                  <div className={styles.itemTitle}>เฉพาะทะเบียนโครงการ (Projects Registry)</div>
                  <div className={styles.itemDesc}>ตารางข้อมูลโครงการพร้อมสูตรคำนวณ สำหรับวิเคราะห์ Pivot Table</div>
                </div>
              </button>

              <button
                type="button"
                className={styles.dropdownItem}
                onClick={() => handleExport('participants-only')}
              >
                <div className={styles.itemIcon}>👥</div>
                <div className={styles.itemContent}>
                  <div className={styles.itemTitle}>สถิติการเข้าร่วมนิสิต (Participants Roster)</div>
                  <div className={styles.itemDesc}>สรุปการมีส่วนร่วมตามรหัสรุ่นปีและทะเบียนนิสิตรายบุคคล</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
