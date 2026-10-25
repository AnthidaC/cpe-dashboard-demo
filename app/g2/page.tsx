'use client';
import { matchesResponsible } from '@/lib/reportUtils';
// app/g2/page.tsx — กลุ่มที่ 2: Attendance & Target Analysis (Clean Excel Mappings & Academic KPIs)

import { useState, useMemo, useEffect } from 'react';
import { lecturerOptions } from '@/lib/reportUtils';
import LoadError from '@/components/LoadError';
import Topbar from '@/components/Topbar';
import KpiCard from '@/components/KpiCard';
import ChartCard from '@/components/ChartCard';
import ChartListControls from '@/components/ChartListControls';
import HBarChart from '@/components/charts/HBarChart';
import BarChart from '@/components/charts/BarChart';
import RadarChart from '@/components/charts/RadarChart';
import DataTable from '@/components/DataTable';
import { canPlotProject, projectCoverage } from '@/lib/projectAvailability';
import ChartFilterBar from '@/components/ChartFilterBar';
import { ChartControlGroup } from '@/components/ChartControlGroup';
import ProjectDetailModal from '@/components/ProjectDetailModal';
import { getProjects } from '@/lib/db/dataService';
import { Project, calculateGroup2Metrics, calculateQualitySummary } from '@/lib/mockData';
import { alpha, palette, percentageBandColor } from '@/lib/chartHelpers';
import { getRankingChartHeight } from '@/lib/chartLayout';
import layoutStyles from '@/app/layout.module.css';
import { useFilters } from '@/lib/FilterContext';

