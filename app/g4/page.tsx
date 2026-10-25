'use client';
// app/g4/page.tsx — กลุ่มที่ 4: Strategic Alignment Analysis (Clean Excel Mappings & Academic KPIs)

import { useState, useMemo, useEffect } from 'react';
import LoadError from '@/components/LoadError';
import Topbar from '@/components/Topbar';
import KpiCard from '@/components/KpiCard';
import ChartCard from '@/components/ChartCard';
import HBarChart from '@/components/charts/HBarChart';
import PolarChart from '@/components/charts/PolarChart';
import RadarChart from '@/components/charts/RadarChart';
import DonutChart from '@/components/charts/DonutChart';
import StrategicDataTable from '@/components/StrategicDataTable';
import PloProjectsTable from '@/components/PloProjectsTable';
import { ChartControlGroup } from '@/components/ChartControlGroup';
import ProjectDetailModal from '@/components/ProjectDetailModal';
import { getProjects } from '@/lib/db/dataService';
import {
  Project,
  kuColorMap,
  KUIdentity,
  calculateGroup4Metrics,
  getStudentPlanStats,
} from '@/lib/mockData';
import { alpha, palette, chartColors } from '@/lib/chartHelpers';
import layoutStyles from '@/app/layout.module.css';
import { useFilters } from '@/lib/FilterContext';
import { sdgLabel } from '@/lib/sdgLabels';
import {
  defaultPloDefinitions,
  getPloDefinition,
  getPloRadarMultiLine,
  type PLODefinition,
} from '@/lib/ploLabels';

