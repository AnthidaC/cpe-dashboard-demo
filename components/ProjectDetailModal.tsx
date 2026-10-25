'use client';
// components/ProjectDetailModal.tsx — Interactive Project Detail Breakdown Modal

import { ratioLabel } from '@/lib/reportUtils';
import { ploShortDesc, ploDetail } from '@/lib/ploLabels';
import { Project, typeColorMap } from '@/lib/mockData';
import styles from './ProjectDetailModal.module.css';

interface ProjectDetailModalProps {
  project: Project | null;
  onClose: () => void;
}

interface ThaiDateInfo {
  text: string;
  isSingleDay: boolean;
  durationDays: number;
  label: string;
  displayHeader: string;
  displayFull: string;
}

function getThaiDateInfo(startDate?: string, endDate?: string): ThaiDateInfo {
  if (!startDate) {
    return {
      text: 'ไม่ระบุวันที่',
      isSingleDay: true,
      durationDays: 1,
      label: 'วันที่จัดกิจกรรม',
      displayHeader: 'ไม่ระบุวันที่',
      displayFull: 'ไม่ระบุวันที่',
    };
  }

  const thaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];

  const parseDate = (dStr: string) => {
    if (!dStr) return null;
    const clean = dStr.trim();
    const parts = clean.split('-');
    if (parts.length < 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
    const bYear = year < 2400 ? year + 543 : year;
    const jsDate = new Date(year, month - 1, day);
    return { day, month, year: bYear, monthName: thaiMonths[month - 1] || '', jsDate };
  };

  const start = parseDate(startDate);
  if (!start) {
    return {
      text: startDate,
      isSingleDay: true,
      durationDays: 1,
      label: 'วันที่จัดกิจกรรม',
      displayHeader: startDate,
      displayFull: startDate,
    };
  }

  const end = parseDate(endDate || '');

  // Case 1: Single day event (no end date, or start === end)
  if (!end || startDate.trim() === endDate?.trim() || start.jsDate.getTime() === end.jsDate.getTime()) {
    const singleText = `${start.day} ${start.monthName} ${start.year}`;
    return {
      text: singleText,
      isSingleDay: true,
      durationDays: 1,
      label: 'วันที่จัดกิจกรรม',
      displayHeader: singleText,
      displayFull: singleText,
    };
  }

  // Calculate day difference
  const diffTime = Math.abs(end.jsDate.getTime() - start.jsDate.getTime());
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

  if (diffDays <= 1) {
    const singleText = `${start.day} ${start.monthName} ${start.year}`;
    return {
      text: singleText,
      isSingleDay: true,
      durationDays: 1,
      label: 'วันที่จัดกิจกรรม',
      displayHeader: singleText,
      displayFull: singleText,
    };
  }

  // Case 2: Multi-day event
  let rangeText = '';
  if (start.year === end.year) {
    if (start.month === end.month) {
      rangeText = `${start.day} – ${end.day} ${end.monthName} ${end.year}`;
    } else {
      rangeText = `${start.day} ${start.monthName} – ${end.day} ${end.monthName} ${end.year}`;
    }
  } else {
    rangeText = `${start.day} ${start.monthName} ${start.year} – ${end.day} ${end.monthName} ${end.year}`;
  }

  return {
    text: rangeText,
    isSingleDay: false,
    durationDays: diffDays,
    label: 'ช่วงเวลาจัดกิจกรรม',
    displayHeader: rangeText,
    displayFull: rangeText,
  };
}