export default function G2Page() {
  const [projectsData, setProjectsData] = useState<{ projects: Project[]; isLive: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const [category, setCategory] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Per-chart tailored states
  const [targetFilter, setTargetFilter] = useState<'all' | 'achieved' | 'below'>('all');
  const [attendanceSortOrder, setAttendanceSortOrder] = useState<'asc' | 'desc'>('asc');
  const [attendanceTopN, setAttendanceTopN] = useState<number | 'all'>(10);
  const [evalTopN, setEvalTopN] = useState<number | 'all'>(10);
  const [evalSortOrder, setEvalSortOrder] = useState<'desc' | 'asc'>('asc');

  // Global filters from context
  const { academicYear, semester } = useFilters();

  useEffect(() => {
    getProjects()
      .then((res) => {
        setProjectsData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoadError(true);
        setLoading(false);
      });
  }, [retryKey]);

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

  const categoryOptions = lecturerOptions(projectsData?.projects ?? []);

  const displayProjects = useMemo(() => {
    let filtered = [...projectsList];
    if (category !== 'all') {
      filtered = filtered.filter((p) => matchesResponsible(p, category));
    }
    return filtered;
  }, [category, projectsList]);

  const g2Metrics = useMemo(() => calculateGroup2Metrics(displayProjects), [displayProjects]);
  const { maxAttProject, minAttProject, maxEvalProject: maxEvalProj } = g2Metrics;

  const maxAttProjectVal = maxAttProject ? `${((maxAttProject.participants / maxAttProject.target) * 100).toFixed(0)}%` : '0%';
  const maxAttProjectName = maxAttProject ? maxAttProject.name : 'ไม่มีข้อมูล';
  const minAttProjectVal = minAttProject ? `${((minAttProject.participants / minAttProject.target) * 100).toFixed(0)}%` : '0%';
  const minAttProjectName = minAttProject ? minAttProject.name : 'ไม่มีข้อมูล';
  const maxEvalProjVal = maxEvalProj ? `${maxEvalProj.evalRate.toFixed(1)}%` : 'ไม่มีข้อมูล';
  const maxEvalProjName = maxEvalProj ? maxEvalProj.name : 'ไม่มีข้อมูล';


  // Filter by target, then rank and limit the same projects for chart and table.
  const filteredAttendanceProjects = useMemo(() => {
    let list = displayProjects.filter(p => canPlotProject(p, ['participants', 'target'], ['target']));
    if (targetFilter === 'achieved') {
      list = list.filter((p) => (p.participants / p.target) >= 1.0);
    } else if (targetFilter === 'below') {
      list = list.filter((p) => (p.participants / p.target) < 1.0);
    }
    list.sort((a, b) => ((a.participants / a.target) - (b.participants / b.target))
      * (attendanceSortOrder === 'asc' ? 1 : -1) || a.name.localeCompare(b.name, 'th'));
    return list;
  }, [displayProjects, targetFilter, attendanceSortOrder]);

  const card1Projects = useMemo(() => {
    return attendanceTopN === 'all' ? filteredAttendanceProjects : filteredAttendanceProjects.slice(0, attendanceTopN);
  }, [filteredAttendanceProjects, attendanceTopN]);

  const card1Names = card1Projects.map((p) => p.name);
  const card1AttRates = card1Projects.map((p) => +((p.participants / p.target) * 100).toFixed(1));

  // Count TQF and Soft Skills coverage across the filtered projects.
  const radarData = useMemo(() => {
    const labels = [
      'TQF 1: ด้านจริยธรรม',
      'TQF 2: ด้านความรู้',
      'TQF 3: ด้านทักษะ',
      'TQF 4: ด้านบุคคล/เทคโนโลยี',
      'Soft 1: การคิดแก้ปัญหา',
      'Soft 2: การบริหารตัวเอง',
      'Soft 3: การทำงานร่วมกับคนอื่น',
      'Soft 4: ด้านเทคโนโลยีสารสนเทศ'
    ];

    const tqf1 = displayProjects.filter(p => p.tqf.includes(1)).length;
    const tqf2 = displayProjects.filter(p => p.tqf.includes(2)).length;
    const tqf3 = displayProjects.filter(p => p.tqf.includes(3)).length;
    const tqf4 = displayProjects.filter(p => p.tqf.includes(4)).length;

    const soft1 = displayProjects.filter(p => p.softSkills.includes(1)).length;
    const soft2 = displayProjects.filter(p => p.softSkills.includes(2)).length;
    const soft3 = displayProjects.filter(p => p.softSkills.includes(3)).length;
    const soft4 = displayProjects.filter(p => p.softSkills.includes(4)).length;

    return {
      labels,
      datasets: [
        {
          label: 'ความครอบคลุมตัวชี้วัด (จำนวนโครงการ)',
          data: [tqf1, tqf2, tqf3, tqf4, soft1, soft2, soft3, soft4],
          borderColor: palette.blue,
          backgroundColor: alpha(palette.blue, 0.12),
          pointBackgroundColor: palette.blue,
        }
      ]
    };
  }, [displayProjects]);

  // Card 3 eval sorted dataset
  const rankedEvalProjects = useMemo(() => {
    const list = displayProjects.filter(project => project.evalRateAvailable !== false && canPlotProject(project, ['respondents']));
    list.sort((a, b) => evalSortOrder === 'desc' ? b.evalRate - a.evalRate : a.evalRate - b.evalRate);
    return list;
  }, [displayProjects, evalSortOrder]);

  const displayEvalSorted = useMemo(() => {
    return evalTopN === 'all' ? rankedEvalProjects : rankedEvalProjects.slice(0, evalTopN);
  }, [rankedEvalProjects, evalTopN]);

  const handleBarClick = (index: number) => {
    if (card1Projects[index]) {
      setSelectedProject(card1Projects[index]);
    }
  };

  const handleEvalBarClick = (index: number) => {
    if (displayEvalSorted[index]) {
      setSelectedProject(displayEvalSorted[index]);
    }
  };

  // Dynamic KPI Metric
  const achievedTargetPercent = useMemo(() => {
    const valid = displayProjects.filter(p => p.target > 0);
    if (valid.length === 0) return 0;
    const achieved = valid.filter(p => p.participants >= p.target).length;
    return Math.round((achieved / valid.length) * 100);
  }, [displayProjects]);


  const avgEvalVal = useMemo(() => {
    return calculateQualitySummary(displayProjects).avgEvalRate;
  }, [displayProjects]);

  if (loading) {
    return (
      <>
        <Topbar title="การเข้าร่วม & เป้าหมาย" subtitle="กำลังเชื่อมต่อและโหลดข้อมูลโครงการ..." />
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
      <Topbar
        exportProjects={displayProjects}
        title="การเข้าร่วม & เป้าหมาย"
        subtitle={`วิเคราะห์ประสิทธิภาพการเข้าถึงนิสิตและการตอบแบบสอบถามรายโครงการ ปีการศึกษา ${academicYear === 'all' ? 'ทุกปี' : academicYear}`}
      />
      <div className={layoutStyles.content}>

        <div className={layoutStyles.kpiRow}>
          <KpiCard label="เข้าร่วมสูงสุด (vs เป้า)" value={maxAttProjectVal} sub={maxAttProjectName} color="emerald" />
          <KpiCard label="เข้าร่วมต่ำสุด (ควรติดตาม)" value={minAttProjectVal} sub={minAttProjectName} color="rose" />
          <KpiCard label="ร้อยละโครงการบรรลุเป้า" value={`${achievedTargetPercent}%`} sub={`${displayProjects.filter(p => p.target > 0 && p.participants >= p.target).length} จาก ${displayProjects.filter(p => p.target > 0).length} โครงการที่มีเป้าหมาย`} color="blue" />
          <KpiCard label="ตอบกลับแบบประเมินสูงสุด" value={maxEvalProjVal} sub={maxEvalProjName} color="purple" />
          <KpiCard label="อัตราตอบแบบประเมินรวม" value={displayProjects.some(p => p.evalRateAvailable !== false) ? `${avgEvalVal.toFixed(1)}%` : 'ไม่มีข้อมูล'} sub={'ตามขอบเขตที่มีผลประเมิน'} color="teal" />
        </div>

        {/* Smart Data Filter Bar */}
        <ChartFilterBar
          selectedCategory={category}
          onCategoryChange={setCategory}
          categoryOptions={categoryOptions}
          totalCount={projectsList.length}
          filteredCount={displayProjects.length}
        />

        <div className={layoutStyles.grid2}>
          {/* Attendance vs target */}
          <ChartCard
            title="อัตราการเข้าร่วมเทียบกับเป้าหมาย (%)"
            badge={`แสดง ${card1Projects.length} โครงการ`}
            controlsBelowTitle
            coverage={projectCoverage(displayProjects, ['participants', 'target'], ['target'])}
            subtitle="สัดส่วนร้อยละของผู้เข้าร่วมจริงเปรียบเทียบกับเป้าหมายโครงการ"
            height={getRankingChartHeight(card1Projects.length, attendanceTopN, { baseHeight: 400 })}
            controls={
              <>
              <ChartControlGroup
                label="เป้าหมาย:"
                options={[
                  { value: 'all', label: 'ทั้งหมด' },
                  { value: 'achieved', label: 'บรรลุเป้า ≥100%' },
                  { value: 'below', label: 'ต่ำกว่าเป้า <100%' },
                ]}
                value={targetFilter}
                onChange={setTargetFilter}
              />
              <ChartListControls
                direction={attendanceSortOrder}
                onDirectionChange={setAttendanceSortOrder}
                limit={attendanceTopN}
                onLimitChange={setAttendanceTopN}
                totalCount={filteredAttendanceProjects.length}
              />
              </>
            }
            tableContent={<DataTable projects={card1Projects} rateType="attendance" onRowClick={setSelectedProject} />}
          >
            <HBarChart
              labels={card1Names}
              datasets={[{
                label: 'อัตราเข้าร่วม (%)',
                data: card1AttRates,
                backgroundColor: card1AttRates.map(rate => alpha(percentageBandColor(rate), 0.88)),
                borderColor: card1AttRates.map(rate => percentageBandColor(rate)),
              }]}
              xMax={Math.max(130, ...card1AttRates.map(value => Math.ceil(value / 20) * 20))}
              referenceLines={[{ value: 100, label: 'เป้าหมาย 100%', color: palette.slate }]}
              showDatalabels
              datalabelCallback={(v) => `${Number(v).toFixed(1)}%`}
              onProjectClick={handleBarClick}
            />
          </ChartCard>

          {/* CoreRadar covering TQF and Soft Skills */}
          <ChartCard
            title="ความสอดคล้องกรอบหลักสูตร TQF & ทักษะการทำกิจกรรม"
            subtitle="การประเมินความครอบคลุมกรอบมาตรฐาน TQF 1-4 และ Soft Skills 1-4 ของภาควิชา"
            height={280}
            fillHeight
          >
            <RadarChart
              labels={radarData.labels}
              datasets={radarData.datasets}
              min={0}
            />
          </ChartCard>
        </div>

        {/* Eval rate */}
        <div className={layoutStyles.grid1}>
          <ChartCard
            title="อัตราผู้ตอบแบบประเมินโครงการจริง (%)"
            badge={`แสดง ${displayEvalSorted.length} โครงการ`}
            controlsBelowTitle
            coverage={{ available: rankedEvalProjects.length, total: displayProjects.length }}
            subtitle="ยอดผู้ตอบหารยอดผู้มีสิทธิ์ตอบ เฉพาะวันหรือขอบเขตที่มีผลประเมิน"
            controls={
              <ChartListControls
                direction={evalSortOrder}
                onDirectionChange={setEvalSortOrder}
                limit={evalTopN}
                onLimitChange={setEvalTopN}
                totalCount={rankedEvalProjects.length}
              />
            }
            tableContent={<DataTable projects={displayEvalSorted} rateType="eval" onRowClick={setSelectedProject} />}
            height={evalTopN === 'all' || displayEvalSorted.length > 12 ? 460 : 420}
          >
            <BarChart
              labels={displayEvalSorted.map((p) => p.name)}
              datasets={[{
                label: 'อัตราตอบแบบประเมิน (%)',
                data: displayEvalSorted.map((p) => p.evalRate),
                backgroundColor: displayEvalSorted.map(p => alpha(percentageBandColor(p.evalRate), 0.88)),
                borderColor: displayEvalSorted.map(p => percentageBandColor(p.evalRate)),
              }]}
              yMin={0}
              yMax={100}
              yCallback={(v) => `${v}%`}
              showDatalabels
              datalabelCallback={v => `${Number(v).toFixed(1)}%`}
              onProjectClick={handleEvalBarClick}
              wrapCategoryLabels
            />
          </ChartCard>
        </div>

        {/* Interactive Detail Modal */}
        <ProjectDetailModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />

      </div>
    </>
  );
}