export default function G4Page() {
  const [projectsData, setProjectsData] = useState<{
    projects: Project[];
    isLive: boolean;
    ploDefinitions?: Record<number, PLODefinition>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Per-chart tailored states
  const [kuMetric, setKuMetric] = useState<'count' | 'budget'>('count');
  const [ploView, setPloView] = useState<'count' | 'percent'>('count');
  const [planViewMode, setPlanViewMode] = useState<'count' | 'budget' | 'participants'>('count');

  const [sdgScope, setSdgScope] = useState<'supported' | 'all'>('supported');

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

  const ploDefinitions = projectsData?.ploDefinitions ?? defaultPloDefinitions;

  // ─── Dynamic Aggregation ───
  const g4Metrics = useMemo(() => calculateGroup4Metrics(projectsList), [projectsList]);
  const {
    kuDistribution: kuMap,
    topKU,
    sdgProjects: sdgProj,
    ploCoverage: ploCount,
  } = g4Metrics;
  const hasPloData = projectsList.some(project => project.plo.length > 0);
  const lowestPloCount = Math.min(...Object.values(ploCount));
  const lowestPloEntries = Object.entries(ploCount)
    .filter(([, count]) => count === lowestPloCount)
    .map(([key]) => {
      const num = Number(key);
      const def = getPloDefinition(num, ploDefinitions);
      return { num, title: def.title, shortDesc: def.shortDesc };
    });

  const lowestPloValue = !hasPloData
    ? 'ยังไม่มีข้อมูล'
    : lowestPloEntries.length === Object.keys(ploCount).length
    ? 'เท่ากันทุก PLO'
    : lowestPloEntries.map(p => p.title).join(', ');

  const lowestPloSub = !hasPloData
    ? 'ยังไม่มีโครงการระบุ PLO ในช่วงที่เลือก'
    : lowestPloEntries.length === 1
    ? `${lowestPloCount} โครงการ (${lowestPloEntries[0].shortDesc})`
    : `${lowestPloCount} โครงการ (เท่ากัน)`;

  const lowestPloTooltip = hasPloData
    ? lowestPloEntries.map(p => `${p.title}: ${p.shortDesc}`).join('\n')
    : undefined;

  const topKUName = topKU ? topKU[0] : '-';
  const topKUDesc = topKU ? (topKU[0] === 'D' ? 'Determination (มุ่งมั่น)' : topKU[0] === 'K' ? 'Knowledge (ปัญญา)' : topKU[0] === 'I' ? 'Integrity (คุณธรรม)' : 'Utility (ก้าวหน้า)') : '-';
  const sdgProjLen = sdgProj ? sdgProj.length : 0;

  // Keep identity positions consistent when switching the Polar Area metric.
  const polarData = useMemo(() => {
    const identities = ['I', 'D', 'K', 'U'] as KUIdentity[];
    const originalLabels = [
      'I — Integrity (คุณธรรม)',
      'D — Determination (มุ่งมั่น)',
      'K — Knowledge (ปัญญา)',
      'U — Utility (ก้าวหน้า)',
    ];

    const budgetMap = { I: 0, D: 0, K: 0, U: 0 };
    projectsList.forEach((p) => {
      p.kuList.forEach((id) => {
        if (id in budgetMap) {
          budgetMap[id as keyof typeof budgetMap] += p.actual;
        }
      });
    });

    const countMap = kuMap ?? { I: 0, D: 0, K: 0, U: 0 };

    const items = identities.map((id, index) => {
      const budget = budgetMap[id];
      const count = countMap[id] ?? 0;
      const value = kuMetric === 'budget' ? budget : count;
      const baseColor = kuColorMap[id];
      return {
        id,
        label: originalLabels[index],
        value,
        color: alpha(baseColor, 0.7),
        borderColor: baseColor,
        displayVal: kuMetric === 'budget' ? `฿${(budget / 1000).toFixed(0)}K` : `${count} โครงการ`,
      };
    });

    return {
      data: items.map(item => item.value),
      labels: items.map(item => item.label),
      colors: items.map(item => item.color),
      borderColors: items.map(item => item.borderColor),
      datalabelCallback: (v: number) => {
        const found = items.find(item => Math.abs(item.value - v) < 0.1);
        return found ? found.displayVal : String(v);
      },
    };
  }, [kuMetric, kuMap, projectsList]);

  const sdgCoverage = useMemo(() => Array.from({length: 17}, (_, index) => ({
    goal: index + 1,
    count: projectsList.filter(project => project.sdgList.includes(index + 1)).length,
  })), [projectsList]);
  const visibleSdgGoals = sdgScope === 'all' ? sdgCoverage : sdgCoverage.filter(goal => goal.count > 0);

  // Card 4 PLO data
  const ploData = useMemo(() => {
    if (!ploCount) return [0, 0, 0, 0];
    if (ploView === 'percent') {
      const totalActivities = projectsList.length;
      return [
        +((ploCount[1] / (totalActivities || 1)) * 100).toFixed(1),
        +((ploCount[2] / (totalActivities || 1)) * 100).toFixed(1),
        +((ploCount[3] / (totalActivities || 1)) * 100).toFixed(1),
        +((ploCount[4] / (totalActivities || 1)) * 100).toFixed(1),
      ];
    }
    return [ploCount[1], ploCount[2], ploCount[3], ploCount[4]];
  }, [ploView, ploCount, projectsList]);

  const ploRadarLabels = useMemo(() => [1, 2, 3, 4].map((num) => {
    return getPloRadarMultiLine(num, ploDefinitions);
  }), [ploDefinitions]);

  const maxPloValue = useMemo(() => Math.max(...(ploData || [0]), 0), [ploData]);
  const ploChartMax = ploView === 'percent' ? 100 : Math.max(10, Math.ceil(maxPloValue / 2) * 2 + 2);
  const ploChartStep = ploView === 'percent' ? 20 : 2;

  const dynamicPlanStats = useMemo(() => {
    return getStudentPlanStats(projectsList);
  }, [projectsList]);

  const planLabels = useMemo(() => {
    return [
      '1. อัตลักษณ์นิสิต',
      '2. ทักษะการทำงาน',
      '3. ยกระดับสิ่งเรียนรู้',
      '4. ความภาคภูมิใจ',
      '5. ร่วมมือนิสิตเก่า'
    ];
  }, []);

  const planData = useMemo(() => {
    return dynamicPlanStats.map((s) => {
      if (planViewMode === 'budget') return s.actual;
      if (planViewMode === 'participants') return s.participants;
      return s.count;
    });
  }, [dynamicPlanStats, planViewMode]);

  // Colors identify plans 1–5 and keep their order across metric switches.
  const planColors = [palette.blue, palette.emerald, palette.purple, palette.amber, palette.rose];
  const planTotal = planData.reduce((sum, value) => sum + value, 0);

  if (loading) {
    return (
      <div className={layoutStyles.loadingContainer}>
        <div className={layoutStyles.loadingSpinner} />
        <p className={layoutStyles.loadingText}>กำลังโหลดข้อมูลยุทธศาสตร์...</p>
      </div>
    );
  }

  if (loadError) return <LoadError onRetry={() => { setLoadError(false); setLoading(true); setRetryKey(key => key + 1); }} />;

  return (
    <>
      <Topbar
        exportProjects={projectsList}
        title="ความสอดคล้องเชิงยุทธศาสตร์"
        subtitle={`วิเคราะห์และประเมินสัดส่วนโครงการนิสิตตามยุทธศาสตร์ อัตลักษณ์ KU และ SDGs ปีการศึกษา ${academicYear === 'all' ? 'ทุกปี' : academicYear}${semester !== 'all' ? ` (${semester === 't1' ? 'ภาคเรียนที่ 1' : semester === 't2' ? 'ภาคเรียนที่ 2' : 'ภาคฤดูร้อน'})` : ''}`}
      />
      <div className={layoutStyles.content}>

        <div className={layoutStyles.kpiRow}>
          <KpiCard label="อัตลักษณ์หลักที่สนับสนุน" value={topKUName} sub={`${topKUDesc}`} color="cyan" />
          <KpiCard label="สอดคล้องเป้าหมาย SDGs" value={`${sdgProjLen}/${projectsList.length} โครงการ`} sub={`${((sdgProjLen / (projectsList.length || 1)) * 100).toFixed(0)}% ของแผนงานหลัก`} color="emerald" />
          <KpiCard label="เป้าหมาย SDGs ที่ได้รับการสนับสนุน" value={`${sdgCoverage.filter(goal => goal.count > 0).length}/17 เป้าหมาย`} sub="นับจากเป้าหมายที่ระบุในโครงการ" color="blue" />
          <KpiCard label="PLO ที่ได้รับการสนับสนุนน้อยสุด" value={lowestPloValue} sub={lowestPloSub} tooltip={lowestPloTooltip} color="purple" />
        </div>

        <div className={layoutStyles.grid2}>
          <ChartCard
            title="การสนับสนุนคุณลักษณะนิสิต (KU Identity)"
            subtitle="การกระจายตัวของจำนวนโครงการหรืองบประมาณใช้จริงรวม จำแนกตามคุณลักษณะ I-D-K-U"
            height={350}
            controls={
              <ChartControlGroup
                label="แสดงตาม:"
                options={[
                  { value: 'count', label: 'จำนวนโครงการ' },
                  { value: 'budget', label: 'งบประมาณใช้จริง' },
                ]}
                value={kuMetric}
                onChange={setKuMetric}
              />
            }
          >
            <PolarChart
              labels={polarData.labels}
              data={polarData.data}
              colors={polarData.colors}
              borderColors={polarData.borderColors}
              datalabelCallback={polarData.datalabelCallback}
            />
          </ChartCard>

          <ChartCard
            title="การสนับสนุนเป้าหมายการพัฒนาที่ยั่งยืน (SDGs)"
            subtitle="จำนวนโครงการที่ระบุแต่ละเป้าหมาย โครงการหนึ่งสนับสนุนได้หลายเป้าหมาย"
            height={350}
            controls={<ChartControlGroup label="แสดง:" options={[{value: 'supported', label: 'เป้าหมายที่มีโครงการ'}, {value: 'all', label: 'ทุกเป้าหมาย (17)'}]} value={sdgScope} onChange={setSdgScope} />}
          >
            {visibleSdgGoals.length > 0 ? <div role="region" aria-label="จำนวนโครงการตามเป้าหมาย SDGs" tabIndex={0} style={{height: '100%', overflowY: 'auto', overscrollBehavior: 'contain'}}>
              <div style={{height: Math.max(300, visibleSdgGoals.length * 46 + 50), maxHeight: Math.max(300, visibleSdgGoals.length * 46 + 50), overflow: 'hidden', position: 'relative'}}>
                <HBarChart
                  labels={visibleSdgGoals.map(goal => sdgLabel(goal.goal))}
                  labelWidth={270}
                  wrapFullLabels
                  datasets={[{label: 'จำนวนโครงการ', data: visibleSdgGoals.map(goal => goal.count), backgroundColor: alpha(chartColors.projectCount, 0.88)}]}
                  xMin={0}
                  xStepSize={1}
                  showDatalabels
                  datalabelCallback={value => value + ' โครงการ'}
                  customPadding={{right: 90}}
                />
              </div>
            </div> : <div style={{height: '100%', display: 'grid', placeItems: 'center', color: '#565656'}}>ไม่มีข้อมูลสำหรับตัวชี้วัดนี้</div>}
          </ChartCard>
        </div>

        <div className={layoutStyles.grid2}>
          <ChartCard
            title="การสนับสนุนผลลัพธ์การเรียนรู้ระดับหลักสูตร (PLO)"
            coverage={{ available: projectsList.filter(project => project.plo.length > 0).length, total: projectsList.length }}
            subtitle="จำนวนโครงการที่สนับสนุน PLO 1–4 หรือร้อยละของโครงการทั้งหมด ดึงนิยามจากฐานข้อมูลหลักสูตร"
            height={430}
            controls={
              <ChartControlGroup
                label="แสดงสัดส่วน:"
                options={[
                  { value: 'count', label: 'จำนวนโครงการ' },
                  { value: 'percent', label: 'สัดส่วนร้อยละ (%)' },
                ]}
                value={ploView}
                onChange={setPloView}
              />
            }
            tableContent={
              <PloProjectsTable
                projects={projectsList}
                ploDefinitions={ploDefinitions}
                onRowClick={(p) => setSelectedProject(p)}
              />
            }
          >
            <div style={{ height: '350px' }}>
              <RadarChart
                labels={ploRadarLabels}
                datasets={[{
                  label: ploView === 'count' ? 'จำนวนโครงการ (ครั้ง)' : 'สัดส่วนที่สนับสนุน (%)',
                  data: ploData,
                  borderColor: '#7E22CE',
                  backgroundColor: alpha('#7E22CE', 0.16),
                  pointBackgroundColor: '#7E22CE',
                  pointBorderColor: '#FFFFFF',
                  pointBorderWidth: 2,
                  pointRadius: 4.5,
                  pointHoverRadius: 7,
                  borderWidth: 2.5,
                }]}
                min={0}
                max={ploChartMax}
                stepSize={ploChartStep}
                isPercentage={ploView === 'percent'}
                tooltipTitleCallback={(items) => {
                  const idx = items[0]?.dataIndex ?? 0;
                  const num = idx + 1;
                  const def = getPloDefinition(num, ploDefinitions);
                  return `${def.title}: ${def.shortDesc}`;
                }}
                tooltipLabelCallback={(context) => {
                  const num = context.dataIndex + 1;
                  const def = getPloDefinition(num, ploDefinitions);
                  const val = context.raw ?? 0;
                  const valStr = ploView === 'percent' ? `${val}% ของโครงการทั้งหมด` : `${val} โครงการ`;
                  return [
                    `การสนับสนุน: ${valStr}`,
                    `นิยาม: ${def.detail}`,
                  ];
                }}
              />
            </div>
          </ChartCard>

          <ChartCard
            title="ความสอดรับตามแผนกิจการนิสิต 1–5"
            subtitle="โครงการหนึ่งสนับสนุนได้หลายแผน สัดส่วนคิดจากยอดรวมทุกแผน"
            height={430}
            controls={
              <ChartControlGroup
                label="แสดงตามดัชนี:"
                options={[
                  { value: 'count', label: 'จำนวนโครงการ' },
                  { value: 'budget', label: 'งบประมาณ (฿)' },
                  { value: 'participants', label: 'ผู้เข้าร่วม (คน)' },
                ]}
                value={planViewMode}
                onChange={setPlanViewMode}
              />
            }
          >
            {planTotal > 0 ? <DonutChart
              labels={planLabels}
              data={planData}
              colors={planColors}
              legendPosition="top"
              showLabels
              labelCallback={value => value > 0 ? `${(value / planTotal * 100).toFixed(1)}%` : ''}
              tooltipLabelCallback={(value, index) => `${planLabels[index]}: ${planViewMode === 'budget' ? `฿${value.toLocaleString()}` : `${value.toLocaleString()} ${planViewMode === 'participants' ? 'คน-ครั้ง' : 'โครงการ'}`} (${(value / planTotal * 100).toFixed(1)}%)`}
            /> : <div style={{height: '100%', display: 'grid', placeItems: 'center', color: '#565656'}}>ไม่มีข้อมูลสำหรับตัวชี้วัดนี้</div>}
          </ChartCard>
        </div>

        {/* Data Table of Strategic Mapping */}
        <div className={layoutStyles.grid1}>
          <ChartCard
            title="ตารางสรุปการสอดรับกรอบประเมินผล TQF, SDGs และอัตลักษณ์นิสิตรายโครงการ"
            subtitle="ตารางข้อมูลสำหรับส่งฝ่ายประกันคุณภาพเพื่อการรายงานตามตัวชี้วัดปีงบประมาณ"
            autoHeight
          >
            <StrategicDataTable projects={projectsList} onRowClick={setSelectedProject} />
          </ChartCard>
        </div>

        {/* Interactive Detail Modal */}
        {selectedProject && (
          <ProjectDetailModal
            project={selectedProject}
            onClose={() => setSelectedProject(null)}
          />
        )}
      </div>
    </>
  );
}
