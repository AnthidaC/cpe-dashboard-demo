'use client';
import { matchesResponsible } from '@/lib/reportUtils';
// app/g1/page.tsx — กลุ่มที่ 1: Performance & Budget Efficiency (Clean Excel Mappings & Academic KPIs)

import { useState, useMemo, useEffect } from 'react';
import { lecturerOptions } from '@/lib/reportUtils';
import { cumulativeAcademicActivities, type ActivityPeriod } from '@/lib/academicActivities';
import LoadError from '@/components/LoadError';
import Topbar from '@/components/Topbar';
import KpiCard from '@/components/KpiCard';
import ChartCard from '@/components/ChartCard';
import ChartListControls from '@/components/ChartListControls';
import HBarChart from '@/components/charts/HBarChart';
import BarChart from '@/components/charts/BarChart';
import BubbleChart, { BubbleDataset } from '@/components/charts/BubbleChart';
import DataTable from '@/components/DataTable';
import { canPlotProject, projectCoverage } from '@/lib/projectAvailability';
import ChartFilterBar from '@/components/ChartFilterBar';
import { ChartControlGroup, ChartControlSelect } from '@/components/ChartControlGroup';

import ProjectDetailModal from '@/components/ProjectDetailModal';
import { getProjects } from '@/lib/db/dataService';
import {
  Project,
  kuColorMap,
  KUIdentity,
  calculateGroup1Metrics,
} from '@/lib/mockData';
import { alpha, palette, chartColors } from '@/lib/chartHelpers';
import { getRankingChartHeight } from '@/lib/chartLayout';
import layoutStyles from '@/app/layout.module.css';
import { useFilters } from '@/lib/FilterContext';
import { getLinearChartScale } from '@/lib/chartScales';

// Distinct IDKU Color Palette for crisp non-clashing visual hierarchy
const kuColorPalette = kuColorMap;

type SortDirection = 'asc' | 'desc';
type BudgetSortMetric = 'utilization' | 'actual' | 'budget' | 'remaining';
const budgetSortValue = (project: Project, metric: BudgetSortMetric) => {
  if (metric === 'utilization') return project.budget > 0 ? project.actual / project.budget * 100 : 0;
  if (metric === 'remaining') return Math.max(0, project.budget - project.actual);
  return project[metric];
};
const budgetMetricLabels: Record<BudgetSortMetric, string> = {
  utilization: 'อัตราใช้จ่าย (%)',
  actual: 'ใช้จริง (บาท)',
  budget: 'งบอนุมัติ (บาท)',
  remaining: 'งบคงเหลือ (บาท)',
};
const engagementRate = (project: Project) => project.actual > 0
  ? project.hours * project.participants * 1000 / project.actual : 0;

const getShortProjectName = (name: string): string => {
  if (name.includes('ปฐมนิเทศ')) return 'ปฐมนิเทศ';
  if (name.includes('อาจารย์ที่ปรึกษา')) return 'อ.ที่ปรึกษา';
  if (name.includes('พัฒนาศักยภาพนิสิต')) return 'พัฒนาศักยภาพ';
  if (name.includes('แบ่งปัน')) return 'วิศวคอมสู่สังคม';
  if (name.includes('ไซเบอร์')) return 'ความปลอดภัยไซเบอร์';
  if (name.includes('สู่สากล')) return 'ศักยภาพสู่สากล';
  if (name.includes('หุ่นยนต์')) return 'หุ่นยนต์';
  return name.slice(0, 10);
};

