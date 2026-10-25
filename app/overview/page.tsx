'use client';
import { matchesResponsible, projectResponsibleNames } from '@/lib/reportUtils';
// app/overview/page.tsx — Overview Page with Clean Excel Mappings & Academic KPIs

import { useState, useMemo, useEffect } from 'react';
import { academicYears, fiscalYears, projectDateContext } from '@/lib/reportUtils';
import LoadError from '@/components/LoadError';
import Topbar from '@/components/Topbar';
import KpiCard from '@/components/KpiCard';
import ChartCard from '@/components/ChartCard';
import ProjectComparison from '@/components/ProjectComparison';
import ChartListControls from '@/components/ChartListControls';
import { ChartControlGroup, ChartControlSelect } from '@/components/ChartControlGroup';
import HBarChart from '@/components/charts/HBarChart';
import LineChart from '@/components/charts/LineChart';
import DonutChart from '@/components/charts/DonutChart';
import ProjectDetailModal from '@/components/ProjectDetailModal';
import { getProjects } from '@/lib/db/dataService';
import {
  Project,
  calculateBudgetSummary,
  calculateParticipantSummary,
  calculateQualitySummary,
  KUIdentity,
} from '@/lib/mockData';
import { alpha, palette, chartColors, categoryColorMap } from '@/lib/chartHelpers';
import layoutStyles from '@/app/layout.module.css';
import { useFilters } from '@/lib/FilterContext';
import { canPlotProject, projectCoverage } from '@/lib/projectAvailability';

