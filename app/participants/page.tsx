'use client';
// app/participants/page.tsx — วิเคราะห์การเข้าร่วมกิจกรรมรายบุคคลและรายรุ่นปี (Scoped ตามปีการศึกษาที่เลือก)

import { useState, useMemo, useEffect, useCallback } from 'react';
import LoadError from '@/components/LoadError';
import Topbar from '@/components/Topbar';
import KpiCard from '@/components/KpiCard';
import ChartCard from '@/components/ChartCard';
import RadarChart from '@/components/charts/RadarChart';
import { ChartControlGroup } from '@/components/ChartControlGroup';
import { useFilters } from '@/lib/FilterContext';
import { getProjects, getParticipantRoster } from '@/lib/db/dataService';
import {
  CohortConfig,
  getDynamicCohortList,
  resolveStudentCohortDynamic,
  getCurrentAcademicYearBE,
} from '@/lib/cohortUtils';
import { Project, KUIdentity, ProjectType } from '@/lib/mockData';
import { getParticipants, Participant } from '@/lib/mockParticipants';
import { exportDashboardToExcel } from '@/lib/exportExcel';
import { participantReferenceYear, scopeParticipants, participantAttendanceRate } from '@/lib/participantScope';
import { academicYears } from '@/lib/reportUtils';
import { alpha, percentageBandColor } from '@/lib/chartHelpers';
import layoutStyles from '@/app/layout.module.css';
import styles from './participants.module.css';

// 6 Student Activity Types
const activityTypes: ProjectType[] = [
  'กิจกรรมวิชาการที่ส่งเสริมคุณลักษณะบัณฑิตที่พึงประสงค์',
  'กิจกรรมเสริมสร้างคุณธรรมและจริยธรรม',
  'กิจกรรมกีฬาหรือส่งเสริมสุขภาพ',
  'กิจกรรมบำเพ็ญประโยชน์',
  'กิจกรรมเสริมสร้างศิลปะและวัฒนธรรม',
  'กิจกรรมส่งเสริมการรักษาสิ่งแวดล้อม'
];

const kuIdentities: KUIdentity[] = ['I', 'D', 'K', 'U'];