export default function G1Page() {
  const [projectsData, setProjectsData] = useState<{ projects: Project[]; isLive: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Global filter state
  const [category, setCategory] = useState<string>('all');

  // Per-card tailored states
  const [card1TopN, setCard1TopN] = useState<number | 'all'>(10);
  const [engagementTopN, setEngagementTopN] = useState<number | 'all'>(10);
  const [budgetSortMetric, setBudgetSortMetric] = useState<BudgetSortMetric>('utilization');
  const [budgetSortDirection, setBudgetSortDirection] = useState<SortDirection>('asc');
  const [engagementSortDirection, setEngagementSortDirection] = useState<SortDirection>('asc');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activityPeriod, setActivityPeriod] = useState<ActivityPeriod>('quarter');
  const [scatterScaleMode, setScatterScaleMode] = useState<'auto' | 'zero'>('auto');

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
    filtered.sort((a, b) => b.actual - a.actual);
    return filtered;
  }, [category, projectsList]);

  // Dynamic metrics calculation
  const g1Metrics = useMemo(() => calculateGroup1Metrics(displayProjects), [displayProjects]);
  const {
    totalBudget,
    totalActual,
    budgetUtilization,
    avgCostPerParticipant,
    minCostProject,
    maxCostProject,
  } = g1Metrics;

  const minCostVal = minCostProject ? (minCostProject.participants > 0 ? Math.round(minCostProject.actual / minCostProject.participants) : 0) : 0;
  const minCostName = minCostProject ? minCostProject.name : 'ไม่มีข้อมูล';
  const maxCostVal = maxCostProject ? (maxCostProject.participants > 0 ? Math.round(maxCostProject.actual / maxCostProject.participants) : 0) : 0;
  const maxCostName = maxCostProject ? maxCostProject.name : 'ไม่มีข้อมูล';


  // Card 1 dataset: Top N limited
  const rankedBudgetProjects = useMemo(() => {
    return displayProjects
      .filter(p => canPlotProject(p, ['budget', 'actual'], budgetSortMetric === 'utilization' ? ['budget'] : []))
      .sort((a, b) => (budgetSortValue(a, budgetSortMetric) - budgetSortValue(b, budgetSortMetric))
        * (budgetSortDirection === 'asc' ? 1 : -1) || a.name.localeCompare(b.name, 'th'));
  }, [displayProjects, budgetSortMetric, budgetSortDirection]);

  const card1Projects = useMemo(() => {
    return card1TopN === 'all' ? rankedBudgetProjects : rankedBudgetProjects.slice(0, card1TopN);
  }, [rankedBudgetProjects, card1TopN]);

  const rankedEngagementProjects = useMemo(() => displayProjects
    .filter(p => canPlotProject(p, ['hours', 'participants', 'actual'], ['actual']))
    .sort((a, b) => (engagementRate(a) - engagementRate(b))
      * (engagementSortDirection === 'asc' ? 1 : -1) || a.name.localeCompare(b.name, 'th')),
  [displayProjects, engagementSortDirection]);
  const engagementProjects = engagementTopN === 'all' ? rankedEngagementProjects : rankedEngagementProjects.slice(0, engagementTopN);

  // Scatter Datasets: Exclude Project 8 from scatter plots because it has no evaluation (N/A satisfaction)
  // Grouping by KU Identity for bubble chart visualization
  const bubbleDatasets: BubbleDataset[] = useMemo(() => {
    const evaluatedProjects = displayProjects.filter(p => canPlotProject(p, ['satisfaction', 'participants', 'actual'], ['participants']));
    const groups = ['I', 'D', 'K', 'U'] as KUIdentity[];
    
    return groups.map((g) => {
      const projs = evaluatedProjects.filter((p) => p.ku === g);
      const color = kuColorPalette[g] ?? palette.blue;
      return {
        label: `อัตลักษณ์ ${g}`,
        data: projs.map((p) => {
          const cost = p.participants > 0 ? Math.round(p.actual / p.participants) : 0;
          return {
            x: cost,
            y: p.satisfaction,
            r: Math.max(9, Math.min(26, Math.round(Math.sqrt(p.participants) * 1.55))),
            name: p.name,
            shortName: getShortProjectName(p.name),
            satisfaction: p.satisfaction,
            costPerHead: cost,
            participants: p.participants,
            budget: p.actual,
          };
        }),
        backgroundColor: alpha(color, 0.65),
        borderColor: color,
      };
    }).filter(ds => ds.data.length > 0);
  }, [displayProjects]);

  const bubblePoints = bubbleDatasets.flatMap(ds => ds.data);
  const costScale = getLinearChartScale(bubblePoints.map(point => point.x), {
    minSpan: Math.max(100, ...bubblePoints.map(point => point.x * 0.2)),
    lowerBound: 0,
    fallback: { min: 0, max: 2000, step: 500 },
  });
  const scoreScale = getLinearChartScale(bubblePoints.map(point => point.y), {
    minSpan: 0.8,
    lowerBound: 0,
    upperBound: 5,
    fallback: { min: 0, max: 5, step: 1 },
  });

  const activityPeriodLabel = activityPeriod === 'month' ? 'รายเดือน' : activityPeriod === 'year' ? 'รายปีการศึกษา' : 'รายไตรมาส';
  const activityBucketLabel = activityPeriod === 'month' ? 'เดือน' : activityPeriod === 'year' ? 'ปีการศึกษา' : 'ไตรมาส';

  const activityChartData = useMemo(() => {
    const { labels, newCounts, countsByGroup } = cumulativeAcademicActivities(displayProjects, activityPeriod);
    return {
      labels,
      newCounts,
      datasets: (['I', 'D', 'K', 'U'] as KUIdentity[]).map(g => ({
        label: `อัตลักษณ์ ${g}`,
        data: countsByGroup[g],
        backgroundColor: kuColorPalette[g] ?? palette.blue,
        borderColor: kuColorPalette[g] ?? palette.blue,
        borderRadius: 4,
      })),
    };
  }, [displayProjects, activityPeriod]);

  const handleBarClick1 = (index: number) => {
    if (card1Projects[index]) setSelectedProject(card1Projects[index]);
  };

  const handleBubbleClick = (datasetIdx: number, itemIdx: number) => {
    const targetDataset = bubbleDatasets[datasetIdx];
    if (!targetDataset) return;
    const targetPoint = targetDataset.data[itemIdx];
    if (!targetPoint) return;
    const found = projectsList.find((p) => p.name === targetPoint.name);
    if (found) setSelectedProject(found);
  };

  if (loading) {
    return (
      <>
        <Topbar title="ประสิทธิภาพ & งบประมาณ" subtitle="กำลังเชื่อมต่อและโหลดข้อมูลโครงการ..." />
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
        title="ประสิทธิภาพ & งบประมาณ"
        subtitle={`การเบิกจ่ายงบประมาณและวิเคราะห์ต้นทุนโครงการเชิงเปรียบเทียบ ปีการศึกษา ${academicYear === 'all' ? 'ทุกปี' : academicYear}`}
      />
      <div className={layoutStyles.content}>

        <div className={layoutStyles.kpiRow}>
          <KpiCard
            label="อัตราใช้งบประมาณเฉลี่ย"
            value={totalBudget > 0 ? `${budgetUtilization.toFixed(1)}%` : '—'}
            sub={`ใช้จริง ฿${totalActual.toLocaleString()} / ฿${totalBudget.toLocaleString()}`}
            color="amber"
            trend={totalBudget > 0 ? budgetUtilization >= 80 ? 'ถึงเกณฑ์ใช้จ่าย ≥80%' : 'ยังต่ำกว่าเกณฑ์ใช้จ่าย 80%' : undefined}
            trendDir={budgetUtilization >= 80 ? 'up' : 'down'}
          />
          <KpiCard
            label="ต้นทุนต่อหัวนิสิต (เฉลี่ย)"
            value={`฿${avgCostPerParticipant.toLocaleString()}`}
            sub="คำนวณจากทุกผู้เข้าร่วมจริง"
            color="blue"
          />
          <KpiCard
            label="ต้นทุนต่อหัวประหยัดสุด"
            value={`฿${minCostVal.toLocaleString()}`}
            sub={minCostName}
            color="emerald"
          />
          <KpiCard
            label="ต้นทุนต่อหัวสูงที่สุด"
            value={`฿${maxCostVal.toLocaleString()}`}
            sub={maxCostName}
            color="rose"
          />
        </div>

        {/* Global Smart Data Filter Bar */}
        <ChartFilterBar
          selectedCategory={category}
          onCategoryChange={setCategory}
          categoryOptions={categoryOptions}
          totalCount={projectsList.length}
          filteredCount={displayProjects.length}
        />

        {/* Chart row 1 */}
        <div className={layoutStyles.grid2}>
          {/* Q1: Budget Utilization per project */}
          <ChartCard
            title="อัตราการใช้งบประมาณต่อโครงการ"
            badge={`แสดง ${card1Projects.length} โครงการ`}
            controlsBelowTitle
            coverage={projectCoverage(displayProjects, ['budget', 'actual'], budgetSortMetric === 'utilization' ? ['budget'] : [])}
            subtitle={`ใช้จริงเทียบงบอนุมัติ (${budgetSortMetric === 'utilization' ? '%' : 'บาท'}) · เรียงตาม${budgetMetricLabels[budgetSortMetric]}`}
            height={getRankingChartHeight(card1Projects.length, card1TopN, { baseHeight: 400 })}
            controls={
              <>
              <ChartControlSelect<BudgetSortMetric>
                label="เรียงตาม:"
                options={[
                  { value: 'utilization', label: 'อัตราใช้จ่าย (%)' },
                  { value: 'actual', label: 'ใช้จริง (บาท)' },
                  { value: 'budget', label: 'งบอนุมัติ (บาท)' },
                  { value: 'remaining', label: 'งบคงเหลือ (บาท)' },
                ]}
                value={budgetSortMetric}
                onChange={setBudgetSortMetric}
              />
              <ChartListControls
                direction={budgetSortDirection}
                onDirectionChange={setBudgetSortDirection}
                limit={card1TopN}
                onLimitChange={setCard1TopN}
                totalCount={rankedBudgetProjects.length}
              />
              </>
            }
            tableContent={<DataTable projects={card1Projects} onRowClick={setSelectedProject} />}
          >
            <HBarChart
              key={budgetSortMetric}
              labels={card1Projects.map((p) => p.name)}
              stacked
              datasets={[{
                label: budgetSortMetric === 'utilization' ? 'ใช้จริง (%)' : 'ใช้จริง (บาท)',
                data: card1Projects.map(p => budgetSortMetric === 'utilization' ? budgetSortValue(p, 'utilization') : p.actual),
                backgroundColor: alpha(chartColors.budget, 0.88),
                borderColor: chartColors.budget,
              }, {
                label: budgetSortMetric === 'utilization' ? 'งบคงเหลือ (%)' : 'งบคงเหลือ (บาท)',
                data: card1Projects.map(p => budgetSortMetric === 'utilization'
                  ? Math.max(0, 100 - budgetSortValue(p, 'utilization'))
                  : Math.max(0, p.budget - p.actual)),
                backgroundColor: '#E2E8F0',
                borderColor: '#CBD5E1',
              }]}
              xMin={0}
              xMax={budgetSortMetric === 'utilization' ? 100 : undefined}
              xCallback={(v) => budgetSortMetric === 'utilization' ? `${v}%` : `฿${v.toLocaleString()}`}
              showDatalabels={true}
              datalabelDisplay={datasetIndex => datasetIndex === 1}
              datalabelCallback={(_v, _datasetIndex, dataIndex) => { const proj = card1Projects[dataIndex]; const val = proj ? (budgetSortMetric === 'utilization' ? budgetSortValue(proj, 'utilization') : proj.actual) : 0; return budgetSortMetric === 'utilization'
                ? `${val.toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
                : `฿${val.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`; }}
              tooltipLabelCallback={(v, datasetIndex, dataIndex) => {
                const project = card1Projects[dataIndex];
                return [
                  `${datasetIndex === 0 ? 'ใช้จริง' : 'งบคงเหลือ'}: ${v.toLocaleString('th-TH', { maximumFractionDigits: 1 })}${budgetSortMetric === 'utilization' ? '%' : ' บาท'}`,
                  `ใช้จริง: ${project.actual.toLocaleString()} บาท`,
                  `งบคงเหลือ: ${Math.max(0, project.budget - project.actual).toLocaleString()} บาท`,
                  `งบอนุมัติ: ${project.budget.toLocaleString()} บาท`,
                ];
              }}
              showLegend
              onProjectClick={handleBarClick1}
            />
          </ChartCard>

          {/* Q2-3: Return on Engagement Hours / Budget Spent */}
          <ChartCard
            title="ชั่วโมงการมีส่วนร่วมของนิสิตต่องบประมาณ (Return on Engagement)"
            badge={`แสดง ${engagementProjects.length} โครงการ`}
            controlsBelowTitle
            coverage={projectCoverage(displayProjects, ['hours', 'participants', 'actual'], ['actual'])}
            subtitle="ชั่วโมงกิจกรรมรวมของผู้เข้าร่วมต่อการใช้จ่ายงบประมาณจริงทุก 1,000 บาท"
            height={getRankingChartHeight(engagementProjects.length, engagementTopN, { baseHeight: 400 })}
            controls={
              <ChartListControls
                direction={engagementSortDirection}
                onDirectionChange={setEngagementSortDirection}
                limit={engagementTopN}
                onLimitChange={setEngagementTopN}
                totalCount={rankedEngagementProjects.length}
              />
            }
            tableContent={<DataTable projects={[
              ...engagementProjects,
              ...(engagementTopN === 'all' ? displayProjects.filter(p => !canPlotProject(p, ['hours', 'participants', 'actual'], ['actual'])) : []),
            ]} onRowClick={setSelectedProject} />}
          >
            <HBarChart
              labels={engagementProjects.map((p) => p.name)}
              datasets={[{
                label: 'ชั่วโมงการเรียนรู้ของนิสิต ต่อ งบประมาณ 1,000 บาท (ชม. / พันบาท)',
                data: engagementProjects.map((p) => +engagementRate(p).toFixed(1)),
                backgroundColor: alpha(chartColors.hours, 0.88),
                borderColor: chartColors.hours,
              }]}
              xCallback={(v) => `${v} ชม.`}
              showDatalabels={true}
              datalabelCallback={(v) => v > 0 ? `${Number(v).toFixed(1)} ชม.` : '0 ชม. (โครงการกรรมการ)'}
              showLegend
              onProjectClick={index => setSelectedProject(engagementProjects[index])}
            />
          </ChartCard>
        </div>

        {/* Quarterly Activity Counts */}
        <div className={layoutStyles.grid1}>
          <ChartCard
            title={`จำนวนกิจกรรมสะสมจำแนก${activityPeriodLabel}`}
            subtitle={`ยอดสะสมภายในปีการศึกษา (มิ.ย. - พ.ค.) ถึงสิ้นแต่ละ${activityBucketLabel} จำแนกตามอัตลักษณ์ IDKU · ตามตัวกรองด้านบน`}
            controls={
              <ChartControlGroup<ActivityPeriod>
                label="แสดงผล:"
                options={[
                  { value: 'quarter', label: 'รายไตรมาส' },
                  { value: 'month', label: 'รายเดือน' },
                  { value: 'year', label: 'รายปีการศึกษา' },
                ]}
                value={activityPeriod}
                onChange={setActivityPeriod}
              />
            }
            autoHeight
          >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10px' }}>
              <div style={{
                height: '320px',
                width: '100%',
                maxWidth: activityPeriod === 'quarter' ? '880px' : (activityPeriod === 'year' ? '540px' : '100%'),
                margin: '0 auto',
                position: 'relative'
              }}>
                <BarChart
                  labels={activityChartData.labels}
                  datasets={activityChartData.datasets}
                  stacked={true}
                  yStepSize={1}
                  showDatalabels={true}
                  datalabelCallback={(v) => v > 0 ? `${v}` : ''}
                  showLegend
                  maxBarThickness={activityPeriod === 'quarter' ? 88 : (activityPeriod === 'year' ? 110 : 42)}
                  categoryPercentage={activityPeriod === 'quarter' ? 0.65 : 0.8}
                  barPercentage={activityPeriod === 'quarter' ? 0.75 : 0.85}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px dashed var(--border)' }}>
                {activityChartData.labels.map((label, index) => (
                  <div key={label} style={{ flex: '1 1 180px', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', lineHeight: 1.65 }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</div>
                    <strong>สะสม {activityChartData.datasets.reduce((sum, ds) => sum + ds.data[index], 0)} โครงการ</strong>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>เพิ่มใน{activityBucketLabel}นี้ {activityChartData.newCounts[index]} โครงการ</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {activityChartData.datasets.filter(ds => ds.data[index] > 0).map(ds => `${ds.label} (${ds.data[index]})`).join(', ') || 'ไม่มีโครงการในช่วงนี้'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </div>

        {/* Executive Cost Efficiency Matrix */}
        <div className={layoutStyles.grid1}>
          <ChartCard
            title="แผนภาพต้นทุนต่อผู้เข้าร่วมและความพึงพอใจ"
            coverage={projectCoverage(displayProjects, ['satisfaction', 'participants', 'actual'], ['participants'])}
            subtitle="แกน X เป็นบาทต่อคน · แกน Y เป็นคะแนน · ขนาดวงกลมแสดงจำนวนผู้เข้าร่วม"
            height={440}
            controls={<ChartControlGroup label="สเกล:" options={[{ value: 'auto', label: 'พอดีกับข้อมูล' }, { value: 'zero', label: 'เริ่มจาก 0' }]} value={scatterScaleMode} onChange={setScatterScaleMode} />}
          >
            <BubbleChart
                  datasets={bubbleDatasets}
                  xLabel="งบประมาณต่อผู้เข้าร่วม (บาท/คน)"
                  yLabel="ระดับความพึงพอใจ (เต็ม 5 คะแนน)"
                  xMin={scatterScaleMode === 'auto' ? costScale.min : 0}
                  xMax={costScale.max}
                  xStepSize={costScale.step}
                  yMin={scatterScaleMode === 'auto' ? scoreScale.min : 0}
                  yMax={scatterScaleMode === 'auto' ? scoreScale.max : 5}
                  yStepSize={scatterScaleMode === 'auto' ? scoreScale.step : 1}
                  quadrantX={600}
                  quadrantY={4.5}
                  xCallback={(v) => `฿${v.toLocaleString()}`}
                  yCallback={(v) => `${v.toFixed(2)}`}
                  tooltipCallback={(ctx) => {
                    const raw = ctx.raw;
                    return `${raw.name}: งบต่อหัว ฿${raw.x.toLocaleString()} บาท | พึงพอใจ ${raw.y?.toFixed(2)}/5.00 | ผู้เข้าร่วม ${raw.participants} คน`;
                  }}
                  datalabelFormatter={(pt) => pt.shortName ? `${pt.shortName} (฿${pt.x})` : ''}
                  alignCallback={(pt) => {
                    const name = pt.name || '';
                    if (name.includes('อาจารย์') || name.includes('สังคม')) return 'bottom';
                    return 'top';
                  }}
                  onProjectClick={handleBubbleClick}
                  showLegend
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