export default function OverviewPage() {
  const [projectsData, setProjectsData] = useState<{ projects: Project[]; isLive: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Global filters from context
  const { academicYear, semester } = useFilters();

  // Card 1 state: KU Identity metric
  const [identityMetric, setIdentityMetric] = useState<'count' | 'budget' | 'participants'>('count');

  // Card 2 state: Category filter (KU Identity)
  const [bubbleCategory, setBubbleCategory] = useState<string>('all');
  const [comparisonLimit, setComparisonLimit] = useState<number | 'all'>(10);
  const [comparisonDirection, setComparisonDirection] = useState<'asc' | 'desc'>('asc');

  // Card 3 state: Line chart view mode
  const [lineView, setLineView] = useState<'dual' | 'utilization'>('dual');
  const [trendYearMode, setTrendYearMode] = useState<string>('default');
  const [timelineGranularity, setTimelineGranularity] = useState<'fiscal_quarter' | 'academic_quarter' | 'monthly' | 'fiscal_year' | 'academic_year'>('academic_quarter');

  // Card 4 state: YoY Academic Year comparison
  const [yoyMetric, setYoyMetric] = useState<'budget' | 'participants' | 'satisfaction'>('budget');
  const [selectedCompareYear1, setCompareYear1] = useState<string>('');
  const [selectedCompareYear2, setCompareYear2] = useState<string>('');
  const years = useMemo(() => {
    const base = academicYears(projectsData?.projects ?? []).map(String);

    return base;
  }, [projectsData]);
  const defaultCompareYear2 = academicYear !== 'all' && years.includes(academicYear) ? academicYear : (years[0] || '');
  const defaultCompareYear1 = academicYear !== 'all' && years.includes(academicYear)
    ? (years.find(y => Number(y) < Number(academicYear)) || years.find(y => y !== academicYear) || (years[1] || ''))
    : (years[1] || years[0] || '');
  const compareYear1 = selectedCompareYear1 || defaultCompareYear1;
  const compareYear2 = selectedCompareYear2 || defaultCompareYear2;

  useEffect(() => {
    setCompareYear1('');
    setCompareYear2('');
    setTrendYearMode('default');
  }, [academicYear, semester]);



  const [selectedProject, setSelectedProject] = useState<Project | null>(null);


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

  // Dynamic Aggregations
  const budgetSum = useMemo(() => calculateBudgetSummary(projectsList), [projectsList]);
  const participantSum = useMemo(() => calculateParticipantSummary(projectsList), [projectsList]);
  const qualitySum = useMemo(() => calculateQualitySummary(projectsList), [projectsList]);

  // ── Lecturer Profile (Replaces redundant Student Plans Chart to avoid duplicates) ──
  const lecturerColors = useMemo(() => categoryColorMap((projectsData?.projects ?? []).flatMap(projectResponsibleNames)), [projectsData]);
  const lecturerData = useMemo(() => {
    const lecturers = Array.from(new Set(projectsList.flatMap(projectResponsibleNames)));

    const items = lecturers.map((lecturer) => {
      const projs = projectsList.filter((p) => matchesResponsible(p, lecturer));
      const count = projs.length;
      const budget = projs.reduce((s, p) => s + p.actual, 0);
      const participants = projs.reduce((s, p) => s + p.participants, 0);

      let value = count;
      let rawValText = `${count} โครงการ`;

      if (identityMetric === 'budget') {
        value = budget;
        rawValText = `฿${budget.toLocaleString()} บาท`;
      } else if (identityMetric === 'participants') {
        value = participants;
        rawValText = `${participants.toLocaleString()} คน`;
      }

      const shortName = lecturer === 'ไม่ระบุ' ? 'โครงการอาจารย์/ทั่วไป' : lecturer.replace('ผศ.ดร.', '').replace('อ.ร้อยโท', '').replace('อ.', '');

      return {
        name: shortName,
        value,
        color: lecturerColors.get(lecturer)!,
        rawValText,
      };
    });

    // Sort descending (highest value first)
    items.sort((a, b) => b.value - a.value);

    const total = items.reduce((sum, item) => sum + item.value, 0);

    let centerLabel = `${total.toLocaleString()} โครงการ`;
    let centerSubLabel = 'โครงการทั้งหมด';
    if (identityMetric === 'budget') {
      centerLabel = total >= 1000000
        ? `฿${(total / 1000000).toFixed(2)}M`
        : `฿${(total / 1000).toFixed(0)}K`;
      centerSubLabel = 'งบใช้จริงรวม';
    } else if (identityMetric === 'participants') {
      centerLabel = `${total.toLocaleString()} คน`;
      centerSubLabel = 'ผู้เข้าร่วมรวม';
    }

    return {
      labels: items.map(item => item.name),
      data: items.map(item => item.value),
      colors: items.map(item => item.color),
      centerLabel,
      centerSubLabel,
      datalabelCallback: (v: number) => {
        if (!total || v <= 0) return '';
        const pct = (v / total) * 100;
        // Hide if slice is under 3% so it doesn't overlap or look cramped
        if (pct < 3) return '';
        return `${pct.toFixed(1)}%`;
      },
      tooltipLabelCallback: (value: number, index: number) => {
        const item = items[index];
        const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
        const metricName = identityMetric === 'budget'
          ? 'งบประมาณใช้จริง'
          : identityMetric === 'participants'
          ? 'ผู้เข้าร่วม'
          : 'จำนวนโครงการ';
        return ` ${metricName}: ${item?.rawValText ?? value} (${pct}%)`;
      },
    };
  }, [identityMetric, projectsList, lecturerColors]);

  // ── Efficiency Bar Datasets Calculation ──
  const filteredOverviewProjects = useMemo(() => {
    const list = bubbleCategory === 'all'
      ? [...projectsList]
      : projectsList.filter((p) => p.kuList.includes(bubbleCategory as KUIdentity));

    // Sort by cost per head (actual / participants) ascending (most economical first)
    list.sort((a, b) => {
      const aCost = a.participants > 0 ? a.actual / a.participants : 0;
      const bCost = b.participants > 0 ? b.actual / b.participants : 0;
      return (aCost - bCost) * (comparisonDirection === 'asc' ? 1 : -1);
    });
    return list;
  }, [bubbleCategory, comparisonDirection, projectsList]);

  const validOverviewProjects = useMemo(() => {
    return filteredOverviewProjects.filter(p => canPlotProject(p, ['actual', 'participants', 'satisfaction'], ['participants']));
  }, [filteredOverviewProjects]);

  const visibleOverviewProjects = useMemo(() => {
    return comparisonLimit === 'all' ? validOverviewProjects : validOverviewProjects.slice(0, comparisonLimit);
  }, [validOverviewProjects, comparisonLimit]);
  const handleOverviewTornadoClick = (index: number) => {
    if (visibleOverviewProjects[index]) setSelectedProject(visibleOverviewProjects[index]);
  };

  // Explicit chart years override the academic-year filter; semester always applies.
  const semesterProjects = useMemo(() => (projectsData?.projects ?? []).filter(p => semester === 'all' || p.semester === semester), [projectsData, semester]);
  const isFiscalGranularity = timelineGranularity === 'fiscal_quarter' || timelineGranularity === 'fiscal_year';
  const timelineYears = useMemo(() => (isFiscalGranularity ? fiscalYears(semesterProjects) : academicYears(semesterProjects)).map(String), [semesterProjects, isFiscalGranularity]);
  const effectiveTrendYearMode = trendYearMode === 'default' || timelineYears.includes(trendYearMode) ? trendYearMode : 'default';
  const activeTrendYear = effectiveTrendYearMode === 'default'
    ? (isFiscalGranularity ? String(fiscalYears(projectsList)[0] ?? '') : academicYear === 'all' ? (years[0] || '') : academicYear)
    : effectiveTrendYearMode;
  useEffect(() => {
    if (trendYearMode !== effectiveTrendYearMode) setTrendYearMode(effectiveTrendYearMode);
  }, [trendYearMode, effectiveTrendYearMode]);

  // ── Timeline Datasets Calculation (Fiscal Quarter [Default] vs Academic Quarter vs Monthly vs Yearly) ──
  // IMPORTANT: When viewing all years (รวมทุกปี), quarters and months from different years are kept strictly separate and chronologically ordered
  const timelineData = useMemo(() => {
    const isExplicitYear = effectiveTrendYearMode !== 'default';
    const rawList = isExplicitYear ? semesterProjects : projectsList;
    const targetYearNum = parseInt(activeTrendYear, 10);

    // 1. ไตรมาสปีงบประมาณ (ต.ค. - ก.ย.) — Default
    if (timelineGranularity === 'fiscal_quarter') {
      const presentFiscalYears = Array.from(new Set(
        rawList.flatMap((p) => {
          const dt = projectDateContext(p.startDate);
          return dt ? [dt.fiscalYearBE] : [];
        })
      )).sort((a, b) => a - b);

      const activeYears = isExplicitYear
        ? [targetYearNum]
        : presentFiscalYears.length > 0
        ? presentFiscalYears
        : [targetYearNum || (academicYears(projectsData?.projects ?? []).length ? Math.max(...academicYears(projectsData?.projects ?? [])) : 2568)];

      const isMultiYear = activeYears.length > 1;
      const items: { label: string; fullLabel: string; budget: number; actual: number; key: string; count?: number }[] = [];

      for (const y of activeYears) {
        const shortYear = String(y).slice(-2);
        const quarters = [
          {
            key: `FY${y}-Q1`,
            label: isMultiYear ? `Q1/${shortYear}` : 'Q1 (ต.ค. - ธ.ค.)',
            fullLabel: `Q1 ปีงบประมาณ ${y} (ต.ค. - ธ.ค. ${y - 1})`,
            months: [10, 11, 12],
          },
          {
            key: `FY${y}-Q2`,
            label: isMultiYear ? `Q2/${shortYear}` : 'Q2 (ม.ค. - มี.ค.)',
            fullLabel: `Q2 ปีงบประมาณ ${y} (ม.ค. - มี.ค. ${y})`,
            months: [1, 2, 3],
          },
          {
            key: `FY${y}-Q3`,
            label: isMultiYear ? `Q3/${shortYear}` : 'Q3 (เม.ย. - มิ.ย.)',
            fullLabel: `Q3 ปีงบประมาณ ${y} (เม.ย. - มิ.ย. ${y})`,
            months: [4, 5, 6],
          },
          {
            key: `FY${y}-Q4`,
            label: isMultiYear ? `Q4/${shortYear}` : 'Q4 (ก.ค. - ก.ย.)',
            fullLabel: `Q4 ปีงบประมาณ ${y} (ก.ค. - ก.ย. ${y})`,
            months: [7, 8, 9],
          },
        ];

        for (const q of quarters) {
          // When filtering by academic year in default mode, skip fiscal quarters completely outside the selected academic year
          if (!isExplicitYear && academicYear !== 'all') {
            const ayNum = Number(academicYear);
            if (y === ayNum && (q.key.endsWith('-Q1') || q.key.endsWith('-Q2'))) continue;
            if (y === ayNum + 1 && q.key.endsWith('-Q4')) continue;
            if (y < ayNum || y > ayNum + 1) continue;
          }

          const projs = rawList.filter((p) => {
            const dt = projectDateContext(p.startDate);
            if (!dt) return false;
            return dt.fiscalYearBE === y && q.months.includes(dt.month);
          });
          const budget = projs.reduce((s, p) => s + p.budget, 0);
          const actual = projs.reduce((s, p) => s + p.actual, 0);
          items.push({ label: q.label, fullLabel: q.fullLabel, budget, actual, key: q.key, count: projs.length });
        }
      }

      // Trim trailing empty quarters outside the filtered period if filtering by academic year in default mode
      if (!isExplicitYear && academicYear !== 'all') {
        while (items.length > 1 && (items[items.length - 1].count ?? 0) === 0) {
          items.pop();
        }
      }

      return items;
    }

    // 2. ไตรมาสปีการศึกษา (มิ.ย. - พ.ค.)
    if (timelineGranularity === 'academic_quarter') {
      const presentAcademicYears = Array.from(new Set(
        rawList.flatMap((p) => {
          const dt = projectDateContext(p.startDate);
          const ay = p.academicYear || dt?.academicYearBE;
          return ay ? [ay] : [];
        })
      )).sort((a, b) => a - b);

      const activeYears = isExplicitYear
        ? [targetYearNum]
        : presentAcademicYears.length > 0
        ? presentAcademicYears
        : [targetYearNum || (academicYears(projectsData?.projects ?? []).length ? Math.max(...academicYears(projectsData?.projects ?? [])) : 2568)];

      const isMultiYear = activeYears.length > 1;
      const items: { label: string; fullLabel: string; budget: number; actual: number; key: string; count?: number }[] = [];

      for (const y of activeYears) {
        const shortYear = String(y).slice(-2);
        const quarters = [
          {
            key: `AY${y}-Q1`,
            label: isMultiYear ? `Q1/${shortYear}` : 'Q1 (มิ.ย. - ส.ค.)',
            fullLabel: `Q1 ปีการศึกษา ${y} (มิ.ย. - ส.ค. ${y})`,
            months: [6, 7, 8],
          },
          {
            key: `AY${y}-Q2`,
            label: isMultiYear ? `Q2/${shortYear}` : 'Q2 (ก.ย. - พ.ย.)',
            fullLabel: `Q2 ปีการศึกษา ${y} (ก.ย. - พ.ย. ${y})`,
            months: [9, 10, 11],
          },
          {
            key: `AY${y}-Q3`,
            label: isMultiYear ? `Q3/${shortYear}` : 'Q3 (ธ.ค. - ก.พ.)',
            fullLabel: `Q3 ปีการศึกษา ${y} (ธ.ค. ${y} - ก.พ. ${y + 1})`,
            months: [12, 1, 2],
          },
          {
            key: `AY${y}-Q4`,
            label: isMultiYear ? `Q4/${shortYear}` : 'Q4 (มี.ค. - พ.ค.)',
            fullLabel: `Q4 ปีการศึกษา ${y} (มี.ค. - พ.ค. ${y + 1})`,
            months: [3, 4, 5],
          },
        ];

        for (const q of quarters) {
          const projs = rawList.filter((p) => {
            const dt = projectDateContext(p.startDate);
            if (!dt) return false;
            const ay = p.academicYear || dt.academicYearBE;
            return ay === y && q.months.includes(dt.month);
          });
          const budget = projs.reduce((s, p) => s + p.budget, 0);
          const actual = projs.reduce((s, p) => s + p.actual, 0);
          items.push({ label: q.label, fullLabel: q.fullLabel, budget, actual, key: q.key });
        }
      }

      return items;
    }

    // 3. รายเดือน เรียงตามปีการศึกษาจาก มิถุนายน ถึง พฤษภาคม
    if (timelineGranularity === 'monthly') {
      const presentAcademicYears = Array.from(new Set(
        rawList.flatMap((p) => {
          const dt = projectDateContext(p.startDate);
          const ay = p.academicYear || dt?.academicYearBE;
          return ay ? [ay] : [];
        })
      )).sort((a, b) => a - b);

      const activeYears = isExplicitYear
        ? [targetYearNum]
        : presentAcademicYears.length > 0
        ? presentAcademicYears
        : [targetYearNum || (academicYears(projectsData?.projects ?? []).length ? Math.max(...academicYears(projectsData?.projects ?? [])) : 2568)];

      const isMultiYear = activeYears.length > 1;
      const items: { label: string; fullLabel: string; budget: number; actual: number; key: string; count?: number }[] = [];

      for (const y of activeYears) {
        const shortYear = String(y).slice(-2);
        const nextShortYear = String(y + 1).slice(-2);
        const academicMonths = [
          { month: 6, label: isMultiYear ? `มิ.ย. ${shortYear}` : 'มิ.ย.', fullLabel: `มิถุนายน ${y}` },
          { month: 7, label: isMultiYear ? `ก.ค. ${shortYear}` : 'ก.ค.', fullLabel: `กรกฎาคม ${y}` },
          { month: 8, label: isMultiYear ? `ส.ค. ${shortYear}` : 'ส.ค.', fullLabel: `สิงหาคม ${y}` },
          { month: 9, label: isMultiYear ? `ก.ย. ${shortYear}` : 'ก.ย.', fullLabel: `กันยายน ${y}` },
          { month: 10, label: isMultiYear ? `ต.ค. ${shortYear}` : 'ต.ค.', fullLabel: `ตุลาคม ${y}` },
          { month: 11, label: isMultiYear ? `พ.ย. ${shortYear}` : 'พ.ย.', fullLabel: `พฤศจิกายน ${y}` },
          { month: 12, label: isMultiYear ? `ธ.ค. ${shortYear}` : 'ธ.ค.', fullLabel: `ธันวาคม ${y}` },
          { month: 1, label: isMultiYear ? `ม.ค. ${nextShortYear}` : 'ม.ค.', fullLabel: `มกราคม ${y + 1}` },
          { month: 2, label: isMultiYear ? `ก.พ. ${nextShortYear}` : 'ก.พ.', fullLabel: `กุมภาพันธ์ ${y + 1}` },
          { month: 3, label: isMultiYear ? `มี.ค. ${nextShortYear}` : 'มี.ค.', fullLabel: `มีนาคม ${y + 1}` },
          { month: 4, label: isMultiYear ? `เม.ย. ${nextShortYear}` : 'เม.ย.', fullLabel: `เมษายน ${y + 1}` },
          { month: 5, label: isMultiYear ? `พ.ค. ${nextShortYear}` : 'พ.ค.', fullLabel: `พฤษภาคม ${y + 1}` },
        ];

        for (const m of academicMonths) {
          const projs = rawList.filter((p) => {
            const dt = projectDateContext(p.startDate);
            if (!dt) return false;
            const ay = p.academicYear || dt.academicYearBE;
            return ay === y && dt.month === m.month;
          });
          const budget = projs.reduce((s, p) => s + p.budget, 0);
          const actual = projs.reduce((s, p) => s + p.actual, 0);
          items.push({ label: m.label, fullLabel: m.fullLabel, budget, actual, key: `${y}-${m.month}` });
        }
      }

      return items;
    }

    // 4. รายปีงบประมาณ
    if (timelineGranularity === 'fiscal_year') {
      const presentFiscalYears = Array.from(new Set(
        rawList.flatMap((p) => {
          const dt = projectDateContext(p.startDate);
          return dt ? [dt.fiscalYearBE] : [];
        })
      )).sort((a, b) => a - b);

      const activeYears = isExplicitYear
        ? [targetYearNum]
        : presentFiscalYears.length > 0
        ? presentFiscalYears
        : [targetYearNum || (academicYears(projectsData?.projects ?? []).length ? Math.max(...academicYears(projectsData?.projects ?? [])) : 2568)];

      return activeYears.map((y) => {
        const projs = rawList.filter((p) => {
          const dt = projectDateContext(p.startDate);
          if (!dt) return false;
          return dt.fiscalYearBE === y;
        });
        const budget = projs.reduce((s, p) => s + p.budget, 0);
        const actual = projs.reduce((s, p) => s + p.actual, 0);
        return { label: `ปี ${y}`, fullLabel: `ปีงบประมาณ ${y}`, budget, actual, key: `FY${y}` };
      });
    }

    // 5. รายปีการศึกษา
    const presentAcademicYears = Array.from(new Set(
      rawList.flatMap((p) => {
        const dt = projectDateContext(p.startDate);
        const ay = p.academicYear || dt?.academicYearBE;
        return ay ? [ay] : [];
      })
    )).sort((a, b) => a - b);

    const activeYears = isExplicitYear
      ? [targetYearNum]
      : presentAcademicYears.length > 0
      ? presentAcademicYears
      : [targetYearNum || (academicYears(projectsData?.projects ?? []).length ? Math.max(...academicYears(projectsData?.projects ?? [])) : 2568)];

    return activeYears.map((y) => {
      const projs = rawList.filter((p) => {
        const dt = projectDateContext(p.startDate);
        const ay = p.academicYear || dt?.academicYearBE;
        return ay === y;
      });
      const budget = projs.reduce((s, p) => s + p.budget, 0);
      const actual = projs.reduce((s, p) => s + p.actual, 0);
      return { label: `ปี ${y}`, fullLabel: `ปีการศึกษา ${y}`, budget, actual, key: `AY${y}` };
    });
  }, [projectsList, semesterProjects, effectiveTrendYearMode, activeTrendYear, timelineGranularity, projectsData?.projects]);

  const lineDatasets = useMemo(() => {
    if (lineView === 'utilization') {
      return [
        {
          label: 'อัตราการเบิกจ่าย (%)',
          data: timelineData.map((q) => q.budget > 0 ? +((q.actual / q.budget) * 100).toFixed(1) : 0),
          borderColor: chartColors.budget,
          backgroundColor: alpha(chartColors.budget, 0.15),
          pointBackgroundColor: chartColors.budget,
          fill: true,
        },
      ];
    }
    return [
      {
        label: 'งบอนุมัติ',
        data: timelineData.map((q) => q.budget),
        borderColor: chartColors.approvedBudget,
        backgroundColor: alpha(chartColors.approvedBudget, 0.1),
        pointBackgroundColor: chartColors.approvedBudget,
      },
      {
        label: 'ใช้จริง',
        data: timelineData.map((q) => q.actual),
        borderColor: chartColors.budget,
        backgroundColor: alpha(chartColors.budget, 0.08),
        borderDash: [6, 3],
        pointBackgroundColor: chartColors.budget,
      },
    ];
  }, [lineView, timelineData]);

  // YoY comparison calculations grouped by the 6 standard student activity types
  const yoyData = useMemo(() => {
    const activityTypes = [
      'กิจกรรมวิชาการที่ส่งเสริมคุณลักษณะบัณฑิตที่พึงประสงค์',
      'กิจกรรมเสริมสร้างคุณธรรมและจริยธรรม',
      'กิจกรรมกีฬาหรือส่งเสริมสุขภาพ',
      'กิจกรรมบำเพ็ญประโยชน์',
      'กิจกรรมเสริมสร้างศิลปะและวัฒนธรรม',
      'กิจกรรมส่งเสริมการรักษาสิ่งแวดล้อม',
    ];
    const rawList = semesterProjects;

    const statsYear1 = activityTypes.map((type) => {
      const projs = rawList.filter((p) => String(p.academicYear) === compareYear1 && p.type === type);
      const budget = projs.reduce((s, p) => s + p.actual, 0);
      const participants = projs.reduce((s, p) => s + p.participants, 0);
      const satProjs = projs.filter(p => p.satisfaction > 0);
      const avgSat = satProjs.length > 0 ? satProjs.reduce((s, p) => s + p.satisfaction, 0) / satProjs.length : 0;
      return { budget, participants, avgSat };
    });

    const statsYear2 = activityTypes.map((type) => {
      const projs = rawList.filter((p) => String(p.academicYear) === compareYear2 && p.type === type);
      const budget = projs.reduce((s, p) => s + p.actual, 0);
      const participants = projs.reduce((s, p) => s + p.participants, 0);
      const satProjs = projs.filter(p => p.satisfaction > 0);
      const avgSat = satProjs.length > 0 ? satProjs.reduce((s, p) => s + p.satisfaction, 0) / satProjs.length : 0;
      return { budget, participants, avgSat };
    });

    return { statsYear1, statsYear2 };
  }, [semesterProjects, compareYear1, compareYear2]);

  const yoyDatasets = useMemo(() => {
    let d1: number[] = [];
    let d2: number[] = [];
    const label1 = `ปีการศึกษา ${compareYear1}`;
    const label2 = `ปีการศึกษา ${compareYear2}`;

    if (yoyMetric === 'budget') {
      d1 = yoyData.statsYear1.map(s => s.budget);
      d2 = yoyData.statsYear2.map(s => s.budget);
    } else if (yoyMetric === 'participants') {
      d1 = yoyData.statsYear1.map(s => s.participants);
      d2 = yoyData.statsYear2.map(s => s.participants);
    } else {
      d1 = yoyData.statsYear1.map(s => +s.avgSat.toFixed(2));
      d2 = yoyData.statsYear2.map(s => +s.avgSat.toFixed(2));
    }

    return [
      {
        label: label1,
        data: d1,
        backgroundColor: alpha(palette.blue, 0.25),
        borderColor: palette.blue,
        pointBackgroundColor: palette.blue,
      },
      {
        label: label2,
        data: d2,
        backgroundColor: alpha(palette.emerald, 0.25),
        borderColor: palette.emerald,
        pointBackgroundColor: palette.emerald,
      },
    ];
  }, [yoyMetric, yoyData, compareYear1, compareYear2]);

  // Cumulative budget calculation synced with selected timelineGranularity
  const quarterlyCumulativeBudgetChartData = useMemo(() => {
    let cumBudget = 0;
    let cumActual = 0;
    const budgetData: number[] = [];
    const actualData: number[] = [];

    timelineData.forEach((item) => {
      cumBudget += item.budget;
      cumActual += item.actual;
      budgetData.push(cumBudget);
      actualData.push(cumActual);
    });

    return {
      labels: timelineData.map((item) => item.label),
      datasets: [
        {
          label: 'งบอนุมัติสะสม',
          data: budgetData,
          borderColor: chartColors.approvedBudget,
          borderDash: [5, 5],
          backgroundColor: 'transparent',
          pointBackgroundColor: chartColors.approvedBudget,
          fill: false,
          tension: 0.1,
        },
        {
          label: 'งบใช้จริงสะสม',
          data: actualData,
          borderColor: chartColors.budget,
          backgroundColor: alpha(chartColors.budget, 0.08),
          pointBackgroundColor: chartColors.budget,
          fill: true,
          tension: 0.1,
        },
      ],
    };
  }, [timelineData]);

  if (loading) {
    return (
      <>
        <Topbar title="ภาพรวมโครงการทั้งหมด" subtitle="กำลังเชื่อมต่อและโหลดข้อมูลโครงการ..." />
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
        exportProjects={projectsList}
        title="ภาพรวมโครงการทั้งหมด"
        subtitle={`สรุปตัวชี้วัดหลักเชิงยุทธศาสตร์ โครงการกิจกรรมภาควิชาปีการศึกษา ${academicYear === 'all' ? 'ทุกปี' : academicYear}${semester !== 'all' ? ` (${semester === 't1' ? 'ภาคเรียนที่ 1' : semester === 't2' ? 'ภาคเรียนที่ 2' : 'ภาคฤดูร้อน'})` : ''}`}
      />
      <div className={layoutStyles.content}>

        {/* KPIs */}
        <div className={layoutStyles.kpiRow}>
          <KpiCard label="โครงการทั้งหมด" value={String(projectsList.length)} sub="โครงการ / กิจกรรม" color="navy" />
          <KpiCard label="ผู้เข้าร่วมสะสม" value={participantSum.totalParticipants.toLocaleString()} sub="คน-ครั้ง (อาจนับคนซ้ำข้ามโครงการ)" color="emerald" />
          <KpiCard label="งบประมาณรวม" value={`฿${(budgetSum.totalBudget / 1000).toFixed(0)}K`} sub={`ใช้จริง ฿${(budgetSum.totalActual / 1000).toFixed(0)}K`} trend={`เบิกจ่าย ${budgetSum.budgetUtilization.toFixed(1)}%`} color="amber" />
          <KpiCard
            label="ความพึงพอใจเฉลี่ย"
            value={qualitySum.avgSatisfaction > 0 ? qualitySum.avgSatisfaction.toFixed(2) : '-'}
            sub={qualitySum.avgSatisfaction > 0 ? 'จาก 5.00 คะแนน' : 'ยังไม่มีผลประเมิน'}
            color="purple"
          />
          <KpiCard label="บรรลุเป้าผู้เข้าร่วม" value={`${participantSum.avgAttendanceRate.toFixed(1)}%`} sub="เฉลี่ยเทียบกับเป้าหมาย" color="rose" />
          <KpiCard label="อัตราตอบแบบสอบถาม" value={projectsList.some(p => p.evalRateAvailable !== false) ? `${qualitySum.avgEvalRate.toFixed(1)}%` : 'ไม่มีข้อมูล'} sub={'ตามขอบเขตที่มีผลประเมิน'} color="teal" />
        </div>

        {/* Row 1: Lecturer Profile & YoY Multi-dimensional Comparison */}
        <div className={layoutStyles.grid2}>
          <ChartCard
            title="สัดส่วนโครงการรายอาจารย์ผู้รับผิดชอบ"
            subtitle="การกระจายตัวของจำนวนโครงการ งบประมาณ และผู้เข้าร่วมตามอาจารย์ผู้รับผิดชอบ"
            height={340}
            controls={
              <ChartControlGroup
                label="แสดงตาม:"
                options={[
                  { value: 'count', label: 'จำนวนโครงการ' },
                  { value: 'budget', label: 'งบประมาณใช้จริง' },
                  { value: 'participants', label: 'ผู้เข้าร่วม' },
                ]}
                value={identityMetric}
                onChange={setIdentityMetric}
              />
            }
          >
            <DonutChart
              labels={lecturerData.labels}
              data={lecturerData.data}
              colors={lecturerData.colors}
              showLabels={true}
              showLegend={true}
              labelCallback={lecturerData.datalabelCallback}
              tooltipLabelCallback={lecturerData.tooltipLabelCallback}
              centerLabel={lecturerData.centerLabel}
              centerSubLabel={lecturerData.centerSubLabel}
            />
          </ChartCard>

          <ChartCard
            title="เปรียบเทียบผลสัมฤทธิ์ระหว่างปีการศึกษา (YoY)"
            subtitle={`เปรียบเทียบผลงานตามประเภทโครงการระหว่างปีการศึกษาที่เลือก · ${semester === 'all' ? 'ทั้งปีการศึกษา' : semester === 't1' ? 'ภาคเรียนที่ 1 (ต้นปี)' : semester === 't2' ? 'ภาคเรียนที่ 2 (ปลายปี)' : 'ภาคฤดูร้อน'}`}
            height={340}
            controls={
              <>
                <ChartControlSelect
                  label="ดัชนี:"
                  options={[
                    { value: 'budget', label: 'งบใช้จริง' },
                    { value: 'participants', label: 'ผู้เข้าร่วม' },
                    { value: 'satisfaction', label: 'พึงพอใจ' },
                  ]}
                  value={yoyMetric}
                  onChange={(val) => setYoyMetric(val as never)}
                />
                <ChartControlSelect
                  label="ปีหลัก:"
                  options={years.map(year => ({ value: year, label: year }))}
                  value={compareYear1}
                  onChange={setCompareYear1}
                />
                <ChartControlSelect
                  label="ปีเทียบ:"
                  options={years.map(year => ({ value: year, label: year }))}
                  value={compareYear2}
                  onChange={setCompareYear2}
                />
              </>
            }
          >
            <HBarChart
              labels={[
                'วิชาการ/บัณฑิต',
                'คุณธรรมจริยธรรม',
                'กีฬา/สุขภาพ',
                'บำเพ็ญประโยชน์',
                'ศิลปวัฒนธรรม',
                'สิ่งแวดล้อม',
              ]}
              datasets={[
                {
                  label: `ปีการศึกษา ${compareYear1}`,
                  data: yoyDatasets[0]?.data ?? [],
                  backgroundColor: alpha(palette.blue, 0.88),
                  borderColor: palette.blue,
                },
                {
                  label: `ปีการศึกษา ${compareYear2}`,
                  data: yoyDatasets[1]?.data ?? [],
                  backgroundColor: alpha(palette.emerald, 0.88),
                  borderColor: palette.emerald,
                },
              ]}
              showLegend={true}
              showDatalabels={true}
              datalabelCallback={(v) => {
                if (!v) return '0';
                if (yoyMetric === 'budget') return `฿${(v / 1000).toFixed(0)}K`;
                if (yoyMetric === 'participants') return `${v} คน`;
                return `${v.toFixed(2)}`;
              }}
              xCallback={(v) => {
                if (yoyMetric === 'budget') return `฿${(v / 1000).toFixed(0)}K`;
                if (yoyMetric === 'participants') return `${v} คน`;
                return `${v}`;
              }}
            />
          </ChartCard>
        </div>

        {/* Row 2: Timeline Trend & Cumulative Budget */}
        {(() => {
          const timeUnitLabel =
            timelineGranularity === 'fiscal_quarter'
              ? 'รายไตรมาสปีงบประมาณ'
              : timelineGranularity === 'academic_quarter'
              ? 'รายไตรมาสปีการศึกษา'
              : timelineGranularity === 'fiscal_year'
              ? 'รายปีงบประมาณ'
              : timelineGranularity === 'academic_year'
              ? 'รายปีการศึกษา'
              : 'รายเดือน (มิ.ย. - พ.ค.)';

          const semesterContextLabel =
            semester === 'all'
              ? 'ทั้งปีการศึกษา'
              : semester === 't1'
              ? 'ภาคเรียนที่ 1 (ต้นปี)'
              : semester === 't2'
              ? 'ภาคเรียนที่ 2 (ปลายปี)'
              : 'ภาคฤดูร้อน';

          const yearContextLabel =
            effectiveTrendYearMode === 'default'
              ? `${academicYear === 'all' ? 'ทุกปีการศึกษา (แสดงเรียงตามลำดับเวลา)' : `ปีการศึกษา ${academicYear}`} (${semesterContextLabel})`
              : `${isFiscalGranularity ? 'ปีงบประมาณ' : 'ปีการศึกษา'} ${activeTrendYear} (${semesterContextLabel})`;

          return (
            <div className={layoutStyles.grid2}>
              <ChartCard
                title={`แนวโน้มงบประมาณและการดำเนินงาน${timeUnitLabel}`}
                subtitle={
                  lineView === 'dual'
                    ? `งบอนุมัติเปรียบเทียบงบใช้จริง ${yearContextLabel} (บาท) · ${effectiveTrendYearMode === 'default' ? 'ตามปีการศึกษาและภาคเรียนที่กรอง' : 'ตามปีของกราฟและภาคเรียนที่กรอง'}`
                    : `อัตราการเบิกจ่าย ${yearContextLabel} (%) · ${effectiveTrendYearMode === 'default' ? 'ตามปีการศึกษาและภาคเรียนที่กรอง' : 'ตามปีของกราฟและภาคเรียนที่กรอง'}`
                }
                height={340}
                controls={
                  <>
                    <ChartControlGroup
                      label="มุมมอง:"
                      options={[
                        { value: 'dual', label: 'งบอนุมัติ vs ใช้จริง' },
                        { value: 'utilization', label: 'อัตราเบิกจ่าย %' },
                      ]}
                      value={lineView}
                      onChange={setLineView}
                    />
                    <ChartControlSelect
                      label="ช่วงเวลา:"
                      options={[
                        { value: 'academic_quarter', label: 'ไตรมาสปีการศึกษา (มิ.ย. - พ.ค.)' },
                        { value: 'fiscal_quarter', label: 'ไตรมาสปีงบประมาณ (ต.ค. - ก.ย.)' },
                        { value: 'monthly', label: 'รายเดือน (มิ.ย. - พ.ค.)' },
                        { value: 'academic_year', label: 'รายปีการศึกษา' },
                        { value: 'fiscal_year', label: 'รายปีงบประมาณ' },
                      ]}
                      value={timelineGranularity}
                      onChange={(val) => { setTimelineGranularity(val as typeof timelineGranularity); setTrendYearMode('default'); }}
                    />
                    <ChartControlSelect
                      label="ปี:"
                      options={[
                        { value: 'default', label: 'ตามตัวกรอง' },
                        ...timelineYears.map(year => ({ value: year, label: `${isFiscalGranularity ? 'ปีงบประมาณ' : 'ปีการศึกษา'} ${year}` })),
                      ]}
                      value={effectiveTrendYearMode}
                      onChange={(val) => setTrendYearMode(val as never)}
                    />
                  </>
                }
              >
                <LineChart
                  labels={timelineData.map((q) => q.label)}
                  datasets={lineDatasets}
                  yCallback={lineView === 'dual' ? (v) => `฿${(+v / 1000).toFixed(0)}K` : (v) => `${v}%`}
                  showDatalabels
                  datalabelCallback={lineView === 'dual' ? (v) => `฿${(v / 1000).toFixed(0)}K` : (v) => `${v}%`}
                  tooltipTitleCallback={(idx) => timelineData[idx]?.fullLabel || timelineData[idx]?.label || ''}
                />
              </ChartCard>

              <ChartCard
                title={`งบประมาณสะสม${timeUnitLabel}`}
                subtitle={`เปรียบเทียบงบอนุมัติและงบใช้จริงสะสม ${yearContextLabel}`}
                height={340}
                controls={
                  <ChartControlSelect
                    label="ช่วงเวลา:"
                    options={[
                      { value: 'academic_quarter', label: 'ไตรมาสปีการศึกษา' },
                      { value: 'fiscal_quarter', label: 'ไตรมาสปีงบประมาณ' },
                      { value: 'monthly', label: 'รายเดือน (มิ.ย.-พ.ค.)' },
                      { value: 'academic_year', label: 'รายปีการศึกษา' },
                      { value: 'fiscal_year', label: 'รายปีงบประมาณ' },
                    ]}
                    value={timelineGranularity}
                    onChange={(val) => setTimelineGranularity(val as typeof timelineGranularity)}
                  />
                }
              >
                <LineChart
                  labels={quarterlyCumulativeBudgetChartData.labels}
                  datasets={quarterlyCumulativeBudgetChartData.datasets}
                  yCallback={(v) => `฿${(+v / 1000).toLocaleString()}K`}
                  showDatalabels
                  datalabelCallback={(v) => `฿${(v / 1000).toFixed(0)}K`}
                  tooltipTitleCallback={(idx) => timelineData[idx]?.fullLabel || timelineData[idx]?.label || ''}
                />
              </ChartCard>
            </div>
          );
        })()}

        {/* Row 3: Full-width Dual Horizontal Bar Chart (Cost Efficiency & Satisfaction) */}
        <div className={layoutStyles.grid1}>
          <ChartCard
            title="ต้นทุนจัดกิจกรรมเฉลี่ยต่อหัวและความพึงพอใจรายโครงการ"
            coverage={projectCoverage(filteredOverviewProjects, ['actual', 'participants', 'satisfaction'], ['participants'])}
            subtitle="เปรียบเทียบความพึงพอใจ (เต็ม 5 คะแนน) และต้นทุนต่อคน · เรียงตามต้นทุนต่อคน"
            badge={`แสดง ${visibleOverviewProjects.length} โครงการ`}
            autoHeight
            controls={
              <>
              <ChartControlSelect
                label="กรองตามอัตลักษณ์ KU:"
                options={[
                  { value: 'all', label: 'ทุกอัตลักษณ์ (I-D-K-U)' },
                  { value: 'I', label: 'Integrity (คุณธรรม)' },
                  { value: 'D', label: 'Determination (มุ่งมั่น)' },
                  { value: 'K', label: 'Knowledge (ปัญญา)' },
                  { value: 'U', label: 'Utility (ก้าวหน้า)' },
                ]}
                value={bubbleCategory}
                onChange={setBubbleCategory}
              />
              <ChartListControls
                direction={comparisonDirection}
                onDirectionChange={setComparisonDirection}
                limit={comparisonLimit}
                onLimitChange={setComparisonLimit}
                totalCount={validOverviewProjects.length}
              />
              </>
            }
          >
            <ProjectComparison projects={visibleOverviewProjects} onProjectClick={handleOverviewTornadoClick} />
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
