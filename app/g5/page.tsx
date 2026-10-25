'use client';
// app/g5/page.tsx — กลุ่มที่ 5: Deep Relationship & Cross-Dimensional Analytics (Clean Excel Mappings & Academic KPIs)

import { useState, useMemo, useEffect } from 'react';
import LoadError from '@/components/LoadError';
import Topbar from '@/components/Topbar';
import KpiCard from '@/components/KpiCard';
import ChartCard from '@/components/ChartCard';
import ChartListControls from '@/components/ChartListControls';
import ScatterChart from '@/components/charts/ScatterChart';
import BarChart from '@/components/charts/BarChart';
import DataTable from '@/components/DataTable';
import { canPlotProject, projectCoverage, type ProjectMetric } from '@/lib/projectAvailability';
import PlanHoursDataTable from '@/components/PlanHoursDataTable';
import { ChartControlGroup } from '@/components/ChartControlGroup';
import ProjectDetailModal from '@/components/ProjectDetailModal';
import { getProjects } from '@/lib/db/dataService';
import {
  Project,
  kuColorMap,
  KUIdentity,
  getStudentPlanStats,
} from '@/lib/mockData';
import { alpha, palette, chartColors } from '@/lib/chartHelpers';
import { getLinearChartScale } from '@/lib/chartScales';
import layoutStyles from '@/app/layout.module.css';
import { useFilters } from '@/lib/FilterContext';

function shortProjectLabel(name: string): string {
  const cleaned = name
    .replace(/^โครงการ/, '')
    .replace('ภาควิชาวิศวกรรมคอมพิวเตอร์', '')
    .replace('สำหรับวิศวกรรมคอมพิวเตอร์', '')
    .replace('สำหรับวิศวคอม', '')
    .replace('และประสบการณ์วิศวกรรมคอมพิวเตอร์', '')
    .replace('วิศวกรรมคอมพิวเตอร์', 'วิศวคอม')
    .trim();
  if (cleaned.includes('ความมั่นคงปลอดภัยไซเบอร์')) return 'ความปลอดภัยไซเบอร์';
  if (cleaned.includes('แบ่งปันความรู้')) return 'แบ่งปันความรู้';
  if (cleaned.includes('อาจารย์ที่ปรึกษา')) return 'อ.ที่ปรึกษาพบนิสิต';
  if (cleaned.includes('ส่งเสริมศักยภาพสู่สากล') || cleaned.includes('ศักยภาพสู่สากล')) return 'ศักยภาพสู่สากล';
  if (cleaned.includes('พัฒนาศักยภาพกรรมการ')) return 'กรรมการหลักสูตร';
  if (cleaned.includes('ทำบุญและพัฒนา') || cleaned.includes('ทำบุญ')) return 'ทำบุญภาควิชา';
  if (cleaned.includes('เสริมสร้างความรู้') || cleaned.includes('เสริมความรู้')) return 'เสริมความรู้';
  if (cleaned.includes('พัฒนาศักยภาพนิสิต')) return 'พัฒนาศักยภาพ';
  return cleaned.length > 15 ? cleaned.slice(0, 14).trimEnd() + '…' : cleaned;
}

const PLAN_COLORS = ['#059669', '#2563EB', '#D97706', '#7C3AED', '#E11D48'];

