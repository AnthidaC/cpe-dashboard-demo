'use client';
import { matchesResponsible } from '@/lib/reportUtils';
// app/g3/page.tsx — กลุ่มที่ 3: Quality & Results (Strategic Subcategory Performance & Academic KPIs)

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
import { ChartControlGroup, ChartControlSelect } from '@/components/ChartControlGroup';
import ProjectDetailModal from '@/components/ProjectDetailModal';
import { getProjects } from '@/lib/db/dataService';
import { Project, calculateQualitySummary, getSoftSkillStats } from '@/lib/mockData';
import { alpha, palette, chartColors, percentageBandColor } from '@/lib/chartHelpers';
import { getRankingChartHeight } from '@/lib/chartLayout';
import layoutStyles from '@/app/layout.module.css';
import { useFilters } from '@/lib/FilterContext';
import { educationStrategyLabel } from '@/lib/strategyLabels';

const strategiesList = [1, 2, 3];
const strategiesShort = strategiesList.map(educationStrategyLabel);

export default function G3Page() {
  const [projectsData, setProjectsData] = useState<{ projects: Project[]; isLive: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const [category, setCategory] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Per-chart tailored states
  const [satFilter, setSatFilter] = useState<'all' | 'high' | 'normal'>('all');
  const [satDirection, setSatDirection] = useState<'asc' | 'desc'>('asc');
  const [satLimit, setSatLimit] = useState<number | 'all'>(10);
  const [strategyCostSort, setStrategyCostSort] = useState<'cost' | 'strategy'>('cost');
  const [strategyCostDirection, setStrategyCostDirection] = useState<'asc' | 'desc'>('asc');
  const [engagementMetric, setEngagementMetric] = useState<'participants' | 'hours' | 'count'>('participants');

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

  // Lecturer filtered list
  const categoryOptions = lecturerOptions(projectsData?.projects ?? []);

  const displayProjects = useMemo(() => {
    let filtered = [...projectsList];
    if (category !== 'all') {
      filtered = filtered.filter((p) => matchesResponsible(p, category));
    }
    return filtered;
  }, [category, projectsList]);

  // Dynamic metrics
  const qualitySum = useMemo(() => calculateQualitySummary(displayProjects), [displayProjects]);
  
  const evaluatedProjects = useMemo(() => {
    return displayProjects.filter(p => canPlotProject(p, ['satisfaction']));
  }, [displayProjects]);

  const topSatProject = useMemo(() => {
    if (evaluatedProjects.length === 0) return null;
    const sorted = [...evaluatedProjects].sort((a, b) => b.satisfaction - a.satisfaction);
    return sorted[0];
  }, [evaluatedProjects]);

  const topSatScore = topSatProject && topSatProject.satisfaction > 0 ? topSatProject.satisfaction.toFixed(2) : '-';
  const topSatName = topSatProject ? topSatProject.name : 'ไม่มีข้อมูลผลประเมิน';

  const totalHoursSum = useMemo(() => displayProjects.reduce((s, p) => s + p.hours, 0), [displayProjects]);

  const strategyStats = useMemo(() => {
    return strategiesList.map((s) => {
      const projs = displayProjects.filter((p) => p.strategySubs.includes(s));
      const satProjs = projs.filter((p) => p.satisfaction > 0);
      
      const avgSat = satProjs.length > 0
        ? satProjs.reduce((sum, p) => sum + p.satisfaction, 0) / satProjs.length
        : 0;
      
      const totalBudget = projs.reduce((sum, p) => sum + p.budget, 0);
      const totalActual = projs.reduce((sum, p) => sum + p.actual, 0);
      const totalHours = projs.reduce((sum, p) => sum + p.hours, 0);
      const totalParticipants = projs.reduce((sum, p) => sum + p.participants, 0);

      return {
        strategy: s,
        avgSat,
        count: projs.length,
        budget: totalBudget,
        actual: totalActual,
        hours: totalHours,
        participants: totalParticipants,
      };
    });
  }, [displayProjects]);

  // ── 1. Strategy Budget Execution Datasets (Approved vs Actual) ──
  const strategyBudgetDatasets = useMemo(() => {
    const spent = { label: 'ใช้จริงในวงเงิน (บาท)', data: strategyStats.map(s => Math.min(s.actual, s.budget)), backgroundColor: alpha(chartColors.budget, 0.88), borderColor: chartColors.budget };
    const remaining = { label: 'งบคงเหลือ (บาท)', data: strategyStats.map(s => Math.max(0, s.budget - s.actual)), backgroundColor: chartColors.remainingBudget, borderColor: '#94A3B8' };
    const excess = { label: 'ใช้เกินงบอนุมัติ (บาท)', data: strategyStats.map(s => Math.max(0, s.actual - s.budget)), backgroundColor: alpha(palette.rose, 0.88), borderColor: palette.rose };
    return excess.data.some(value => value > 0) ? [spent, remaining, excess] : [spent, remaining];
  }, [strategyStats]);

  const strategyCostRows = useMemo(() => {
    const rows = strategyStats.map(stat => ({
      strategy: stat.strategy,
      label: educationStrategyLabel(stat.strategy),
      cost: stat.participants > 0 ? Math.round(stat.actual / stat.participants) : null,
      actual: stat.actual,
      participants: stat.participants,
      count: stat.count,
    }));
    const dir = strategyCostDirection === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      if (strategyCostSort === 'strategy') {
        return (a.strategy - b.strategy) * dir;
      }
      if (a.cost === null && b.cost === null) return a.strategy - b.strategy;
      if (a.cost === null) return 1;
      if (b.cost === null) return -1;
      return (a.cost - b.cost) * dir || a.strategy - b.strategy;
    });
    return rows;
  }, [strategyStats, strategyCostSort, strategyCostDirection]);

  const softSkillStats = useMemo(() => getSoftSkillStats(displayProjects), [displayProjects]);
  const sortedSoftCosts = [...softSkillStats].sort((a, b) => (a.costPerHead ?? Infinity) - (b.costPerHead ?? Infinity));

  // Card 1 satisfaction dataset filter (only show projects with satisfaction > 0)
  const filteredSatProjects = useMemo(() => {
    let list = displayProjects.filter(p => canPlotProject(p, ['satisfaction']));
    list.sort((a, b) => (a.satisfaction - b.satisfaction) * (satDirection === 'asc' ? 1 : -1) || a.name.localeCompare(b.name, 'th'));
    if (satFilter === 'high') {
      list = list.filter((p) => p.satisfaction >= 4.5);
    } else if (satFilter === 'normal') {
      list = list.filter((p) => p.satisfaction < 4.5);
    }
    return list;
  }, [displayProjects, satFilter, satDirection]);

  const displaySatSorted = useMemo(() => {
    return satLimit === 'all' ? filteredSatProjects : filteredSatProjects.slice(0, satLimit);
  }, [filteredSatProjects, satLimit]);

  const handleSatClick = (index: number) => {
    if (displaySatSorted[index]) {
      setSelectedProject(displaySatSorted[index]);
    }
  };

  if (loading) {
    return (
      <>
        <Topbar title="คุณภาพ & ผลสัมฤทธิ์" subtitle="กำลังเชื่อมต่อและโหลดข้อมูลโครงการ..." />
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
        title="คุณภาพ & ผลสัมฤทธิ์"
        subtitle={`การวิเคราะห์คะแนนความพึงพอใจและสถิติด้านคุณภาพจำแนกตามรายแผนยุทธศาสตร์ย่อย ปีการศึกษา ${academicYear === 'all' ? 'ทุกปี' : academicYear}`}
      />
      <div className={layoutStyles.content}>

        <div className={layoutStyles.kpiRow}>
          <KpiCard label="ความพึงพอใจสูงสุด" value={topSatScore} sub={topSatName} color="purple" />
          <KpiCard
            label="ความพึงพอใจรวมเฉลี่ย"
            value={qualitySum.avgSatisfaction > 0 ? qualitySum.avgSatisfaction.toFixed(2) : '-'}
            sub={qualitySum.avgSatisfaction > 0 ? 'เฉลี่ยโครงการที่มีผลประเมิน' : 'ยังไม่มีผลประเมิน'}
            color="blue"
          />
          <KpiCard label="ชั่วโมงจัดกิจกรรมรวม" value={`${totalHoursSum.toFixed(1)}`} sub="ชั่วโมงจัดงานรวมของภาควิชา" color="amber" />
          <KpiCard label="อัตราการประเมินโครงการ" value={`${(displayProjects.length > 0 ? (evaluatedProjects.length / displayProjects.length) * 100 : 0).toFixed(0)}%`} sub={`${evaluatedProjects.length} จาก ${displayProjects.length} โครงการ`} color="emerald" />
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
          <ChartCard
            title="อันดับคะแนนความพึงพอใจรายโครงการ (ร้อยละ)"
            badge={`แสดง ${displaySatSorted.length} โครงการ`}
            controlsBelowTitle
            coverage={projectCoverage(displayProjects, ['satisfaction'])}
            subtitle="ผลคะแนนเฉลี่ยความพึงพอใจนิสิตเทียบเป็นร้อยละ"
            height={getRankingChartHeight(displaySatSorted.length, satLimit, { baseHeight: 380 })}
            controls={
              <>
              <ChartControlGroup
                label="ระดับคะแนน:"
                options={[
                  { value: 'all', label: 'ทั้งหมด' },
                  { value: 'high', label: 'พึงพอใจดีมาก ≥90%' },
                  { value: 'normal', label: 'พึงพอใจทั่วไป <90%' },
                ]}
                value={satFilter}
                onChange={setSatFilter}
              />
              <ChartListControls
                direction={satDirection}
                onDirectionChange={setSatDirection}
                limit={satLimit}
                onLimitChange={setSatLimit}
                totalCount={filteredSatProjects.length}
              />
              </>
            }
            tableContent={<DataTable projects={displaySatSorted} rateType="satisfaction" onRowClick={setSelectedProject} />}
          >
            <HBarChart
              labels={displaySatSorted.map((p) => p.name)}
              datasets={[{
                label: 'คะแนนความพึงพอใจ (%)',
                data: displaySatSorted.map((p) => +(p.satisfaction * 20).toFixed(1)),
                backgroundColor: displaySatSorted.map(p => alpha(percentageBandColor(p.satisfaction * 20), 0.88)),
                borderColor: displaySatSorted.map(p => percentageBandColor(p.satisfaction * 20)),
              }]}
              xMin={0}
              xMax={100}
              referenceLines={[{ value: 90, label: 'เกณฑ์ดีมาก 90%', color: palette.emerald }]}
              showDatalabels
              datalabelCallback={(v) => `${Number(v).toFixed(1)}%`}
              onProjectClick={handleSatClick}
            />
          </ChartCard>

          <ChartCard
            title="ต้นทุนเฉลี่ยต่อผู้เข้าร่วมรายยุทธศาสตร์"
            badge={`${strategyCostRows.filter(r => r.cost !== null).length} ยุทธศาสตร์`}
            controlsBelowTitle
            subtitle="งบใช้จริงหารด้วยผู้เข้าร่วมสะสม · โครงการหนึ่งอยู่ได้หลายยุทธศาสตร์"
            height={248}
            fillHeight
            controls={
              <>
                <ChartControlSelect<'cost' | 'strategy'>
                  label="เรียงตาม:"
                  value={strategyCostSort}
                  onChange={setStrategyCostSort}
                  options={[
                    { value: 'cost', label: 'ต้นทุนต่อคน (บาท/คน)' },
                    { value: 'strategy', label: 'หมายเลขยุทธศาสตร์ (1–3)' },
                  ]}
                />
                <ChartControlSelect<'asc' | 'desc'>
                  label="ลำดับ:"
                  value={strategyCostDirection}
                  onChange={setStrategyCostDirection}
                  options={[
                    { value: 'asc', label: 'น้อย → มาก' },
                    { value: 'desc', label: 'มาก → น้อย' },
                  ]}
                />
              </>
            }
          >
            <HBarChart
              labels={strategyCostRows.map(row => row.label)}
              datasets={[{
                label: 'ต้นทุนเฉลี่ย (บาท/คน)',
                data: strategyCostRows.map(row => row.cost),
                backgroundColor: alpha(chartColors.costPerPerson, 0.88),
                borderColor: chartColors.costPerPerson,
              }]}
              xMin={0}
              xCallback={value => '฿' + value.toLocaleString()}
              showDatalabels
              datalabelCallback={value => '฿' + value.toLocaleString() + '/คน'}
              tooltipLabelCallback={(value, _datasetIndex, dataIndex) => {
                const row = strategyCostRows[dataIndex];
                if (!row) return `฿${value.toLocaleString()}/คน`;
                return [
                  `ต้นทุนเฉลี่ย: ฿${value.toLocaleString()}/คน`,
                  `งบใช้จริงรวม: ฿${row.actual.toLocaleString()} (${row.count} โครงการ)`,
                  `ผู้เข้าร่วมสะสม: ${row.participants.toLocaleString()} คน-ครั้ง`,
                ];
              }}
            />
          </ChartCard>
        </div>

        <div className={layoutStyles.grid2}>
          <ChartCard title="ต้นทุนเฉลี่ยต่อผู้เข้าร่วมจำแนกตาม Soft Skills" subtitle="งบใช้จริงหารด้วยผู้เข้าร่วมสะสมของโครงการที่สนับสนุนแต่ละทักษะ" height={340}>
            <HBarChart labels={sortedSoftCosts.map(skill => skill.name)} datasets={[{label: 'ต้นทุนเฉลี่ย (บาท/คน)', data: sortedSoftCosts.map(skill => skill.costPerHead), backgroundColor: alpha(chartColors.costPerPerson, 0.8)}]} xMin={0} xCallback={value => '฿' + value.toLocaleString()} showDatalabels datalabelCallback={value => '฿' + value.toLocaleString() + '/คน'} />
          </ChartCard>
          <ChartCard title="ความพึงพอใจของโครงการจำแนกตาม Soft Skills" subtitle="คะแนนความพึงพอใจเฉลี่ยของโครงการที่มีผลประเมิน แยกตามทักษะที่สนับสนุน" height={340}>
            <RadarChart labels={['การคิดและแก้ปัญหา', 'การบริหารตนเอง', 'การทำงานร่วมกัน', 'เทคโนโลยี']} datasets={[{label: 'ความพึงพอใจ (เต็ม 5)', data: softSkillStats.map(skill => skill.score), borderColor: palette.blue, backgroundColor: alpha(palette.blue, 0.12), pointBackgroundColor: softSkillStats.map(skill => skill.score === null ? palette.slate : percentageBandColor(skill.score * 20))}]} min={0} max={5} stepSize={1} />
          </ChartCard>
        </div>

        <div className={layoutStyles.grid2}>
          <ChartCard
            title="การเบิกจ่ายและงบคงเหลือรายยุทธศาสตร์"
            subtitle="แสดงงบใช้จริง งบคงเหลือ และส่วนที่ใช้เกินวงเงินอนุมัติ (ถ้ามี)"
            height={320}
          >
            <HBarChart
              labels={strategiesShort}
              datasets={strategyBudgetDatasets}
              stacked
              xMin={0}
              xCallback={value => `฿${(value / 1000).toLocaleString()}K`}
              showLegend
              showDatalabels
              datalabelDisplay={(datasetIndex, index) => {
                const last = strategyBudgetDatasets.reduce((found, dataset, i) => dataset.data[index] > 0 ? i : found, 0);
                return datasetIndex === last;
              }}
              datalabelCallback={(_value, _datasetIndex, index) => {
                const stat = strategyStats[index];
                return stat.budget > 0 ? `฿${(stat.budget / 1000).toFixed(0)}K (${Math.round(stat.actual / stat.budget * 100)}%)` : 'ไม่มีงบอนุมัติ';
              }}
              customPadding={{ right: 130 }}
            />
          </ChartCard>

          <ChartCard
            title="กิจกรรมและการเข้าร่วมรายยุทธศาสตร์"
            subtitle="แสดงจำนวนโครงการ ผู้เข้าร่วมสะสม หรือชั่วโมงจัดกิจกรรมรายยุทธศาสตร์"
            height={320}
            controls={
              <ChartControlGroup
                label="ตัวชี้วัด:"
                options={[
                  { value: 'participants', label: 'ผู้เข้าร่วม (คน)' },
                  { value: 'hours', label: 'ชั่วโมง (ชม.)' },
                  { value: 'count', label: 'จำนวนโครงการ' },
                ]}
                value={engagementMetric}
                onChange={setEngagementMetric}
              />
            }
          >
            <BarChart
              labels={strategiesShort}
              datasets={[{
                label: engagementMetric === 'participants' ? 'ผู้เข้าร่วมสะสม (คน-ครั้ง)' : engagementMetric === 'hours' ? 'ชั่วโมงจัดกิจกรรม (ชม.)' : 'จำนวนโครงการ',
                data: strategyStats.map(stat => engagementMetric === 'participants' ? stat.participants : engagementMetric === 'hours' ? stat.hours : stat.count),
                backgroundColor: alpha(engagementMetric === 'participants' ? chartColors.participants : engagementMetric === 'hours' ? chartColors.hours : chartColors.projectCount, 0.88),
              }]}
              yMin={0}
              wrapCategoryLabels
              showDatalabels
              datalabelCallback={value => `${value.toLocaleString()} ${engagementMetric === 'participants' ? 'คน-ครั้ง' : engagementMetric === 'hours' ? 'ชม.' : 'โครงการ'}`}
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