export default function ProjectDetailModal({ project, onClose }: ProjectDetailModalProps) {
  if (!project) return null;

  const costPerHead = ratioLabel(project.actual, project.participants);
  const attRate = ratioLabel(project.participants, project.target, true);
  const utilRate = ratioLabel(project.actual, project.budget, true);
  const savings = project.budget - project.actual;
  const dateInfo = getThaiDateInfo(project.startDate, project.endDate);
  const evaluationRounds = [...(project.evaluationRows ?? [])]
    .filter((row) => row.avg_satisfaction_score !== null && Number.isFinite(row.avg_satisfaction_score)
      && row.avg_satisfaction_score > 0 && row.avg_satisfaction_score <= 5 && row.respondent_count !== 0)
    .sort((a, b) => (a.date_key ?? Number.MAX_SAFE_INTEGER) - (b.date_key ?? Number.MAX_SAFE_INTEGER)
      || a.fact_kpi_id - b.fact_kpi_id);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h3>{project.name}</h3>
            <div className={styles.headerMeta}>
              <span
                className={styles.categoryBadge}
                style={{
                  color: typeColorMap[project.type],
                  borderColor: typeColorMap[project.type],
                }}
              >
                {project.type}
              </span>
              <span>รหัสโครงการ #{project.id}</span>
              <span>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#1E293B', fontWeight: 600 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {dateInfo.displayHeader}
              </span>
              <span>•</span>
              <span>ชั่วโมงกิจกรรม {project.hours} ชม.</span>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="ปิดหน้าต่าง">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Executive KPI Summary */}
          <div className={styles.kpiGrid}>
            <div className={styles.kpiBox}>
              <div className={styles.kpiLabel}>ความพึงพอใจ</div>
              <div className={styles.kpiVal} style={{ color: project.satisfaction > 0 ? '#7C3AED' : '#94A3B8' }}>
                {project.satisfaction > 0 ? project.satisfaction.toFixed(2) : '-'}
              </div>
              <div className={styles.kpiSub}>
                {project.satisfaction > 0 ? 'จาก 5.00 คะแนน' : 'ไม่มีผลประเมิน'}
              </div>
            </div>

            <div className={styles.kpiBox}>
              <div className={styles.kpiLabel}>อัตราการเข้าร่วม</div>
              <div className={styles.kpiVal} style={{ color: project.target > 0 && project.participants >= project.target ? 'var(--ku-green)' : '#1E61F0' }}>
                {attRate}
              </div>
              <div className={styles.kpiSub}>{project.participants} / {project.target} คน</div>
            </div>

            <div className={styles.kpiBox}>
              <div className={styles.kpiLabel}>เบิกจ่ายจริง</div>
              <div className={styles.kpiVal} style={{ color: '#D97706' }}>
                {utilRate}
              </div>
              <div className={styles.kpiSub}>฿{(project.actual / 1000).toFixed(0)}K / ฿{(project.budget / 1000).toFixed(0)}K</div>
            </div>

            <div className={styles.kpiBox}>
              <div className={styles.kpiLabel}>ต้นทุนต่อหัว</div>
              <div className={styles.kpiVal} style={{ color: 'var(--ku-green)' }}>
                {project.participants > 0 ? `฿${costPerHead}` : costPerHead}
              </div>
              <div className={styles.kpiSub}>บาท / คน</div>
            </div>
          </div>

          {evaluationRounds.length > 1 && (
            <details key={project.id} className={styles.evaluationRounds}>
              <summary className={styles.roundsToggle}>
                <span>ดูรอบประเมิน ({evaluationRounds.length} รอบ)</span>
                <svg className={styles.roundsChevron} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <div className={styles.roundsTableWrap}>
                <table className={styles.roundsTable}>
                  <caption className={styles.roundsCaption}>รายละเอียดผลประเมินแต่ละรอบ</caption>
                  <thead>
                    <tr>
                      <th scope="col">รอบประเมิน</th>
                      <th scope="col">คะแนนเฉลี่ย</th>
                      <th scope="col">จำนวนผู้ตอบ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluationRounds.map((row, index) => (
                      <tr key={row.fact_kpi_id}>
                        <th scope="row">รอบที่ {index + 1}</th>
                        <td>{row.avg_satisfaction_score!.toFixed(2)} / 5</td>
                        <td>{row.respondent_count === null ? 'ไม่มีข้อมูล' : `${row.respondent_count.toLocaleString('th-TH')} คน`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}

          {/* Timeline & Project Profile breakdown */}
          <div>
            <div className={styles.sectionTitle}>ข้อมูลการจัดกิจกรรมและช่วงเวลา</div>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>{dateInfo.label}:</span>
                <span className={styles.infoValue} style={{ fontWeight: 600, color: '#1E40AF' }}>
                  📅 {dateInfo.displayFull}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>ปีการศึกษา / ภาคเรียน:</span>
                <span className={styles.infoValue}>
                  {project.academicYear ? `ปีการศึกษา ${project.academicYear}` : 'ปีการศึกษา 2568'}
                  {project.semester === 't1' ? ' (ภาคเรียนที่ 1)' : project.semester === 't2' ? ' (ภาคเรียนที่ 2)' : project.semester === 'summer' ? ' (ภาคฤดูร้อน)' : ''}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>ผู้รับผิดชอบโครงการ:</span>
                <span className={styles.infoValue}>{project.lecturer || 'ไม่ระบุ'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>ระยะเวลาสะสม:</span>
                <span className={styles.infoValue}>{project.hours} ชั่วโมง</span>
              </div>
            </div>
          </div>

          {/* Detailed Financial & Attendance breakdown */}
          <div>
            <div className={styles.sectionTitle}>รายละเอียดด้านงบประมาณและผู้เข้าร่วม</div>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>งบอนุมัติ:</span>
                <span className={styles.infoValue}>฿{project.budget.toLocaleString()} บาท</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>ใช้จ่ายจริง:</span>
                <span className={styles.infoValue}>฿{project.actual.toLocaleString()} บาท</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>งบเหลือจ่าย:</span>
                <span className={styles.infoValue} style={{ color: savings >= 0 ? 'var(--ku-green)' : '#E11D48' }}>
                  ฿{savings.toLocaleString()} บาท
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>อัตราผู้ตอบแบบประเมิน:</span>
                <span className={styles.infoValue}>{project.evalRateAvailable === false ? 'ไม่มีข้อมูลสำหรับคำนวณ' : `${project.evalRate.toFixed(1)}%`}</span>
              </div>
            </div>
          </div>

          {/* Strategic Alignment */}
          <div>
            <div className={styles.sectionTitle}>ความสอดคล้องเชิงยุทธศาสตร์และนโยบาย</div>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>อัตลักษณ์ KU:</span>
                <span className={styles.infoValue}>
                  {project.kuList.join(', ') || 'ไม่มีข้อมูลอัตลักษณ์'}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>ตอบโจทย์ SDGs:</span>
                <span className={styles.infoValue} style={{ color: project.sdg ? 'var(--ku-green)' : '#475569' }}>
                  {project.sdg ? '✓ ตอบโจทย์ SDGs' : '✗ ไม่ตอบโจทย์'}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>ยุทธศาสตร์ 1 กลยุทธ์ 3 (สร้างบรรยากาศฯ):</span>
                <span className={styles.infoValue} style={{ color: project.strategy3 ? 'var(--ku-green)' : '#475569' }}>
                  {project.strategy3 ? '✓ สอดคล้อง ยส.1 กลยุทธ์ 3' : 'ทั่วไป'}
                </span>
              </div>
              <div className={styles.infoItem} style={{ gridColumn: '1 / -1' }}>
                <span className={styles.infoLabel}>PLO ที่สนับสนุน:</span>
                <div className={styles.tagGroup}>
                  {project.plo.length > 0 ? (
                    project.plo.map((p) => (
                      <span
                        key={p}
                        className={styles.tagPill}
                        title={`PLO ${p}: ${ploDetail(p)}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <strong>PLO {p}:</strong> {ploShortDesc(p)}
                      </span>
                    ))
                  ) : (
                    <span className={styles.infoValue}>-</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