export default function G5Page() {
  const [projectsData, setProjectsData] = useState<{ projects: Project[]; isLive: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Per-chart tailored states
  const [strategicDimension, setStrategicDimension] = useState<'plans' | 'idku'>('plans');
  const [strategicPlotMode, setStrategicPlotMode] = useState<'amount' | 'rate'>('amount');
  const [resourceLimit, setResourceLimit] = useState<number | 'all'>(10);
  const [resourceDirection, setResourceDirection] = useState<'asc' | 'desc'>('asc');
  const [resourceSort, setResourceSort] = useState<'participants' | 'budget' | 'cost'>('participants');
  const [scatterLabelMode, setScatterLabelMode] = useState<'show' | 'hide'>('show');

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

  const plottableBudgetPartProjects = useMemo(
    () => projectsList.filter((p) => canPlotProject(p, ['actual', 'participants'])),
    [projectsList]
  );

  // 1) Correlation: Budget vs Participants Dataset (Grouped by KU Identity)
  const budgetVsPartDatasets = useMemo(() => {
    const groups = ['I', 'D', 'K', 'U'] as KUIdentity[];
    return groups
      .map((g) => {
        const projs = plottableBudgetPartProjects.filter((p) => (p.ku || p.kuList[0]) === g);
        const color = kuColorMap[g] ?? palette.blue;
        return {
          label: `อัตลักษณ์ ${g}`,
          data: projs.map((p) => ({
            x: p.actual,
            y: p.participants,
            name: p.name,
            shortName: shortProjectLabel(p.name),
            projectObj: p,
          })),
          backgroundColor: alpha(color, 0.72),
          borderColor: color,
          pointRadius: 8,
          pointHoverRadius: 11,
        };
      })
      .filter((ds) => ds.data.length > 0);
  }, [plottableBudgetPartProjects]);

  const budgetScale = useMemo(
    () =>
      getLinearChartScale(
        plottableBudgetPartProjects.map((p) => p.actual),
        {
          minSpan: 10000,
          lowerBound: 0,
          fallback: { min: 0, max: 60000, step: 10000 },
        }
      ),
    [plottableBudgetPartProjects]
  );

  const participantsScale = useMemo(
    () =>
      getLinearChartScale(
        plottableBudgetPartProjects.map((p) => p.participants),
        {
          minSpan: 40,
          lowerBound: 0,
          fallback: { min: 0, max: 250, step: 50 },
        }
      ),
    [plottableBudgetPartProjects]
  );

  const avgBudget = useMemo(
    () =>
      plottableBudgetPartProjects.length > 0
        ? Math.round(plottableBudgetPartProjects.reduce((s, p) => s + p.actual, 0) / plottableBudgetPartProjects.length)
        : undefined,
    [plottableBudgetPartProjects]
  );

  const avgParticipants = useMemo(
    () =>
      plottableBudgetPartProjects.length > 0
        ? Math.round(plottableBudgetPartProjects.reduce((s, p) => s + p.participants, 0) / plottableBudgetPartProjects.length)
        : undefined,
    [plottableBudgetPartProjects]
  );

  // 2) Student Affairs Plans & IDKU Resource vs Outcome Aggregation (Covers all projects)
  const dynamicPlanStats = useMemo(() => {
    return getStudentPlanStats(projectsList);
  }, [projectsList]);

  const planLabels = useMemo(() => {
    return [
      '1. อัตลักษณ์นิสิต',
      '2. ทักษะการทำงาน',
      '3. ยกระดับสิ่งเรียนรู้',
      '4. ความภาคภูมิใจ',
      '5. ร่วมมือนิสิตเก่า',
    ];
  }, []);


  const strategicOutcomeRows = useMemo(() => {
    if (strategicDimension === 'plans') {
      return planLabels.map((label, idx) => {
        const planNum = idx + 1;
        const projs = projectsList.filter((p) => p.studentPlans.includes(planNum));
        const budget = projs.reduce((s, p) => s + p.budget, 0);
        const actual = projs.reduce((s, p) => s + p.actual, 0);
        const target = projs.reduce((s, p) => s + p.target, 0);
        const participants = projs.reduce((s, p) => s + p.participants, 0);
        return {
          id: String(planNum),
          label,
          shortLabel: label,
          color: PLAN_COLORS[idx] ?? palette.blue,
          count: projs.length,
          budget,
          actual,
          target,
          participants,
          budgetRate: budget > 0 ? +((actual / budget) * 100).toFixed(1) : 0,
          targetRate: target > 0 ? +((participants / target) * 100).toFixed(1) : 0,
        };
      });
    }

    const identities: { id: KUIdentity; label: string; shortLabel: string }[] = [
      { id: 'I', label: 'I — Integrity (คุณธรรม)', shortLabel: 'I (คุณธรรม)' },
      { id: 'D', label: 'D — Determination (มุ่งมั่น)', shortLabel: 'D (มุ่งมั่น)' },
      { id: 'K', label: 'K — Knowledge (ปัญญา)', shortLabel: 'K (ปัญญา)' },
      { id: 'U', label: 'U — Utility (ก้าวหน้า)', shortLabel: 'U (ก้าวหน้า)' },
    ];
    return identities.map(({ id, label, shortLabel }) => {
      const projs = projectsList.filter((p) => p.kuList.includes(id));
      const budget = projs.reduce((s, p) => s + p.budget, 0);
      const actual = projs.reduce((s, p) => s + p.actual, 0);
      const target = projs.reduce((s, p) => s + p.target, 0);
      const participants = projs.reduce((s, p) => s + p.participants, 0);
      return {
        id,
        label,
        shortLabel,
        color: kuColorMap[id] ?? palette.blue,
        count: projs.length,
        budget,
        actual,
        target,
        participants,
        budgetRate: budget > 0 ? +((actual / budget) * 100).toFixed(1) : 0,
        targetRate: target > 0 ? +((participants / target) * 100).toFixed(1) : 0,
      };
    });
  }, [strategicDimension, projectsList, planLabels]);

  const strategicCoverage = useMemo(() => {
    const available = projectsList.filter((p) =>
      strategicDimension === 'plans' ? p.studentPlans.length > 0 : p.kuList.length > 0
    ).length;
    return { available, total: projectsList.length };
  }, [projectsList, strategicDimension]);

  const strategicScatterDatasets = useMemo(() => {
    return strategicOutcomeRows.map((row) => {
      const x = strategicPlotMode === 'amount' ? row.actual : row.budgetRate;
      const y = strategicPlotMode === 'amount' ? row.participants : row.targetRate;
      return {
        label: row.shortLabel,
        data: [
          {
            x,
            y,
            name: row.label,
            shortName: row.shortLabel,
            actualY: y,
            projectObj: { meta: row },
          },
        ],
        backgroundColor: alpha(row.color, 0.8),
        borderColor: row.color,
        pointRadius: 10,
        pointHoverRadius: 13,
      };
    });
  }, [strategicOutcomeRows, strategicPlotMode]);

  const strategicAmountScale = useMemo(() => {
    const actuals = strategicOutcomeRows.map((r) => r.actual);
    const participants = strategicOutcomeRows.map((r) => r.participants);
    return {
      xScale: getLinearChartScale(actuals, {
        minSpan: 50000,
        lowerBound: 0,
        fallback: { min: 0, max: 200000, step: 50000 },
      }),
      yScale: getLinearChartScale(participants, {
        minSpan: 200,
        lowerBound: 0,
        fallback: { min: 0, max: 1500, step: 300 },
      }),
    };
  }, [strategicOutcomeRows]);

  const strategicRateScale = useMemo(() => {
    const maxX = Math.max(...strategicOutcomeRows.map((r) => r.budgetRate), 100);
    const maxY = Math.max(...strategicOutcomeRows.map((r) => r.targetRate), 100);
    const topX = Math.ceil((maxX + 15) / 20) * 20;
    const topY = Math.ceil((maxY + 15) / 20) * 20;
    return {
      xMax: Math.max(120, topX),
      yMax: Math.max(120, topY),
      xStep: 20,
      yStep: 20,
    };
  }, [strategicOutcomeRows]);

  const avgStrategicBudget = useMemo(() => {
    if (strategicOutcomeRows.length === 0) return undefined;
    return Math.round(strategicOutcomeRows.reduce((s, r) => s + r.actual, 0) / strategicOutcomeRows.length);
  }, [strategicOutcomeRows]);

  const avgStrategicPart = useMemo(() => {
    if (strategicOutcomeRows.length === 0) return undefined;
    return Math.round(strategicOutcomeRows.reduce((s, r) => s + r.participants, 0) / strategicOutcomeRows.length);
  }, [strategicOutcomeRows]);

  // 3) Sorted Projects for Resource Allocation
  const resourceMetrics: ProjectMetric[] = resourceSort === 'cost' ? ['actual', 'participants'] : resourceSort === 'budget' ? ['actual'] : ['participants'];
  const resourceProjects = useMemo(() => {
    const metrics: ProjectMetric[] = resourceSort === 'cost' ? ['actual', 'participants'] : resourceSort === 'budget' ? ['actual'] : ['participants'];
    const list = projectsList.filter(project => canPlotProject(project, metrics, resourceSort === 'cost' ? ['participants'] : []));
    const value = (project: Project) => resourceSort === 'cost' ? project.actual / project.participants : resourceSort === 'budget' ? project.actual : project.participants;
    list.sort((a, b) => (value(a) - value(b)) * (resourceDirection === 'asc' ? 1 : -1) || a.name.localeCompare(b.name, 'th'));
    return list;
  }, [resourceSort, resourceDirection, projectsList]);

  const visibleResourceProjects = useMemo(() => resourceLimit === 'all' ? resourceProjects : resourceProjects.slice(0, resourceLimit), [resourceProjects, resourceLimit]);

  // Strategic KPI Metrics
  const totalActualSum = useMemo(() => projectsList.reduce((s, p) => s + p.actual, 0), [projectsList]);

  const calculatedCorrelationText = useMemo(() => {
    if (projectsList.length < 2) return 'N/A';
    // Calculate simple Pearson correlation coefficient r between Budget (X) and Participants (Y)
    const n = projectsList.length;
    const xs = projectsList.map(p => p.actual);
    const ys = projectsList.map(p => p.participants);
    const sumX = xs.reduce((s, x) => s + x, 0);
    const sumY = ys.reduce((s, y) => s + y, 0);
    const sumXSq = xs.reduce((s, x) => s + x * x, 0);
    const sumYSq = ys.reduce((s, y) => s + y * y, 0);
    const sumXY = xs.reduce((s, x, idx) => s + x * ys[idx], 0);

    const num = n * sumXY - sumX * sumY;
    const den = Math.sqrt((n * sumXSq - sumX * sumX) * (n * sumYSq - sumY * sumY));
    if (den === 0) return 'N/A';
    return (num / den).toFixed(2);
  }, [projectsList]);

  const maxPlan = useMemo(() => {
    if (dynamicPlanStats.length === 0) return { name: '-', value: 0 };
    const maxVal = Math.max(...dynamicPlanStats.map(s => s.count));
    const foundIdx = dynamicPlanStats.findIndex(s => s.count === maxVal);
    return {
      name: planLabels[foundIdx] ?? '-',
      value: maxVal,
    };
  }, [dynamicPlanStats, planLabels]);

  if (loading) {
    return (
      <>
        <Topbar title="ความสัมพันธ์เชิงวิเคราะห์" subtitle="กำลังเชื่อมต่อและโหลดข้อมูลโครงการ..." />
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
        title="ความสัมพันธ์เชิงวิเคราะห์"
        subtitle={`การประเมินสถิติเชิงลึก ความสอดรับแผนกิจการนิสิต และความคุ้มค่าเชิงทรัพยากร ปีการศึกษา ${academicYear === 'all' ? 'ทุกปี' : academicYear}`}
      />
      <div className={layoutStyles.content}>

        <div className={layoutStyles.kpiRow}>
          <KpiCard label="สหสัมพันธ์ (งบประมาณ vs. ผู้เข้าร่วม)" value={`r = ${calculatedCorrelationText}`} sub={calculatedCorrelationText === 'N/A' ? 'ข้อมูลไม่เพียงพอหรือไม่มีความแปรปรวน' : Math.abs(+calculatedCorrelationText) >= 0.7 ? 'ความสัมพันธ์ระดับสูง' : Math.abs(+calculatedCorrelationText) >= 0.3 ? 'ความสัมพันธ์ระดับปานกลาง' : 'ความสัมพันธ์ระดับต่ำ'} color="rose" />
          <KpiCard label="แผนกิจการนิสิตที่เน้นสุด" value={maxPlan.name} sub={`สนับสนุนรวม ${maxPlan.value} โครงการ`} color="blue" />
          <KpiCard label="งบประมาณใช้จ่ายรวมจริง" value={`฿${totalActualSum.toLocaleString()}`} sub="บาท" color="emerald" />
          <KpiCard label="โครงการจัดซื้อทั้งหมด" value={`${projectsList.length} โครงการ`} sub="รวมทุกแผนงานประกันคุณภาพ" color="purple" />
        </div>

        {/* First Row: Cross-Dimensional Correlation & Strategic Resource vs Outcome */}
        <div className={layoutStyles.grid2}>
          {/* Chart 1: Budget vs Participants */}
          <ChartCard
            title="ความสัมพันธ์ระหว่างงบประมาณและผู้เข้าร่วมกิจกรรม"
            coverage={projectCoverage(projectsList, ['actual', 'participants'])}
            subtitle="เปรียบเทียบงบใช้จริง (แกน X) กับผู้เข้าร่วมจริง (แกน Y) จำแนกตามอัตลักษณ์ KU (I-D-K-U)"
            height={380}
            controls={
              <ChartControlGroup
                label="ป้ายชื่อ:"
                options={[
                  { value: 'show', label: 'แสดง' },
                  { value: 'hide', label: 'ซ่อน' },
                ]}
                value={scatterLabelMode}
                onChange={setScatterLabelMode}
              />
            }
          >
            <ScatterChart
              datasets={budgetVsPartDatasets}
              xMin={0}
              xMax={budgetScale.max}
              xStepSize={budgetScale.step}
              yMin={0}
              yMax={participantsScale.max}
              yStepSize={participantsScale.step}
              xLabel="งบประมาณที่ใช้จริงรวม (บาท)"
              yLabel="จำนวนนิสิตผู้เข้าร่วมกิจกรรมจริง (คน)"
              xTickCallback={(v) => `฿${Number(v).toLocaleString()}`}
              showDatalabels={scatterLabelMode === 'show'}
              quadrantX={avgBudget}
              quadrantY={avgParticipants}
              quadrantXLabel={avgBudget !== undefined ? `งบเฉลี่ย ฿${avgBudget.toLocaleString()}` : undefined}
              quadrantYLabel={avgParticipants !== undefined ? `เฉลี่ย ${avgParticipants} คน` : undefined}
              tooltipLabelCallback={(ctx) => {
                const raw = ctx.raw;
                return `${raw.name}: งบ ฿${raw.x.toLocaleString()} | นิสิต ${raw.y.toLocaleString()} คน`;
              }}
              onProjectClick={(datasetIdx, itemIdx) => {
                const targetDataset = budgetVsPartDatasets[datasetIdx];
                if (!targetDataset) return;
                const targetPoint = targetDataset.data[itemIdx];
                if (targetPoint && targetPoint.projectObj) {
                  setSelectedProject(targetPoint.projectObj);
                }
              }}
            />
          </ChartCard>

          {/* Chart 2: Strategic Resource Allocation & Outcome by Student Plan / IDKU */}
          <ChartCard
            title="การจัดสรรงบประมาณและผลลัพธ์ตามแผนกิจการนิสิต / IDKU"
            coverage={strategicCoverage}
            subtitle={
              strategicPlotMode === 'amount'
                ? 'เปรียบเทียบงบใช้จริงรวม (แกน X) กับผู้เข้าร่วมจริงรวม (แกน Y) · จุดแสดงตามมิติที่เลือก'
                : 'เปรียบเทียบอัตราเบิกจ่ายงบ % (แกน X) กับอัตราบรรลุเป้าผู้เข้าร่วม % (แกน Y) พร้อมเส้นเกณฑ์ 100%'
            }
            height={380}
            controls={
              <>
                <ChartControlGroup
                  label="มิติ:"
                  options={[
                    { value: 'plans', label: 'แผนกิจการนิสิต 1–5' },
                    { value: 'idku', label: 'อัตลักษณ์ IDKU' },
                  ]}
                  value={strategicDimension}
                  onChange={setStrategicDimension}
                />
                <ChartControlGroup
                  label="ตัวชี้วัด:"
                  options={[
                    { value: 'amount', label: 'งบใช้จริง vs ผู้เข้าร่วม' },
                    { value: 'rate', label: '% เบิกจ่าย vs % บรรลุเป้า' },
                  ]}
                  value={strategicPlotMode}
                  onChange={setStrategicPlotMode}
                />
              </>
            }
          >
            <ScatterChart
              datasets={strategicScatterDatasets}
              xMin={0}
              xMax={strategicPlotMode === 'amount' ? strategicAmountScale.xScale.max : strategicRateScale.xMax}
              xStepSize={strategicPlotMode === 'amount' ? strategicAmountScale.xScale.step : strategicRateScale.xStep}
              yMin={0}
              yMax={strategicPlotMode === 'amount' ? strategicAmountScale.yScale.max : strategicRateScale.yMax}
              yStepSize={strategicPlotMode === 'amount' ? strategicAmountScale.yScale.step : strategicRateScale.yStep}
              xLabel={strategicPlotMode === 'amount' ? 'งบประมาณที่ใช้จริงรวม (บาท)' : 'อัตราการเบิกจ่ายงบประมาณจริง (%)'}
              yLabel={strategicPlotMode === 'amount' ? 'จำนวนนิสิตผู้เข้าร่วมกิจกรรมรวม (คน-ครั้ง)' : 'อัตราการบรรลุเป้าหมายผู้เข้าร่วม (%)'}
              xTickCallback={(v) => (strategicPlotMode === 'amount' ? `฿${Number(v).toLocaleString()}` : `${v}%`)}
              yTickCallback={(v) => (strategicPlotMode === 'amount' ? `${Number(v).toLocaleString()}` : `${v}%`)}
              showDatalabels
              datalabelFormatter={(point) => point.shortName || ''}
              quadrantX={strategicPlotMode === 'amount' ? avgStrategicBudget : 100}
              quadrantY={strategicPlotMode === 'amount' ? avgStrategicPart : 100}
              quadrantXLabel={
                strategicPlotMode === 'amount'
                  ? avgStrategicBudget !== undefined
                    ? `งบเฉลี่ย ฿${avgStrategicBudget.toLocaleString()}`
                    : undefined
                  : 'เกณฑ์ 100%'
              }
              quadrantYLabel={
                strategicPlotMode === 'amount'
                  ? avgStrategicPart !== undefined
                    ? `เฉลี่ย ${avgStrategicPart.toLocaleString()} คน-ครั้ง`
                    : undefined
                  : 'เกณฑ์ 100%'
              }
              tooltipLabelCallback={(ctx) => {
                const rawItem = ctx.raw as { projectObj?: { meta?: (typeof strategicOutcomeRows)[0] } } | null | undefined;
                const row = rawItem?.projectObj?.meta;
                if (!row) return ctx.dataset.label;
                if (strategicPlotMode === 'amount') {
                  return [
                    `${row.label} (${row.count} โครงการ)`,
                    `• งบใช้จริงรวม: ฿${row.actual.toLocaleString()} (อนุมัติ ฿${row.budget.toLocaleString()})`,
                    `• ผู้เข้าร่วมรวม: ${row.participants.toLocaleString()} คน-ครั้ง (เป้าหมาย ${row.target.toLocaleString()} คน-ครั้ง)`,
                  ];
                }
                return [
                  `${row.label} (${row.count} โครงการ)`,
                  `• อัตราเบิกจ่ายงบ: ${row.budgetRate}% (฿${row.actual.toLocaleString()} / ฿${row.budget.toLocaleString()})`,
                  `• บรรลุเป้าผู้เข้าร่วม: ${row.targetRate}% (${row.participants.toLocaleString()} / ${row.target.toLocaleString()} คน-ครั้ง)`,
                ];
              }}
            />
          </ChartCard>
        </div>

        {/* Second Row: Resource Allocation (Full width for better readability) */}
        <div className={layoutStyles.grid1}>
          {/* Chart 3: Resource Allocation directory */}
          <ChartCard
            title="อันดับโครงการตามการใช้ทรัพยากร"
            coverage={projectCoverage(projectsList, resourceMetrics, resourceSort === 'cost' ? ['participants'] : [])}
            subtitle="แสดงอันดับทีละตัวชี้วัด เพื่อดูโครงการที่ใช้ทรัพยากรหรือเข้าถึงผู้เข้าร่วมมากที่สุด"
            height={resourceLimit === 'all' || visibleResourceProjects.length > 12 ? 460 : 420}
            badge={`แสดง ${visibleResourceProjects.length} จาก ${resourceProjects.length} โครงการ`}
            controls={
              <>
              <ChartControlGroup
                label="ตัวชี้วัด:"
                options={[
                  { value: 'participants', label: 'ผู้เข้าร่วม (คน)' },
                  { value: 'budget', label: 'งบประมาณใช้จริง (บาท)' },
                  { value: 'cost', label: 'ต้นทุนต่อคน (บาท/คน)' },
                ]}
                value={resourceSort}
                onChange={setResourceSort}
              />
              <ChartListControls
                direction={resourceDirection}
                onDirectionChange={setResourceDirection}
                limit={resourceLimit}
                onLimitChange={setResourceLimit}
                totalCount={resourceProjects.length}
              />
              </>
            }
            tableContent={<DataTable projects={visibleResourceProjects} onRowClick={setSelectedProject} />}
          >
            <BarChart
              labels={visibleResourceProjects.map(project => project.name)}
              datasets={[{
                label: resourceSort === 'participants' ? 'ผู้เข้าร่วม (คน)' : resourceSort === 'budget' ? 'งบใช้จริง (บาท)' : 'ต้นทุนต่อคน (บาท/คน)',
                data: visibleResourceProjects.map(project => resourceSort === 'participants' ? project.participants : resourceSort === 'budget' ? project.actual : Math.round(project.actual / project.participants)),
                backgroundColor: alpha(resourceSort === 'participants' ? chartColors.participants : resourceSort === 'budget' ? chartColors.budget : chartColors.costPerPerson, 0.88),
                borderColor: resourceSort === 'participants' ? chartColors.participants : resourceSort === 'budget' ? chartColors.budget : chartColors.costPerPerson,
              }]}
              yMin={0}
              yCallback={value => resourceSort === 'participants' ? `${value}` : `฿${value.toLocaleString()}`}
              showDatalabels
              datalabelCallback={value => resourceSort === 'participants' ? `${value.toLocaleString()} คน` : `฿${value.toLocaleString()}${resourceSort === 'cost' ? '/คน' : ''}`}
              onProjectClick={index => setSelectedProject(visibleResourceProjects[index])}
              wrapCategoryLabels
            />
          </ChartCard>
        </div>

        {/* Data Table */}
        <div className={layoutStyles.grid1}>
          <ChartCard
            title="รายละเอียดความสอดคล้องตามแผนและชั่วโมงกิจกรรมรายโครงการ"
            subtitle="ข้อมูลประกันคุณภาพรายโครงการฉบับเต็ม"
            autoHeight
          >
            <PlanHoursDataTable projects={projectsList} onRowClick={setSelectedProject} />
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