export default function ParticipantsPage() {
  const [projectsData, setProjectsData] = useState<{ projects: Project[]; isLive: boolean; roster?: Participant[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportError, setExportError] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Global Filter Context
  const { academicYear, semester } = useFilters();

  // Local Page Filters state
  const [yearFilter, setYearFilter] = useState<'all' | '1' | '2' | '3' | '4' | 'other'>('all');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'below50' | 'below80' | 'above80'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Rankings and Chart views state (Default 10 อันดับแรกที่มีอัตราการเข้าร่วมจริงต่ำสุด)
  const [rankMode, setRankMode] = useState<'below80' | 'highest'>('below80');
  const [rankLimit, setRankLimit] = useState<number | 'all'>(10);
  const [chartMode, setChartMode] = useState<'activity' | 'idku'>('idku');
  const [selectedCohortDrill, setSelectedCohortDrill] = useState<string>('all');

  // Directory Table Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Directory Table Sorting state
  const [sortField, setSortField] = useState<'studentId' | 'studyYear' | 'activityCount' | 'rate' | 'missedCount'>('studentId');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'missedCount' || field === 'rate' || field === 'activityCount' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field: typeof sortField) => {
    if (sortField !== field) {
      return <span style={{ opacity: 0.3, marginLeft: '6px', fontSize: '10px', verticalAlign: 'middle' }}>↕</span>;
    }
    return sortOrder === 'asc'
      ? <span style={{ color: 'var(--ku-green)', marginLeft: '6px', fontSize: '10px', verticalAlign: 'middle' }}>▲</span>
      : <span style={{ color: 'var(--ku-green)', marginLeft: '6px', fontSize: '10px', verticalAlign: 'middle' }}>▼</span>;
  };

  useEffect(() => {
    getProjects()
      .then(async (res) => {
        const roster = await getParticipantRoster(res.projects);
        setProjectsData({ ...res, roster });
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoadError(true);
        setLoading(false);
      });
  }, [retryKey]);

  // Set page back to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [yearFilter, attendanceFilter, searchTerm, academicYear, semester]);

  // Support URL query parameters for instant view loading
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const r = p.get('rank');
      if (r === 'lowest' || r === 'below80') {
        setRankMode('below80');
      } else if (r === 'highest') {
        setRankMode('highest');
      }
      const att = p.get('attendance');
      if (att === 'below50' || att === 'below80' || att === 'above80' || att === 'all') {
        setAttendanceFilter(att);
      }
    }
  }, []);

  // Filter projects by active academicYear and semester
  const projectsList = useMemo(() => {
    let list = projectsData?.projects ?? [];
    if (academicYear !== 'all') {
      list = list.filter((p) => String(p.academicYear) === academicYear);
    }
    if (semester !== 'all') {
      list = list.filter((p) => p.semester === semester);
    }
    return list;
  }, [projectsData, academicYear, semester]);

  // Generate participants scoped strictly to the filtered projects of the active academic year
  // Only students with registered activity in this active project list are included
  const participants = useMemo(() => {
    if (!projectsData?.roster) return getParticipants(projectsList);
    return scopeParticipants(projectsData.roster, projectsList);
  }, [projectsList, projectsData]);

  const referenceYear = useMemo(() => participantReferenceYear(projectsList, participants, academicYear), [projectsList, participants, academicYear]);
  const activeYearBE = academicYear === 'all' ? getCurrentAcademicYearBE() : (referenceYear ?? (academicYears(projectsData?.projects ?? []).length ? Math.max(...academicYears(projectsData?.projects ?? [])) : 2568));
  const cohortList = useMemo(() => {
    const rawList = getDynamicCohortList(activeYearBE);
    return rawList.filter((c) => {
      const count = participants.filter((p) => p.studentId.startsWith(c.code.replace('-', ''))).length;
      return count > 0 || c.studyYear >= 5;
    });
  }, [activeYearBE, participants]);
  const getStudentCohort = useCallback((student: Participant): CohortConfig => resolveStudentCohortDynamic(student.studentId, activeYearBE), [activeYearBE]);
  const calcAttendanceRate = (person: Participant) => +(participantAttendanceRate(person) ?? 0).toFixed(1);

  // 1. KPI summary calculations (with realistic attendance tiers <50%, <80%, >=80%)
  const kpiStats = useMemo(() => {
    const total = participants.length;

    // Filtered group based on active yearFilter
    const activeCohort = participants.filter((p) => {
      const c = getStudentCohort(p);
      if (yearFilter === 'other') {
        if (c.studyYear < 5) return false;
      } else if (yearFilter !== 'all') {
        if (String(c.studyYear) !== yearFilter && c.code !== yearFilter) return false;
      }
      return true;
    });

    const avgAttendance = activeCohort.length > 0
      ? activeCohort.reduce((sum, p) => sum + calcAttendanceRate(p), 0) / activeCohort.length
      : 0;

    // Attendance tier breakdown
    const below50Students = activeCohort.filter((p) => calcAttendanceRate(p) < 50);
    const between50And80Students = activeCohort.filter((p) => {
      const r = calcAttendanceRate(p);
      return r >= 50 && r < 80;
    });
    const below80Students = activeCohort.filter((p) => calcAttendanceRate(p) < 80);
    const above80Students = activeCohort.filter((p) => calcAttendanceRate(p) >= 80);

    return {
      total,
      avgAttendance,
      cohortSize: activeCohort.length,
      below50Count: below50Students.length,
      between50And80Count: between50And80Students.length,
      below80Count: below80Students.length,
      above80Count: above80Students.length,
    };
  }, [participants, yearFilter, getStudentCohort]);

  // 2. Ranked List: Top by Actual Attendance Rate (% เข้าร่วมจริงต่ำ <50% หรือ <80% หรือ Active สูงสุด)
  const rankedStudents = useMemo(() => {
    const cohort = participants.filter((p) => {
      const c = getStudentCohort(p);
      if (yearFilter === 'other') {
        if (c.studyYear < 5) return false;
      } else if (yearFilter !== 'all') {
        if (String(c.studyYear) !== yearFilter && c.code !== yearFilter) return false;
      }
      return true;
    });

    const mapped = cohort.map((p) => {
      const regCount = p.registeredProjects.length;
      const attCount = p.attendedProjects.length;
      const missedCount = Math.max(0, regCount - attCount);
      const rate = calcAttendanceRate(p);

      const missedProjects = p.registeredProjects
        .filter((id) => !p.attendedProjects.includes(id))
        .map((id) => projectsList.find((proj) => proj.id === id))
        .filter(Boolean) as Project[];

      return {
        ...p,
        rate,
        regCount,
        attCount,
        missedCount,
        missedProjects
      };
    });

    if (rankMode === 'highest') {
      const list = mapped.filter((p) => p.regCount > 0);
      list.sort((a, b) => b.rate - a.rate || b.attCount - a.attCount);
      return rankLimit === 'all' ? list : list.slice(0, rankLimit);
    } else {
      const list = mapped.filter((p) => p.regCount > 0 && p.rate < 80);
      list.sort((a, b) => a.rate - b.rate || b.missedCount - a.missedCount);
      return rankLimit === 'all' ? list : list.slice(0, rankLimit);
    }
  }, [participants, projectsList, yearFilter, rankMode, rankLimit, getStudentCohort]);

  // 3. Cohort Analytics (Calculated per Admission Cohort extracted from studentId prefix)
  const cohortAnalytics = useMemo(() => {
    const activeStudents = participants;

    const labels = chartMode === 'activity'
      ? ['วิชาการ/บัณฑิต', 'คุณธรรมจริยธรรม', 'กีฬา/สุขภาพ', 'บำเพ็ญประโยชน์', 'ศิลปวัฒนธรรม', 'รักษาสิ่งแวดล้อม']
      : ['Integrity (คุณธรรม)', 'Determination (มุ่งมั่น)', 'Knowledge (ปัญญา)', 'Utility (ก้าวหน้า)'];

    const shortLabels = chartMode === 'activity'
      ? ['วิชาการ', 'คุณธรรม', 'กีฬา', 'บำเพ็ญ', 'ศิลปะ', 'สิ่งแวดล้อม']
      : ['I (คุณธรรม)', 'D (มุ่งมั่น)', 'K (ปัญญา)', 'U (ก้าวหน้า)'];

    // Map each cohort to its student set, project sets, counts and percentages
    const cohortsData = cohortList.map((c) => {
      const cohortStudents = activeStudents.filter((s) => getStudentCohort(s).code === c.code);
      const cohortSize = cohortStudents.length;

      // Extract all projects associated with this cohort (registered or attended)
      const cohortProjectIds = new Set<number>();
      cohortStudents.forEach((s) => {
        s.registeredProjects.forEach((pid) => cohortProjectIds.add(pid));
        s.attendedProjects.forEach((pid) => cohortProjectIds.add(pid));
      });

      const cohortProjects = projectsList.filter((p) => cohortProjectIds.has(p.id));
      const totalCohortProjects = cohortProjects.length;

      const projectCounts: number[] = [];
      const projectPercentages: number[] = [];
      const dimensionProjects: Project[][] = [];

      const percentages: number[] = [];
      const rawCounts: number[] = [];

      if (chartMode === 'activity') {
        activityTypes.forEach((type) => {
          const projs = cohortProjects.filter((p) => p.type === type);
          dimensionProjects.push(projs);
          projectCounts.push(projs.length);
          const pct = totalCohortProjects > 0 ? Math.round((projs.length / totalCohortProjects) * 100) : 0;
          projectPercentages.push(pct);

          if (cohortSize === 0) {
            percentages.push(0);
            rawCounts.push(0);
            return;
          }
          const count = cohortStudents.filter((s) =>
            s.attendedProjects.some((projId) => {
              const proj = projectsList.find((p) => p.id === projId);
              return proj && proj.type === type;
            })
          ).length;
          rawCounts.push(count);
          percentages.push(+((count / cohortSize) * 100).toFixed(1));
        });
      } else {
        kuIdentities.forEach((ku) => {
          const projs = cohortProjects.filter((p) => p.kuList.includes(ku));
          dimensionProjects.push(projs);
          projectCounts.push(projs.length);
          const pct = totalCohortProjects > 0 ? Math.round((projs.length / totalCohortProjects) * 100) : 0;
          projectPercentages.push(pct);

          if (cohortSize === 0) {
            percentages.push(0);
            rawCounts.push(0);
            return;
          }
          const count = cohortStudents.filter((s) =>
            s.attendedProjects.some((projId) => {
              const proj = projectsList.find((p) => p.id === projId);
              return proj && proj.kuList.includes(ku);
            })
          ).length;
          rawCounts.push(count);
          percentages.push(+((count / cohortSize) * 100).toFixed(1));
        });
      }

      const avgRate = cohortSize > 0
        ? +(cohortStudents.reduce((sum, s) => sum + calcAttendanceRate(s), 0) / cohortSize).toFixed(1)
        : 0;

      return {
        ...c,
        studentsCount: cohortSize,
        avgRate,
        percentages,
        rawCounts,
        totalProjects: totalCohortProjects,
        projectCounts,
        projectPercentages,
        dimensionProjects,
        radarDataset: [{
          label: c.fullTitle,
          data: percentages,
          borderColor: c.color,
          backgroundColor: c.bgAlpha,
          pointBackgroundColor: c.color,
        }]
      };
    });

    // Dataset for Slopegraph Trajectory (LineChart)
    const dimensionColors = chartMode === 'activity'
      ? ['#1E61F0', '#0D9488', '#F59E0B', '#8B5CF6', '#EC4899', '#10B981']
      : ['#10B981', '#F59E0B', '#1E61F0', '#8B5CF6'];

    const trajectoryLabels = cohortList.map((c) => c.badgeText);
    const trajectoryDatasets = labels.map((dimLabel, dimIdx) => {
      const data = cohortsData.map((cd) => cd.studentsCount > 0 ? cd.percentages[dimIdx] : null);
      const color = dimensionColors[dimIdx % dimensionColors.length];
      return {
        label: dimLabel,
        data,
        borderColor: color,
        backgroundColor: alpha(color, 0.08),
        pointBackgroundColor: color,
        tension: 0,
        fill: false,
      };
    });

    return {
      labels,
      shortLabels,
      cohortsData,
      trajectoryLabels,
      trajectoryDatasets,
    };
  }, [participants, projectsList, chartMode, cohortList, getStudentCohort]);

  // 4. Directory Table: Filtered by Attendance Tiers (<50%, <80%, >=80%) with Full Data View
  const directoryData = useMemo(() => {
    let list = [...participants];

    // Filter by year
    if (yearFilter === 'other') {
      list = list.filter((p) => getStudentCohort(p).studyYear >= 5);
    } else if (yearFilter !== 'all') {
      list = list.filter((p) => {
        const c = getStudentCohort(p);
        return String(c.studyYear) === yearFilter || c.code === yearFilter;
      });
    }

    // Filter by attendance percentage tier (< 50%, < 80%, >= 80%)
    if (attendanceFilter === 'below50') {
      list = list.filter((p) => calcAttendanceRate(p) < 50);
    } else if (attendanceFilter === 'below80') {
      list = list.filter((p) => calcAttendanceRate(p) < 80);
    } else if (attendanceFilter === 'above80') {
      list = list.filter((p) => calcAttendanceRate(p) >= 80);
    }

    // Filter by search term (Student ID)
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      list = list.filter((p) =>
        p.studentId.toLowerCase().includes(term)
      );
    }

    // Sorting logic
    list.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (sortField === 'rate') {
        valA = calcAttendanceRate(a);
        valB = calcAttendanceRate(b);
      } else if (sortField === 'activityCount') {
        valA = a.attendedProjects.length;
        valB = b.attendedProjects.length;
      } else if (sortField === 'missedCount') {
        valA = Math.max(0, a.registeredProjects.length - a.attendedProjects.length);
        valB = Math.max(0, b.registeredProjects.length - b.attendedProjects.length);
      } else {
        const rawA = a[sortField as 'studentId' | 'studyYear'];
        const rawB = b[sortField as 'studentId' | 'studyYear'];
        valA = rawA ?? '';
        valB = rawB ?? '';
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return sortOrder === 'asc'
          ? (valA < valB ? -1 : valA > valB ? 1 : 0)
          : (valA > valB ? -1 : valA < valB ? 1 : 0);
      }
    });

    const totalCount = list.length;
    const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedList = list.slice(startIndex, startIndex + itemsPerPage);

    return {
      list: paginatedList,
      totalCount,
      totalPages,
      startIndex
    };
  }, [participants, yearFilter, attendanceFilter, searchTerm, currentPage, sortField, sortOrder, getStudentCohort]);

  if (loading) {
    return (
      <>
        <Topbar title="สถิติการมีส่วนร่วมนิสิต" subtitle="กำลังเชื่อมต่อและโหลดข้อมูลโครงการ..." />
        <div className={layoutStyles.content} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', flexDirection: 'column', gap: '16px' }}>
          <div style={{ width: '45px', height: '45px', border: '4px solid #E2E8F0', borderTop: '4px solid var(--color-primary, #1E61F0)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <style dangerouslySetInnerHTML={{__html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}} />
          <p style={{ fontSize: '15px', color: '#475569', fontFamily: 'Sarabun, sans-serif' }}>กำลังเชื่อมต่อฐานข้อมูล...</p>
        </div>
      </>
    );
  }

  if (loadError) return <LoadError onRetry={() => { setLoadError(false); setLoading(true); setRetryKey(key => key + 1); }} />;

  return (
    <>
      {exportError && <div role="alert">ส่งออกไม่สำเร็จ กรุณากดส่งออกอีกครั้ง</div>}
      <Topbar
        title="สถิติการมีส่วนร่วมนิสิต"
        subtitle={
          academicYear === 'all'
            ? "สถิติการเข้าร่วมกิจกรรมแยกตามรายบุคคล อัตราการเข้าร่วม และการกระจายตัวตามรุ่นปีการศึกษา (ทุกปีการศึกษา)"
            : `สถิติการเข้าร่วมกิจกรรมแยกตามรายบุคคล อัตราการเข้าร่วม และการกระจายตัวตามรุ่นปีการศึกษา ประจำปีการศึกษา ${academicYear}${semester !== 'all' ? ` (${semester === 't1' ? 'ภาคต้น' : semester === 't2' ? 'ภาคปลาย' : 'ภาคฤดูร้อน'})` : ''}`
        }
      />
      <div className={layoutStyles.content}>
<details style={{ marginBottom: 16, padding: 12, border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, lineHeight: 1.65 }}>
<summary style={{ cursor: 'pointer', fontWeight: 600 }}>วิธีคำนวณอัตราเข้าร่วมและการอ้างอิงชั้นปี</summary>
        <p>
          {academicYear === 'all'
            ? `รวมประวัติทุกปีที่มีข้อมูล • ชั้นปีอ้างอิงสถานะปัจจุบัน (นิสิตรหัส 68 = ชั้นปีที่ 2, รุ่น 69 ยังไม่มีข้อมูลในระบบ)`
            : `ชั้นปีและประวัติอ้างอิงปีการศึกษา ${activeYearBE}`}
          <br />
          ชั้นปีประมาณจากปีอ้างอิง − ปีเข้าศึกษา + 1 (ตั้งแต่ 5 รวมเป็น 5+) ไม่ใช่สถานะกำลังศึกษาหรือสำเร็จการศึกษา
          <br />
          อัตราเข้าร่วมจริง = โครงการที่เข้าร่วมจริง ÷ โครงการที่มีชื่อในข้อมูลรายบุคคล × 100 ภายใต้ปีและภาคเรียนที่เลือก
          {academicYear === 'all' && ' • รวมจำนวนโครงการก่อนหาร ไม่เฉลี่ยเปอร์เซ็นต์ข้ามปี'}
          {' • โครงการหลายวันนับครั้งเดียวเมื่อมีหลักฐานเข้าร่วมอย่างน้อยหนึ่งช่วงเวลา • ไม่มีข้อมูลไม่ถือว่าขาด'}
          {participants.length === 0 && <><br />ยังไม่มีข้อมูลรายบุคคลในช่วงที่เลือก จึงยังคำนวณอัตราเข้าร่วมจริงไม่ได้</>}
        </p>
</details>
        
        {/* KPI Cards (4 executive cards, fully responsive to active academic year view) */}
        <div className={layoutStyles.kpiRow}>
          <KpiCard
            label="นิสิตที่มีรายชื่อเข้าร่วมกิจกรรม"
            value={`${kpiStats.total} คน`}
            sub={academicYear === 'all' ? 'ทุกโครงการในระบบ' : `ประจำปีการศึกษา ${academicYear}`}
            color="navy"
          />
          <KpiCard 
            label="อัตราการเข้าร่วมเฉลี่ย" 
            value={kpiStats.cohortSize ? `${kpiStats.avgAttendance.toFixed(1)}%` : '—'}
            sub={`เฉลี่ยอัตรารายบุคคลในกลุ่ม ${kpiStats.cohortSize} คน`}
            color="teal" 
          />
          <KpiCard 
            label="ควรติดตาม (เข้าร่วม < 80%)" 
            value={`${kpiStats.below80Count} คน`} 
            sub={`วิกฤต (<50%): ${kpiStats.below50Count} คน • เฝ้าระวัง (50-79%): ${kpiStats.between50And80Count} คน`} 
            trend="กลุ่มต้องติดตามชั่วโมงกิจกรรม"
            color="rose" 
          />
          <KpiCard 
            label="ตามเกณฑ์มาตรฐาน (≥ 80%)" 
            value={`${kpiStats.above80Count} คน`} 
            sub={`คิดเป็น ${kpiStats.cohortSize > 0 ? ((kpiStats.above80Count / kpiStats.cohortSize) * 100).toFixed(0) : 0}% ของนิสิตที่มีชื่อทั้งหมด`} 
            trend="เข้าร่วมกิจกรรมสม่ำเสมอ"
            color="emerald" 
          />
        </div>

        {/* Dynamic Analytics Section (Grid 2: Left ranked lists, Right grouped bar/heatmap chart) */}
        <div className={layoutStyles.grid2}>
          
          {/* Top Lowest / Highest Attendance Rate Card */}
          <ChartCard
            title={
              rankMode === 'highest'
                ? (rankLimit === 'all' ? "อันดับนิสิตที่เข้าร่วมกิจกรรมสูงสุดทั้งหมด" : `${rankLimit} อันดับแรก: เข้าร่วมกิจกรรมสูงสุด (Active เด่น)`)
                : (rankLimit === 'all' ? "รายชื่อนิสิตที่อัตราเข้าร่วมต่ำกว่าเกณฑ์ (< 80%) ทั้งหมด" : `${rankLimit} อันดับแรก: อัตราเข้าร่วมต่ำกว่าเกณฑ์ (< 80%)`)
            }
            subtitle={
              rankMode === 'highest'
                ? "จัดอันดับนิสิตที่มีการเข้าร่วมกิจกรรมจริงสูงสุดเปรียบเทียบกับจำนวนโครงการที่สมัคร"
                : "รายชื่อนิสิตที่มีอัตราการเข้าร่วมจริงต่ำกว่า 80% (เรียงจากน้อยไปมาก เพื่อติดตามกลุ่มที่ต้องการความช่วยเหลือ)"
            }
            height={420}
            controls={
              <>
                <ChartControlGroup
                  label="เกณฑ์ติดตาม:"
                  options={[
                    { value: 'below80', label: 'ต่ำกว่าเกณฑ์ (<80%)' },
                    { value: 'highest', label: 'เข้าร่วมสูงสุด (Active)' }
                  ]}
                  value={rankMode}
                  onChange={(val) => setRankMode(val as 'below80' | 'highest')}
                />
                <ChartControlGroup
                  label="จำนวน:"
                  options={[
                    { value: 5, label: '5 คน' },
                    { value: 10, label: '10 คน' },
                    { value: 'all', label: 'ทั้งหมด' }
                  ]}
                  value={rankLimit}
                  onChange={(val) => setRankLimit(val as never)}
                />
              </>
            }
          >
            <div className={styles.rankList}>
              {rankedStudents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748B', fontFamily: 'Sarabun' }}>
                  {rankMode === 'highest'
                    ? "ไม่พบข้อมูลนิสิตในกลุ่มที่เลือก"
                    : "ยอดเยี่ยม! ไม่พบนิสิตที่มีอัตราเข้าร่วมต่ำกว่าเกณฑ์ (< 80%) ในกลุ่มตัวกรองนี้"}
                </div>
              ) : (
                rankedStudents.map((student, idx) => {
                  const rate = student.rate;
                  const rankClass = 
                    rankMode === 'highest'
                      ? idx === 0 ? styles.gold : idx === 1 ? styles.silver : idx === 2 ? styles.bronze : ''
                      : rate < 50
                      ? styles.rankAlert
                      : styles.rankWarn;
                  
                  const rateClass = rate < 50 ? styles.rateUrgent : rate < 70 ? styles.rateWarn : rate < 80 ? styles.rateMid : rate <= 100 ? styles.rateNormal : styles.rateOver;

                  return (
                    <div key={student.studentId} className={styles.rankItem}>
                      <div className={styles.studentInfo}>
                        <span className={`${styles.rank} ${rankClass}`}>
                          {idx + 1}
                        </span>
                        <div className={styles.studentNameGroup}>
                          <span className={styles.studentName} style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '14px', color: '#0F172A', letterSpacing: '0.5px' }}>
                            {student.studentId}
                          </span>
                          <span className={styles.studentCohortLabel} style={{ fontSize: '11px', color: '#64748B' }}>
                            {getStudentCohort(student).label} ({getStudentCohort(student).yearLabel})
                          </span>
                          {/* Missed projects list tags for follow-up */}
                          {rankMode !== 'highest' && student.missedProjects && student.missedProjects.length > 0 && (
                            <div className={styles.missedProjectsList}>
                              {student.missedProjects.slice(0, 2).map((mp) => (
                                <span key={mp.id} className={styles.missedTag} title={`ขาด: ${mp.name}`}>
                                  ❌ {mp.name}
                                </span>
                              ))}
                              {student.missedProjects.length > 2 && (
                                <span className={styles.missedTagMore} title={student.missedProjects.slice(2).map(m => m.name).join(', ')}>
                                  +{student.missedProjects.length - 2} งาน
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className={`${styles.ratePill} ${rateClass}`}>
                          {rate}%
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ChartCard>

          {/* Cohort Comparison Card - Clean & Simple PLO Style Multi-Cohort Polygon */}
          <ChartCard
            title={
              selectedCohortDrill === 'all'
                ? (chartMode === 'idku' ? "การกระจายตัวของกิจกรรมตามอัตลักษณ์ IDKU รายชั้นปี" : "การกระจายตัวของกิจกรรมตามประเภทกิจกรรม 6 ด้าน รายชั้นปี")
                : `เจาะลึกกิจกรรมของรุ่นปี: ${cohortList.find(c => c.code === selectedCohortDrill)?.fullTitle || ''}`
            }
            subtitle="แสดงจำนวนโครงการจริงที่เปิดให้แต่ละชั้นปี (เปรียบเทียบซ้อนเลเยอร์สี)"
            height={selectedCohortDrill === 'all' ? 440 : 'auto'}
            autoHeight={selectedCohortDrill !== 'all'}
            controls={
              <ChartControlGroup
                label="มิติข้อมูล:"
                options={[
                  { value: 'idku', label: 'อัตลักษณ์ IDKU (4 แกน)' },
                  { value: 'activity', label: 'ประเภทกิจกรรม (6 แกน)' }
                ]}
                value={chartMode}
                onChange={(val) => setChartMode(val as never)}
              />
            }
          >
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Cohort Selector Pills (Simple & Clean) */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
                <button
                  type="button"
                  className={`${styles.cohortFilterBtn} ${selectedCohortDrill === 'all' ? styles.cohortFilterBtnActive : ''}`}
                  onClick={() => setSelectedCohortDrill('all')}
                >
                  ทุกชั้นปี
                </button>
                {cohortAnalytics.cohortsData.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    className={`${styles.cohortFilterBtn} ${selectedCohortDrill === c.code ? styles.cohortFilterBtnActive : ''}`}
                    onClick={() => setSelectedCohortDrill(c.code)}
                    style={selectedCohortDrill === c.code ? { backgroundColor: c.color, borderColor: c.color, color: '#fff' } : {}}
                  >
                    {c.yearLabel.replace('ชั้น', '')} ({c.code})
                  </button>
                ))}
              </div>

              {/* Symmetrically Centered Radar Chart Area (PLO-Style Polygon) */}
              <div className={styles.radarCenterWrapper}>
                <div className={styles.radarSymmetricBox}>
                  <RadarChart
                    labels={cohortAnalytics.labels}
                    datasets={
                      selectedCohortDrill === 'all'
                        ? cohortAnalytics.cohortsData.filter(c => c.studentsCount > 0).map((c) => ({
                            label: `${c.label} (${c.yearLabel})`,
                            data: c.projectCounts,
                            borderColor: c.color,
                            backgroundColor: c.bgAlpha,
                            pointBackgroundColor: c.color,
                            borderWidth: 2.5,
                          }))
                        : (() => {
                            const target = cohortAnalytics.cohortsData.find(c => c.code === selectedCohortDrill) || cohortAnalytics.cohortsData[0];
                            return [{
                              label: `${target.label} (${target.yearLabel})`,
                              data: target.projectCounts,
                              borderColor: target.color,
                              backgroundColor: target.bgAlpha,
                              pointBackgroundColor: target.color,
                              borderWidth: 3,
                            }];
                          })()
                    }
                    min={0}
                  />
                </div>
              </div>

              {/* Activity Breakdown / Cohort Summary */}
              {selectedCohortDrill === 'all' ? (
                <div className={styles.cohortChipList}>
                  {cohortAnalytics.cohortsData.map((c) => (
                    <div
                      key={c.code}
                      className={styles.cohortChipCard}
                      onClick={() => setSelectedCohortDrill(c.code)}
                      title="คลิกเพื่อเจาะลึกรายชื่อกิจกรรมของรุ่นนี้"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <span style={{ color: c.color, fontWeight: 700, fontSize: '11.5px' }}>● {c.label} ({c.yearLabel})</span>
                        <span style={{ background: '#F1F5F9', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', color: '#475569', fontWeight: 600 }}>
                          {c.totalProjects} โครงการ
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', fontSize: '10.5px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        {cohortAnalytics.shortLabels.map((lbl, idx) => {
                          const count = c.projectCounts[idx] || 0;
                          return (
                            <span key={lbl} style={count === 0 ? { color: '#DC2626', fontWeight: 600 } : {}}>
                              {lbl.split(' ')[0]}: {count}{count === 0 ? '⚠️' : ''}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                (() => {
                  const target = cohortAnalytics.cohortsData.find(c => c.code === selectedCohortDrill) || cohortAnalytics.cohortsData[0];
                  return (
                    <div className={styles.cohortDrillContainer}>
                      <div className={styles.cohortDrillHeader}>
                        <span>
                          รายชื่อกิจกรรมที่จัดให้ <strong style={{ color: target.color }}>{target.label} ({target.yearLabel})</strong>
                          {' '}— ทั้งหมด {target.totalProjects} โครงการ
                        </span>
                        <button
                          type="button"
                          className={styles.cohortFilterBtn}
                          onClick={() => setSelectedCohortDrill('all')}
                          style={{ fontSize: '11px' }}
                        >
                          ← กลับไปดูทุกชั้นปี
                        </button>
                      </div>
                      <div className={styles.cohortDimGrid}>
                        {cohortAnalytics.labels.map((lbl, idx) => {
                          const projs = target.dimensionProjects[idx] || [];
                          const count = projs.length;
                          return (
                            <div key={lbl} className={styles.cohortDimCard}>
                              <div className={styles.cohortDimHead}>
                                <span style={{ fontWeight: 600 }}>{lbl}</span>
                                <span style={{
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  background: count > 0 ? '#DCFCE7' : '#FEF2F2',
                                  color: count > 0 ? '#15803D' : '#DC2626',
                                  border: count > 0 ? '1px solid #86EFAC' : '1px solid #FCA5A5'
                                }}>
                                  {count} โครงการ
                                </span>
                              </div>
                              <div className={styles.projectTagList}>
                                {count === 0 ? (
                                  <span className={styles.projectEmptyItem}>
                                    ⚠️ ไม่มีโครงการเปิดให้ชั้นปีนี้
                                  </span>
                                ) : (
                                  projs.map((p) => (
                                    <span
                                      key={p.id}
                                      className={styles.projectTagItem}
                                      title={`${p.name} (${p.hours} ชม.) - ผู้รับผิดชอบ: ${p.lecturer}`}
                                    >
                                      📄 {p.name}
                                    </span>
                                  ))
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </ChartCard>
        </div>

        {/* Student Directory Table Section (พร้อมให้กรองดูแบบเต็มทุกช่วง % เข้าร่วมจริง) */}
        <div className={layoutStyles.grid1} style={{ marginTop: '24px' }}>
          
          {/* Table Header & Controls Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                ทะเบียนนิสิตและประวัติการเข้าร่วมกิจกรรม
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                ตรวจสอบสถิติการเข้าร่วมกิจกรรมจริงรายบุคคลเพื่อการติดตามและให้คำปรึกษา
              </p>
            </div>
          </div>

          {/* Filter & Search Bar moved to table header */}
          <div className={styles.searchRow} style={{ marginBottom: '12px' }}>
            <div className={styles.filterGroup}>
              <span className={styles.selectLabel}>รุ่นปี / ชั้นปี:</span>
              <select
                className={styles.select}
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value as never)}
              >
                <option value="all">ทุกรุ่นปี (รุ่นปี {cohortList[cohortList.length - 1]?.code.replace('-', '')} – {cohortList[0]?.code})</option>
                {cohortList.map((c) => (
                  <option key={c.code} value={c.studyYear >= 5 ? 'other' : String(c.studyYear)}>
                    {c.fullTitle}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <span className={styles.selectLabel}>เกณฑ์การเข้าร่วม:</span>
              <select
                className={styles.select}
                value={attendanceFilter}
                onChange={(e) => setAttendanceFilter(e.target.value as never)}
              >
                <option value="all">ทุกระดับการเข้าร่วม</option>
                <option value="below50">🔴 วิกฤต: เข้าร่วมจริงต่ำมาก (&lt; 50%)</option>
                <option value="below80">⚠️ ควรติดตาม: เข้าร่วมต่ำกว่าเกณฑ์ (&lt; 80%)</option>
                <option value="above80">✅ ตามเกณฑ์: เข้าร่วมสูง (≥ 80%)</option>
              </select>
            </div>

            <div className={styles.searchField} style={{ marginLeft: 'auto' }}>
              <span className={styles.searchIcon}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="text"
                className={styles.input}
                placeholder="ค้นหารหัสนิสิต..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button
              type="button"
              className={styles.exportStudentsBtn}
              onClick={() => { setExportError(false); exportDashboardToExcel(projectsList, { academicYear, semester, exportType: 'participants-only' }).catch(() => setExportError(true)); }}
              title="ส่งออกรายชื่อและสถิติการเข้าร่วมกิจกรรมของนิสิตเป็นไฟล์ Excel (.xlsx)"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span>ส่งออกรายชื่อนิสิต (.xlsx)</span>
            </button>
          </div>
          
          {/* Quick-Action Filter Pills (กรองดูแบบเต็ม) */}
          <div className={styles.quickFilterRow}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>กรองดูแบบเต็ม:</span>
            <button
              type="button"
              className={`${styles.quickFilterChip} ${attendanceFilter === 'all' ? styles.quickFilterChipActive : ''}`}
              onClick={() => setAttendanceFilter('all')}
            >
              ทั้งหมด <span className={styles.quickFilterChipCount}>{kpiStats.cohortSize}</span>
            </button>
            <button
              type="button"
              className={`${styles.quickFilterChip} ${attendanceFilter === 'below50' ? styles.quickFilterChipActive : ''}`}
              onClick={() => setAttendanceFilter('below50')}
              style={attendanceFilter === 'below50' ? { backgroundColor: '#DC2626', borderColor: '#DC2626', color: '#fff' } : { color: '#DC2626' }}
            >
              🔴 วิกฤต: เข้าร่วม &lt; 50% <span className={styles.quickFilterChipCount}>{kpiStats.below50Count}</span>
            </button>
            <button
              type="button"
              className={`${styles.quickFilterChip} ${attendanceFilter === 'below80' ? styles.quickFilterChipActive : ''}`}
              onClick={() => setAttendanceFilter('below80')}
              style={attendanceFilter === 'below80' ? { backgroundColor: '#D97706', borderColor: '#D97706', color: '#fff' } : { color: '#D97706' }}
            >
              ⚠️ ควรติดตาม: เข้าร่วม &lt; 80% <span className={styles.quickFilterChipCount}>{kpiStats.below80Count}</span>
            </button>
            <button
              type="button"
              className={`${styles.quickFilterChip} ${attendanceFilter === 'above80' ? styles.quickFilterChipActive : ''}`}
              onClick={() => setAttendanceFilter('above80')}
              style={attendanceFilter === 'above80' ? { backgroundColor: '#15803D', borderColor: '#15803D', color: '#fff' } : { color: '#15803D' }}
            >
              ✅ ตามเกณฑ์: เข้าร่วม ≥ 80% <span className={styles.quickFilterChipCount}>{kpiStats.above80Count}</span>
            </button>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ลำดับ</th>
                  <th onClick={() => handleSort('studentId')} style={{ cursor: 'pointer', userSelect: 'none' }} title="คลิกเพื่อเรียงตามรหัสนิสิต">
                    รหัสนิสิต {getSortIcon('studentId')}
                  </th>
                  <th onClick={() => handleSort('studyYear')} style={{ cursor: 'pointer', userSelect: 'none' }} title="คลิกเพื่อเรียงตามรุ่นปี / ชั้นปี">
                    รุ่นปี (ชั้นปี) {getSortIcon('studyYear')}
                  </th>
                  <th onClick={() => handleSort('missedCount')} style={{ cursor: 'pointer', userSelect: 'none', width: '230px' }} title="คลิกเพื่อเรียงตามจำนวนกิจกรรมที่ขาด">
                    กิจกรรม (สมัคร / เข้าจริง / ขาด) {getSortIcon('missedCount')}
                  </th>
                  <th onClick={() => handleSort('rate')} style={{ cursor: 'pointer', userSelect: 'none', width: '240px' }} title="คลิกเพื่อเรียงตามอัตราการเข้าร่วม">
                    อัตราเข้าร่วมจริง & สถานะติดตาม {getSortIcon('rate')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {directoryData.list.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '48px', color: '#64748B' }}>
                      ไม่พบข้อมูลนิสิตที่ตรงกับตัวกรองหรือคำค้นหาของคุณ
                    </td>
                  </tr>
                ) : (
                  directoryData.list.map((student, idx) => {
                    const globalIdx = directoryData.startIndex + idx;
                    const rate = calcAttendanceRate(student);
                    const regCount = student.registeredProjects.length;
                    const attCount = student.attendedProjects.length;
                    const missedCount = Math.max(0, regCount - attCount);
                    const fillPercent = regCount > 0 ? (attCount / regCount) * 100 : 0;
                    const rateClass = rate < 50 ? styles.rateUrgent : rate < 70 ? styles.rateWarn : rate < 80 ? styles.rateMid : rate <= 100 ? styles.rateNormal : styles.rateOver;

                    return (
                      <tr key={student.studentId}>
                        <td>
                          <span className={styles.rank}>
                            {globalIdx + 1}
                          </span>
                        </td>
                        <td style={{ fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '0.5px', color: '#0F172A' }}>
                          {student.studentId}
                        </td>
                        <td>
                          <span className={`${styles.tagYear} ${
                            getStudentCohort(student).studyYear >= 5 ? styles.yearOther :
                            getStudentCohort(student).studyYear === 1 ? styles.year1 :
                            getStudentCohort(student).studyYear === 2 ? styles.year2 :
                            getStudentCohort(student).studyYear === 3 ? styles.year3 : styles.year4
                          }`}>
                            {getStudentCohort(student).badgeText}
                          </span>
                        </td>
                        <td>
                          <div className={styles.projectsCountBar}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                              <span className={styles.barText}>{attCount} / {regCount} กิจกรรม</span>
                              {missedCount > 0 ? (
                                <span style={{ fontSize: '11px', color: rate < 50 ? '#DC2626' : '#D97706', fontWeight: 700 }}>
                                  ขาด {missedCount} งาน
                                </span>
                              ) : regCount > 0 ? (
                                <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 600 }}>
                                  ครบ
                                </span>
                              ) : null}
                            </div>
                            <div className={styles.barTrack}>
                              <div
                                className={styles.barFill}
                                style={{
                                  width: `${fillPercent}%`,
                                  backgroundColor: percentageBandColor(rate),
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className={styles.rateContainer}>
                            <span className={`${styles.ratePill} ${rateClass}`}>
                              {rate}%
                            </span>
                            {rate < 50 ? (
                              <span className={styles.followUpBadgeUrgent} title={`อัตราเข้าร่วมวิกฤต (${rate}%) ต้องปรับปรุงเร่งด่วน`}>
                                🔴 วิกฤต (&lt; 50%)
                              </span>
                            ) : rate < 70 ? (
                              <span className={styles.followUpBadgeWarn} title={`อัตราเข้าร่วมเฝ้าระวัง (${rate}%)`}>
                                🟠 เฝ้าระวัง (50–&lt;70%)
                              </span>
                            ) : rate < 80 ? (
                              <span className={styles.followUpBadgeMid} title={`อัตราเข้าร่วมปานกลาง/ใกล้เป้าหมาย (${rate}%)`}>
                                🟡 ปานกลาง (70–&lt;80%)
                              </span>
                            ) : rate <= 100 ? (
                              <span className={styles.followUpBadgeNormal} title={`อัตราเข้าร่วมผ่านเกณฑ์ (${rate}%)`}>
                                🟢 ผ่านเกณฑ์ (80–100%)
                              </span>
                            ) : (
                              <span className={styles.followUpBadgeOver} title={`อัตราเข้าร่วมเกินเป้าหมาย (${rate}%)`}>
                                🔵 เกินเป้า (&gt; 100%)
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            
            {/* Table Pagination Controls */}
            <div className={styles.pagination}>
              <div className={styles.pageInfo}>
                แสดงผล {directoryData.totalCount > 0 ? directoryData.startIndex + 1 : 0} ถึง {Math.min(directoryData.startIndex + itemsPerPage, directoryData.totalCount)} จากทั้งหมด {directoryData.totalCount} คน
              </div>
              <div className={styles.pageActions}>
                <button
                  className={styles.pageBtn}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                >
                  ย้อนกลับ
                </button>
                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0 8px', fontWeight: 'bold', fontSize: '13px' }}>
                  หน้า {currentPage} / {directoryData.totalPages}
                </span>
                <button
                  className={styles.pageBtn}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, directoryData.totalPages))}
                  disabled={currentPage === directoryData.totalPages}
                >
                  ถัดไป
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
