import { participantReferenceYear, scopeParticipants, participantAttendanceRate } from './participantScope';
// lib/exportExcel.ts — Executive-Grade Excel Export Engine with Full Visual Styling & Embedded Charts
// Uses ExcelJS for rich styling (fills, fonts, borders, zebra striping, frozen headers) and embeds high-res Chart.js PNG graphs.

import ExcelJS from 'exceljs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  BarController,
  DoughnutController,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

import { Project, KUIdentity, calculateQualitySummary } from '@/lib/mockData';
import { getParticipants } from '@/lib/mockParticipants';
import type { Participant } from '@/lib/mockParticipants';
import { getParticipantRoster } from '@/lib/db/dataService';
import { academicYears, safeRatio, NOT_CALCULABLE, projectDateContext } from '@/lib/reportUtils';
import { getDynamicCohortList, resolveStudentCohortDynamic } from '@/lib/cohortUtils';
import { defaultPloDefinitions, ploShortDesc } from '@/lib/ploLabels';

// Register Chart.js components for offscreen rendering
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  BarController,
  DoughnutController,
  ChartDataLabels
);

export interface ExportOptions {
  academicYear?: string;
  semester?: string;
  exportType?: 'full' | 'projects-only' | 'participants-only';
  filenamePrefix?: string;
}

// ─── Theme Colors ─────────────────────────────────────────────────────────────
const THEME = {
  headerBg: 'FF1E293B',       // Deep Slate Navy
  headerText: 'FFFFFFFF',     // White
  subHeaderBg: 'FFF8FAFC',    // Ice Gray
  subHeaderText: 'FF475569',  // Slate Muted
  zebraOdd: 'FFF8FAFC',       // Subtle alternating row
  zebraEven: 'FFFFFFFF',      // Pure white
  borderLight: 'FFE2E8F0',    // Soft border
  borderMedium: 'FF94A3B8',   // Medium border
  borderDark: 'FF0F172A',     // Dark border for double lines
  summaryBg: 'FFF1F5F9',      // Slate Summary background
  
  // KPI Card Colors
  kpiBlueBg: 'FFEFF6FF',
  kpiBlueBorder: 'FFBFDBFE',
  kpiBlueText: 'FF1E40AF',

  kpiGreenBg: 'FFF0FDF4',
  kpiGreenBorder: 'FFBBF7D0',
  kpiGreenText: 'FF15803D',

  kpiTealBg: 'FFF0FDFA',
  kpiTealBorder: 'FF99F6E4',
  kpiTealText: 'FF0F766E',

  kpiPurpleBg: 'FFFAF5FF',
  kpiPurpleBorder: 'FFE9D5FF',
  kpiPurpleText: 'FF7E22CE',

  kpiAmberBg: 'FFFFFBEB',
  kpiAmberBorder: 'FFFDE68A',
  kpiAmberText: 'FFB45309',
};

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

function formatThaiDateDisplay(dateStr?: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.trim().split('-');
  if (parts.length < 3) return dateStr;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;
  const bYear = y < 2400 ? y + 543 : y;
  return `${d} ${THAI_MONTHS_SHORT[m - 1] || ''} ${bYear}`;
}

function formatActivityDateRange(startDate?: string, endDate?: string): string {
  if (!startDate) return 'ไม่ระบุวันที่';
  if (!endDate || startDate === endDate) {
    return formatThaiDateDisplay(startDate);
  }
  return `${formatThaiDateDisplay(startDate)} - ${formatThaiDateDisplay(endDate)}`;
}

function getThaiTimestamp(): string {
  const now = new Date();
  const d = now.getDate();
  const m = THAI_MONTHS_SHORT[now.getMonth()];
  const y = now.getFullYear() + 543;
  const time = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  return `${d} ${m} ${y} เวลา ${time} น.`;
}

function getSemesterLabel(semester: string): string {
  if (semester === 't1') return 'ภาคเรียนที่ 1 (ต้นปี)';
  if (semester === 't2') return 'ภาคเรียนที่ 2 (ปลายปี)';
  if (semester === 'summer') return 'ภาคฤดูร้อน';
  return 'ทั้งปีการศึกษา (ทุกภาคเรียน)';
}

// ─── Offscreen Chart Generation to Base64 PNG ──────────────────────────────────

function renderBudgetChartBase64(allProjects: Project[]): string {
  if (typeof window === 'undefined') return '';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 750;
    canvas.height = 380;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Solid white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const years = academicYears(allProjects).reverse();
    const budgetData = years.map((yr) =>
      allProjects.filter((p) => p.academicYear === yr).reduce((s, p) => s + p.budget, 0)
    );
    const actualData = years.map((yr) =>
      allProjects.filter((p) => p.academicYear === yr).reduce((s, p) => s + p.actual, 0)
    );

    const chart = new ChartJS(ctx, {
      type: 'bar',
      data: {
        labels: years.map(year => `ปีการศึกษา ${year}`),
        datasets: [
          {
            label: 'งบประมาณอนุมัติ (บาท)',
            data: budgetData,
            backgroundColor: '#1E61F0', // Cobalt
            borderRadius: 6,
            barPercentage: 0.7,
            categoryPercentage: 0.6,
          },
          {
            label: 'งบประมาณใช้จริง (บาท)',
            data: actualData,
            backgroundColor: '#10B981', // Emerald
            borderRadius: 6,
            barPercentage: 0.7,
            categoryPercentage: 0.6,
          },
        ],
      },
      options: {
        animation: false,
        responsive: false,
        layout: { padding: { top: 20, right: 25, bottom: 15, left: 20 } },
        plugins: {
          title: {
            display: true,
            text: 'เปรียบเทียบงบประมาณที่ได้รับอนุมัติ vs เบิกจ่ายจริง จำแนกตามปีการศึกษา',
            font: { size: 14, family: 'Sarabun', weight: 'bold' },
            color: '#0F172A',
            padding: { top: 6, bottom: 16 },
          },
          legend: {
            position: 'top',
            labels: { font: { size: 12, family: 'Sarabun', weight: 'bold' }, color: '#334155' },
          },
          datalabels: {
            anchor: 'end',
            align: 'top',
            color: '#0F172A',
            font: { size: 10.5, family: 'Sarabun', weight: 'bold' },
            formatter: (v: number) => (v > 0 ? `฿${(v / 1000).toFixed(0)}k` : '0'),
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (v: string | number) => `฿${(Number(v) / 1000).toLocaleString()}k`,
              font: { size: 11, family: 'Sarabun' },
              color: '#64748B',
            },
            grid: { color: '#F1F5F9' },
          },
          x: {
            ticks: { font: { size: 12, family: 'Sarabun', weight: 'bold' }, color: '#334155' },
            grid: { display: false },
          },
        },
      },
    });

    const base64 = canvas.toDataURL('image/png');
    chart.destroy();
    return base64;
  } catch (err) {
    console.error('Failed to render budget chart:', err);
    return '';
  }
}

function renderIDKUChartBase64(filteredProjects: Project[]): string {
  if (typeof window === 'undefined') return '';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 750;
    canvas.height = 380;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const kuKeys: KUIdentity[] = ['K', 'U', 'D', 'I'];
    const kuLabels = [
      'K: Knowledge (วิชาการ)',
      'U: Utility (ใช้ประโยชน์)',
      'D: Decency (คุณธรรม)',
      'I: Innovation (นวัตกรรม)',
    ];
    const kuCounts = kuKeys.map(
      (k) => filteredProjects.filter((p) => p.kuList.includes(k)).length
    );

    const chart = new ChartJS(ctx, {
      type: 'bar',
      data: {
        labels: kuLabels,
        datasets: [
          {
            label: 'จำนวนโครงการที่ส่งเสริม',
            data: kuCounts,
            backgroundColor: ['#1E40AF', '#059669', '#D97706', '#0D9488'],
            borderRadius: 6,
            barThickness: 28,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        animation: false,
        responsive: false,
        layout: { padding: { top: 20, right: 40, bottom: 15, left: 20 } },
        plugins: {
          title: {
            display: true,
            text: 'การกระจายตัวของโครงการตามด้านอัตลักษณ์นิสิต มก. (IDKU)',
            font: { size: 14, family: 'Sarabun', weight: 'bold' },
            color: '#0F172A',
            padding: { top: 6, bottom: 16 },
          },
          legend: { display: false },
          datalabels: {
            anchor: 'end',
            align: 'right',
            color: '#0F172A',
            font: { size: 11.5, family: 'Sarabun', weight: 'bold' },
            formatter: (v: number) => `${v} โครงการ`,
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { stepSize: 1, font: { size: 11, family: 'Sarabun' }, color: '#64748B' },
            grid: { color: '#F1F5F9' },
          },
          y: {
            ticks: { font: { size: 11.5, family: 'Sarabun', weight: 'bold' }, color: '#334155' },
            grid: { display: false },
          },
        },
      },
    });

    const base64 = canvas.toDataURL('image/png');
    chart.destroy();
    return base64;
  } catch (err) {
    console.error('Failed to render IDKU chart:', err);
    return '';
  }
}

// ─── Sheet 1: Executive Summary with KPI Cards & Charts ────────────────────────

function buildExecutiveSummarySheet(
  wb: ExcelJS.Workbook,
  filteredProjects: Project[],
  allProjects: Project[],
  academicYear: string,
  semester: string
) {
  const ws = wb.addWorksheet('ภาพรวม_Executive_Summary', {
    views: [{ showGridLines: true }],
  });

  const totalProjects = filteredProjects.length;
  const totalBudget = filteredProjects.reduce((s, p) => s + p.budget, 0);
  const totalActual = filteredProjects.reduce((s, p) => s + p.actual, 0);
  const budgetUtilization = totalBudget > 0 ? totalActual / totalBudget : 0;
  const totalParticipants = filteredProjects.reduce((s, p) => s + p.participants, 0);
  const quality = calculateQualitySummary(filteredProjects);

  const yearLabel = academicYear === 'all' ? 'ทุกปีการศึกษา' : `ปีการศึกษา ${academicYear}`;
  const semLabel = getSemesterLabel(semester);

  // Row 2: Title Banner
  ws.mergeCells('B2:K2');
  const titleCell = ws.getCell('B2');
  titleCell.value = 'รายงานสรุปผลการดำเนินงานโครงการและงบประมาณ (Executive Summary Report)';
  titleCell.font = { name: 'Sarabun', size: 15, bold: true, color: { argb: THEME.headerText } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.headerBg } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(2).height = 38;

  // Row 3: Subtitle Banner
  ws.mergeCells('B3:K3');
  const subCell = ws.getCell('B3');
  subCell.value = `ระบบบริหารและวิเคราะห์กิจกรรมนิสิต (CPE Dashboard Demo) | ขอบเขต: ${yearLabel} | ${semLabel} | ออกรายงาน: ${getThaiTimestamp()}`;
  subCell.font = { name: 'Sarabun', size: 10.5, italic: true, color: { argb: THEME.subHeaderText } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.subHeaderBg } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(3).height = 24;

  // Row 5 & 6: Executive KPI Cards (Styled Blocks)
  // Card 1: Total Projects (B5:C6)
  ws.mergeCells('B5:C5');
  ws.mergeCells('B6:C6');
  const c1Label = ws.getCell('B5');
  c1Label.value = 'จำนวนโครงการทั้งหมด';
  c1Label.font = { name: 'Sarabun', size: 10, bold: true, color: { argb: THEME.kpiBlueText } };
  c1Label.alignment = { horizontal: 'center', vertical: 'middle' };
  const c1Val = ws.getCell('B6');
  c1Val.value = totalProjects;
  c1Val.font = { name: 'Sarabun', size: 16, bold: true, color: { argb: 'FF0F172A' } };
  c1Val.alignment = { horizontal: 'center', vertical: 'middle' };
  applyCardBox(ws, 'B', 'C', 5, 6, THEME.kpiBlueBg, THEME.kpiBlueBorder);

  // Card 2: Total Budget (D5:E6)
  ws.mergeCells('D5:E5');
  ws.mergeCells('D6:E6');
  const c2Label = ws.getCell('D5');
  c2Label.value = 'งบประมาณที่อนุมัติรวม';
  c2Label.font = { name: 'Sarabun', size: 10, bold: true, color: { argb: 'FF475569' } };
  c2Label.alignment = { horizontal: 'center', vertical: 'middle' };
  const c2Val = ws.getCell('D6');
  c2Val.value = totalBudget;
  c2Val.numFmt = '฿#,##0.00';
  c2Val.font = { name: 'Sarabun', size: 14, bold: true, color: { argb: 'FF0F172A' } };
  c2Val.alignment = { horizontal: 'center', vertical: 'middle' };
  applyCardBox(ws, 'D', 'E', 5, 6, 'FFF1F5F9', 'FFCBD5E1');

  // Card 3: Total Spent (F5:G6)
  ws.mergeCells('F5:G5');
  ws.mergeCells('F6:G6');
  const c3Label = ws.getCell('F5');
  c3Label.value = 'งบประมาณเบิกจ่ายจริง';
  c3Label.font = { name: 'Sarabun', size: 10, bold: true, color: { argb: THEME.kpiGreenText } };
  c3Label.alignment = { horizontal: 'center', vertical: 'middle' };
  const c3Val = ws.getCell('F6');
  c3Val.value = totalActual;
  c3Val.numFmt = '฿#,##0.00';
  c3Val.font = { name: 'Sarabun', size: 14, bold: true, color: { argb: THEME.kpiGreenText } };
  c3Val.alignment = { horizontal: 'center', vertical: 'middle' };
  applyCardBox(ws, 'F', 'G', 5, 6, THEME.kpiGreenBg, THEME.kpiGreenBorder);

  // Card 4: Utilization Rate (H5:H6)
  ws.mergeCells('H5:H5');
  ws.mergeCells('H6:H6');
  const c4Label = ws.getCell('H5');
  c4Label.value = 'อัตราเบิกจ่าย';
  c4Label.font = { name: 'Sarabun', size: 10, bold: true, color: { argb: THEME.kpiTealText } };
  c4Label.alignment = { horizontal: 'center', vertical: 'middle' };
  const c4Val = ws.getCell('H6');
  c4Val.value = budgetUtilization;
  c4Val.numFmt = '0.0%';
  c4Val.font = { name: 'Sarabun', size: 16, bold: true, color: { argb: THEME.kpiTealText } };
  c4Val.alignment = { horizontal: 'center', vertical: 'middle' };
  applyCardBox(ws, 'H', 'H', 5, 6, THEME.kpiTealBg, THEME.kpiTealBorder);

  // Card 5: Participants (I5:I6)
  ws.mergeCells('I5:I5');
  ws.mergeCells('I6:I6');
  const c5Label = ws.getCell('I5');
  c5Label.value = 'ผู้เข้าร่วมรวม';
  c5Label.font = { name: 'Sarabun', size: 10, bold: true, color: { argb: THEME.kpiAmberText } };
  c5Label.alignment = { horizontal: 'center', vertical: 'middle' };
  const c5Val = ws.getCell('I6');
  c5Val.value = totalParticipants;
  c5Val.numFmt = '#,##0 "คน"';
  c5Val.font = { name: 'Sarabun', size: 14, bold: true, color: { argb: THEME.kpiAmberText } };
  c5Val.alignment = { horizontal: 'center', vertical: 'middle' };
  applyCardBox(ws, 'I', 'I', 5, 6, THEME.kpiAmberBg, THEME.kpiAmberBorder);

  // Card 6: Satisfaction (J5:K6)
  ws.mergeCells('J5:K5');
  ws.mergeCells('J6:K6');
  const c6Label = ws.getCell('J5');
  c6Label.value = 'ความพึงพอใจเฉลี่ย';
  c6Label.font = { name: 'Sarabun', size: 10, bold: true, color: { argb: THEME.kpiPurpleText } };
  c6Label.alignment = { horizontal: 'center', vertical: 'middle' };
  const c6Val = ws.getCell('J6');
  c6Val.value = `${quality.avgSatisfaction.toFixed(2)} / 5.00`;
  c6Val.font = { name: 'Sarabun', size: 14, bold: true, color: { argb: THEME.kpiPurpleText } };
  c6Val.alignment = { horizontal: 'center', vertical: 'middle' };
  applyCardBox(ws, 'J', 'K', 5, 6, THEME.kpiPurpleBg, THEME.kpiPurpleBorder);

  ws.getRow(5).height = 20;
  ws.getRow(6).height = 28;

  // ─── Embed Visual Charts into Worksheet ─────────────────────────────────────
  const budgetChartBase64 = renderBudgetChartBase64(allProjects);
  if (budgetChartBase64) {
    const imgId = wb.addImage({
      base64: budgetChartBase64,
      extension: 'png',
    });
    ws.addImage(imgId, 'B8:F21');
  }

  const idkuChartBase64 = renderIDKUChartBase64(filteredProjects);
  if (idkuChartBase64) {
    const imgId = wb.addImage({
      base64: idkuChartBase64,
      extension: 'png',
    });
    ws.addImage(imgId, 'G8:K21');
  }

  // Row 23: Spacer after charts
  const startTableRow = 23;

  // ─── Table 1: Academic Year Comparison ──────────────────────────────────────
  ws.mergeCells(`B${startTableRow}:J${startTableRow}`);
  const t1Header = ws.getCell(`B${startTableRow}`);
  t1Header.value = 'ตารางที่ 1: สรุปผลการดำเนินงานเปรียบเทียบรายปีการศึกษา (Academic Year Breakdown)';
  t1Header.font = { name: 'Sarabun', size: 11.5, bold: true, color: { argb: THEME.headerText } };
  t1Header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.headerBg } };
  t1Header.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(startTableRow).height = 26;

  const t1Cols = ['ปีการศึกษา', 'จำนวนโครงการ', 'งบอนุมัติ (บาท)', 'งบใช้จริง (บาท)', 'งบคงเหลือ (บาท)', 'อัตราเบิกจ่าย (%)', 'ผู้เข้าร่วม (คน)', 'ความพึงพอใจเฉลี่ย', 'หมายเหตุ'];
  const t1ColRow = ws.getRow(startTableRow + 1);
  t1ColRow.values = ['', ...t1Cols];
  t1ColRow.height = 24;
  styleSubHeaderRow(t1ColRow, 2, 10);

  let curRow = startTableRow + 2;
  const years = academicYears(allProjects).reverse();
  for (let i = 0; i < years.length; i++) {
    const yr = years[i];
    const yrProjs = allProjects.filter((p) => p.academicYear === yr);
    const yrCount = yrProjs.length;
    const yrBud = yrProjs.reduce((s, p) => s + p.budget, 0);
    const yrAct = yrProjs.reduce((s, p) => s + p.actual, 0);
    const yrRem = yrBud - yrAct;
    const yrRate = yrBud > 0 ? yrAct / yrBud : 0;
    const yrPart = yrProjs.reduce((s, p) => s + p.participants, 0);
    const yrQual = calculateQualitySummary(yrProjs);

    const r = ws.getRow(curRow);
    r.values = [
      '',
      `ปีการศึกษา ${yr}`,
      yrCount,
      yrBud,
      yrAct,
      yrRem,
      yrRate,
      yrPart,
      yrQual.avgSatisfaction > 0 ? yrQual.avgSatisfaction : 0,
      '',
    ];
    r.height = 22;
    styleDataRow(r, 2, 10, i % 2 === 1);
    r.getCell(4).numFmt = '#,##0.00';
    r.getCell(5).numFmt = '#,##0.00';
    r.getCell(6).numFmt = '#,##0.00';
    r.getCell(7).numFmt = '0.0%';
    r.getCell(8).numFmt = '#,##0';
    r.getCell(9).numFmt = '0.00';
    curRow++;
  }

  // ─── Table 2: IDKU Alignment ────────────────────────────────────────────────
  curRow += 2;
  ws.mergeCells(`B${curRow}:J${curRow}`);
  const t2Header = ws.getCell(`B${curRow}`);
  t2Header.value = 'ตารางที่ 2: สรุปการส่งเสริมอัตลักษณ์นิสิต (IDKU Alignment)';
  t2Header.font = { name: 'Sarabun', size: 11.5, bold: true, color: { argb: THEME.headerText } };
  t2Header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.headerBg } };
  t2Header.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(curRow).height = 26;

  curRow++;
  const t2Cols = ['รหัส', 'ด้านอัตลักษณ์นิสิต มก.', 'คำอธิบายความหมาย', 'จำนวนโครงการ', 'งบประมาณใช้จริง (บาท)', 'จำนวนผู้เข้าร่วม (คน)', '', '', ''];
  const t2ColRow = ws.getRow(curRow);
  t2ColRow.values = ['', ...t2Cols];
  t2ColRow.height = 24;
  styleSubHeaderRow(t2ColRow, 2, 7);

  const kuDefinitions: Record<KUIdentity, { name: string; desc: string }> = {
    K: { name: 'Knowledge', desc: 'ศาสตร์แห่งแผ่นดิน (ความรู้ทางวิชาการและทฤษฎี)' },
    U: { name: 'Utility', desc: 'การสร้างประโยชน์ (ความรู้ที่นำไปประยุกต์ใช้เพื่อสังคม)' },
    D: { name: 'Decency', desc: 'คุณธรรม จริยธรรม (ความซื่อสัตย์สุจริตและจิตสาธารณะ)' },
    I: { name: 'Integrity / Innovation', desc: 'นวัตกรรมและความซื่อตรง (ความคิดสร้างสรรค์และเทคโนโลยี)' },
  };

  const kuKeys: KUIdentity[] = ['K', 'U', 'D', 'I'];
  curRow++;
  kuKeys.forEach((key, idx) => {
    const matched = filteredProjects.filter((p) => p.kuList.includes(key));
    const kAct = matched.reduce((s, p) => s + p.actual, 0);
    const kPart = matched.reduce((s, p) => s + p.participants, 0);

    const r = ws.getRow(curRow);
    r.values = [
      '',
      key,
      kuDefinitions[key].name,
      kuDefinitions[key].desc,
      matched.length,
      kAct,
      kPart,
    ];
    r.height = 22;
    styleDataRow(r, 2, 7, idx % 2 === 1);
    r.getCell(6).numFmt = '#,##0.00';
    r.getCell(7).numFmt = '#,##0';
    curRow++;
  });

  // Set friendly column widths for Sheet 1
  ws.getColumn(1).width = 3;  // Column A spacer
  ws.getColumn(2).width = 16; // Column B
  ws.getColumn(3).width = 22; // Column C
  ws.getColumn(4).width = 28; // Column D
  ws.getColumn(5).width = 20; // Column E
  ws.getColumn(6).width = 20; // Column F
  ws.getColumn(7).width = 18; // Column G
  ws.getColumn(8).width = 16; // Column H
  ws.getColumn(9).width = 18; // Column I
  ws.getColumn(10).width = 20; // Column J
  ws.getColumn(11).width = 16; // Column K
}

// ─── Sheet 2: Projects Registry Table with Styling & Formulas ─────────────────

function buildProjectsRegistrySheet(wb: ExcelJS.Workbook, projects: Project[], sheetTitle: string = 'ทะเบียนโครงการ_Projects') {
  const ws = wb.addWorksheet(sheetTitle, {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: true }],
  });

  const headers = [
    'ลำดับ',
    'รหัสโครงการ',
    'ชื่อโครงการ',
    'ประเภทกิจกรรม',
    'อาจารย์ผู้รับผิดชอบ',
    'ปีการศึกษา',
    'ปีงบประมาณ (พ.ศ.)',
    'ภาคเรียน',
    'วันที่จัดกิจกรรม',
    'ระยะเวลา (ชม.)',
    'งบอนุมัติ (บาท)',
    'งบใช้จริง (บาท)',
    'งบคงเหลือ (บาท)',
    'อัตราเบิกจ่าย (%)',
    'เป้าหมาย (คน)',
    'ผู้เข้าร่วมจริง (คน)',
    'บรรลุเป้าหมาย (%)',
    'ความพึงพอใจ (5.00)',
    'อัตราตอบประเมิน (%)',
    'ต้นทุนต่อนิสิต (บาท)',
    'อัตลักษณ์ KU',
    'SDGs ที่สอดคล้อง',
    'PLO ที่ตอบสนอง',
    'กลยุทธ์ย่อย (ยุทธศาสตร์ 1)',
  ];

  const headerRow = ws.getRow(1);
  headerRow.values = headers;
  headerRow.height = 32;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Sarabun', size: 11, bold: true, color: { argb: THEME.headerText } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.headerBg } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF475569' } },
      bottom: { style: 'medium', color: { argb: THEME.borderDark } },
    };
  });

  // Enable Excel Native Autofilter
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  };

  projects.forEach((p, idx) => {
    const rowIdx = idx + 2;
    const remaining = p.budget - p.actual;
    const utilRate = safeRatio(p.actual, p.budget) ?? NOT_CALCULABLE;
    const achieveRate = safeRatio(p.participants, p.target) ?? NOT_CALCULABLE;
    const costPerHead = safeRatio(p.actual, p.participants) ?? NOT_CALCULABLE;
    const evalRateDecimal = p.evalRateAvailable === false ? 'ไม่มีข้อมูล' : p.evalRate > 0 ? p.evalRate / 100 : 0;
    const fiscalYear = projectDateContext(p.startDate)?.fiscalYearBE;

    let semText = '-';
    if (p.semester === 't1') semText = 'ภาคต้น';
    else if (p.semester === 't2') semText = 'ภาคปลาย';
    else if (p.semester === 'summer') semText = 'ภาคฤดูร้อน';

    const r = ws.getRow(rowIdx);
    r.values = [
      idx + 1,
      p.code || '-',
      p.name,
      p.type,
      p.lecturer || 'ไม่ระบุ',
      p.academicYear ? String(p.academicYear) : '-',
      fiscalYear ? String(fiscalYear) : '-',
      semText,
      formatActivityDateRange(p.startDate, p.endDate),
      p.hours,
      p.budget,
      p.actual,
      remaining,
      utilRate,
      p.target,
      p.participants,
      achieveRate,
      p.satisfaction > 0 ? p.satisfaction : '-',
      evalRateDecimal,
      costPerHead,
      p.kuList.length > 0 ? p.kuList.join(', ') : '-',
      p.sdgList.length > 0 ? p.sdgList.map((s) => `SDG ${s}`).join(', ') : '-',
      p.plo.length > 0 ? p.plo.map((pl) => `PLO ${pl} (${ploShortDesc(pl)})`).join(', ') : '-',
      p.strategySubs.length > 0 ? p.strategySubs.map((s) => `กลยุทธ์ ${s}`).join(', ') : '-',
    ];
    r.height = 24;

    const isOdd = idx % 2 === 1;
    const bg = isOdd ? THEME.zebraOdd : THEME.zebraEven;

    r.eachCell((cell, colNum) => {
      cell.font = { name: 'Sarabun', size: 10.5 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.border = {
        top: { style: 'thin', color: { argb: THEME.borderLight } },
        bottom: { style: 'thin', color: { argb: THEME.borderLight } },
        left: { style: 'thin', color: { argb: THEME.borderLight } },
        right: { style: 'thin', color: { argb: THEME.borderLight } },
      };

      // Alignment
      if ([1, 2, 6, 7, 8, 9, 21, 22, 23, 24].includes(colNum)) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if ([3, 4, 5].includes(colNum)) {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      }

      // Formatting
      if ([11, 12, 13, 20].includes(colNum)) cell.numFmt = '#,##0.00';
      if ([14, 17, 19].includes(colNum)) cell.numFmt = '0.0%';
      if ([10, 15, 16].includes(colNum)) cell.numFmt = '#,##0';
      if (colNum === 18 && typeof cell.value === 'number') cell.numFmt = '0.00';
    });
  });

  // Summary Row with universal accounting double-underline
  if (projects.length > 0) {
    const endRow = projects.length + 1;
    const sumRowIdx = endRow + 1;
    const totalBud = projects.reduce((s, p) => s + p.budget, 0);
    const totalAct = projects.reduce((s, p) => s + p.actual, 0);
    const totalRem = totalBud - totalAct;
    const totalTar = projects.reduce((s, p) => s + p.target, 0);
    const totalPart = projects.reduce((s, p) => s + p.participants, 0);
    const totalHours = projects.reduce((s, p) => s + p.hours, 0);
    const quality = calculateQualitySummary(projects);
    const overallUtil = safeRatio(totalAct, totalBud) ?? NOT_CALCULABLE;
    const overallAchieve = safeRatio(totalPart, totalTar) ?? NOT_CALCULABLE;
    const overallCost = safeRatio(totalAct, totalPart) ?? NOT_CALCULABLE;

    const sumRow = ws.getRow(sumRowIdx);
    sumRow.values = [
      'รวมทั้งสิ้น / เฉลี่ย',
      '',
      `รวม ${projects.length} โครงการ`,
      '',
      '',
      '',
      '',
      '',
      '',
      { formula: `SUM(J2:J${endRow})`, result: totalHours },
      { formula: `SUM(K2:K${endRow})`, result: totalBud },
      { formula: `SUM(L2:L${endRow})`, result: totalAct },
      { formula: `SUM(M2:M${endRow})`, result: totalRem },
      { formula: `IFERROR(L${sumRowIdx}/K${sumRowIdx},"ไม่สามารถคำนวณได้")`, result: overallUtil },
      { formula: `SUM(O2:O${endRow})`, result: totalTar },
      { formula: `SUM(P2:P${endRow})`, result: totalPart },
      { formula: `IFERROR(P${sumRowIdx}/O${sumRowIdx},"ไม่สามารถคำนวณได้")`, result: overallAchieve },
      quality.avgSatisfaction > 0 ? quality.avgSatisfaction : '-',
      !projects.some(p => p.evalRateAvailable !== false) ? 'ไม่มีข้อมูล' : quality.avgEvalRate > 0 ? quality.avgEvalRate / 100 : 0,
      { formula: `IFERROR(L${sumRowIdx}/P${sumRowIdx},"ไม่สามารถคำนวณได้")`, result: overallCost },
      '',
      '',
      '',
      '',
    ];
    sumRow.height = 30;

    sumRow.eachCell((cell, colNum) => {
      cell.font = { name: 'Sarabun', size: 11, bold: true, color: { argb: 'FF0F172A' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.summaryBg } };
      cell.border = {
        top: { style: 'thin', color: { argb: THEME.borderMedium } },
        bottom: { style: 'double', color: { argb: THEME.borderDark } },
      };

      if ([1, 2].includes(colNum)) cell.alignment = { vertical: 'middle', horizontal: 'center' };
      if ([3].includes(colNum)) cell.alignment = { vertical: 'middle', horizontal: 'left' };
      if ([11, 12, 13, 20].includes(colNum)) cell.numFmt = '#,##0.00';
      if ([14, 17, 19].includes(colNum)) cell.numFmt = '0.0%';
      if ([10, 15, 16].includes(colNum)) cell.numFmt = '#,##0';
      if (colNum === 18 && typeof cell.value === 'number') cell.numFmt = '0.00';
    });
  }

  autoFitColumns(ws);
}

// ─── Sheet 3: Strategic Alignment & SDGs Matrix ────────────────────────────────

function buildStrategicSheet(wb: ExcelJS.Workbook, projects: Project[]) {
  const ws = wb.addWorksheet('ยุทธศาสตร์_SDGs_PLO', {
    views: [{ showGridLines: true }],
  });

  // Title Banner
  ws.mergeCells('B2:H2');
  const title = ws.getCell('B2');
  title.value = 'การวิเคราะห์ความสอดคล้องเชิงยุทธศาสตร์และเป้าหมาย SDGs / PLO';
  title.font = { name: 'Sarabun', size: 15, bold: true, color: { argb: THEME.headerText } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.headerBg } };
  title.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(2).height = 36;

  // Table 1: SDGs Matrix
  let curRow = 4;
  ws.mergeCells(`B${curRow}:G${curRow}`);
  const t1 = ws.getCell(`B${curRow}`);
  t1.value = 'ตารางที่ 1: การตอบสนองเป้าหมายการพัฒนาที่ยั่งยืนแห่งสหประชาชาติ (UN SDGs Compliance)';
  t1.font = { name: 'Sarabun', size: 11.5, bold: true, color: { argb: THEME.headerText } };
  t1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } }; // Deep Teal
  t1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(curRow).height = 26;

  curRow++;
  const t1Cols = ['เป้าหมาย SDG', 'ชื่อเป้าหมายการพัฒนาที่ยั่งยืน', 'จำนวนโครงการ', 'รายชื่อโครงการที่เกี่ยวข้อง', 'งบประมาณใช้จริง (บาท)', 'ผู้เข้าร่วม (คน)'];
  const t1ColRow = ws.getRow(curRow);
  t1ColRow.values = ['', ...t1Cols];
  t1ColRow.height = 24;
  styleSubHeaderRow(t1ColRow, 2, 7);

  const sdgDefinitions: Record<number, string> = {
    4: 'การศึกษาที่เท่าเทียมและมีคุณภาพ (Quality Education)',
    8: 'การจ้างงานที่มีคุณค่าและการเติบโตทางเศรษฐกิจ (Decent Work & Economic Growth)',
    9: 'อุตสาหกรรม นวัตกรรม และโครงสร้างพื้นฐาน (Industry, Innovation & Infrastructure)',
    11: 'เมืองและชุมชนที่ยั่งยืน (Sustainable Cities & Communities)',
    12: 'การบริโภคและการผลิตที่ยั่งยืน (Responsible Consumption & Production)',
  };

  const sdgKeys = [4, 8, 9, 11, 12];
  curRow++;
  sdgKeys.forEach((sdgNum, idx) => {
    const matched = projects.filter((p) => p.sdgList.includes(sdgNum));
    const actSum = matched.reduce((s, p) => s + p.actual, 0);
    const partSum = matched.reduce((s, p) => s + p.participants, 0);
    const projectNames = matched.map((p) => p.name).join('; ') || 'ไม่มีโครงการระบุ';

    const r = ws.getRow(curRow);
    r.values = ['', `SDG ${sdgNum}`, sdgDefinitions[sdgNum] || `SDG ${sdgNum}`, matched.length, projectNames, actSum, partSum];
    r.height = 22;
    styleDataRow(r, 2, 7, idx % 2 === 1);
    r.getCell(6).numFmt = '#,##0.00';
    r.getCell(7).numFmt = '#,##0';
    curRow++;
  });

  // Table 2: Student Master Plans
  curRow += 2;
  ws.mergeCells(`B${curRow}:G${curRow}`);
  const t2 = ws.getCell(`B${curRow}`);
  t2.value = 'ตารางที่ 2: การดำเนินงานตามแผนพัฒนากิจการนิสิต 5 ด้าน (Student Affairs Master Plan)';
  t2.font = { name: 'Sarabun', size: 11.5, bold: true, color: { argb: THEME.headerText } };
  t2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }; // Deep Blue
  t2.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(curRow).height = 26;

  curRow++;
  const t2Cols = ['ลำดับแผน', 'ชื่อแผนพัฒนากิจการนิสิต', 'จำนวนโครงการ', 'งบประมาณอนุมัติ (บาท)', 'งบประมาณใช้จริง (บาท)', 'ผู้เข้าร่วม (คน)'];
  const t2ColRow = ws.getRow(curRow);
  t2ColRow.values = ['', ...t2Cols];
  t2ColRow.height = 24;
  styleSubHeaderRow(t2ColRow, 2, 7);

  const planNames = [
    '1. ส่งเสริมอัตลักษณ์นิสิต',
    '2. พัฒนาทักษะการทำงาน',
    '3. ยกระดับสิ่งสนับสนุนการเรียนรู้',
    '4. สร้างความผูกพันและภูมิใจ',
    '5. สร้างความร่วมมือนิสิตเก่า',
  ];

  curRow++;
  planNames.forEach((planTitle, idx) => {
    const planCode = idx + 1;
    const matched = projects.filter((p) => p.studentPlans.includes(planCode));
    const budSum = matched.reduce((s, p) => s + p.budget, 0);
    const actSum = matched.reduce((s, p) => s + p.actual, 0);
    const partSum = matched.reduce((s, p) => s + p.participants, 0);

    const r = ws.getRow(curRow);
    r.values = ['', `แผนที่ ${planCode}`, planTitle, matched.length, budSum, actSum, partSum];
    r.height = 22;
    styleDataRow(r, 2, 7, idx % 2 === 1);
    r.getCell(5).numFmt = '#,##0.00';
    r.getCell(6).numFmt = '#,##0.00';
    r.getCell(7).numFmt = '#,##0';
    curRow++;
  });

    // Table 3: Program Learning Outcomes (PLO 1–4)
  curRow += 2;
  ws.mergeCells(`B${curRow}:G${curRow}`);
  const t3 = ws.getCell(`B${curRow}`);
  t3.value = 'ตารางที่ 3: การตอบสนองผลลัพธ์การเรียนรู้ระดับหลักสูตร (Program Learning Outcomes: PLO 1–4)';
  t3.font = { name: 'Sarabun', size: 11.5, bold: true, color: { argb: THEME.headerText } };
  t3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B21A8' } }; // Purple
  t3.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(curRow).height = 26;

  curRow++;
  const t3Cols = ['รหัส PLO', 'คำอธิบายผลลัพธ์การเรียนรู้ (PLO Statement)', 'จำนวนโครงการ', 'รายชื่อโครงการที่เกี่ยวข้อง', 'งบประมาณใช้จริง (บาท)', 'ผู้เข้าร่วม (คน)'];
  const t3ColRow = ws.getRow(curRow);
  t3ColRow.values = ['', ...t3Cols];
  t3ColRow.height = 24;
  styleSubHeaderRow(t3ColRow, 2, 7);

  curRow++;
  [1, 2, 3, 4].forEach((num, idx) => {
    const def = defaultPloDefinitions[num];
    const matched = projects.filter((p) => p.plo.includes(num as any));
    const actSum = matched.reduce((s, p) => s + p.actual, 0);
    const partSum = matched.reduce((s, p) => s + p.participants, 0);
    const projectNames = matched.map((p) => p.name).join('; ') || 'ไม่มีโครงการระบุ';

    const r = ws.getRow(curRow);
    r.values = ['', `PLO ${num}`, `${def.shortDesc} — ${def.detail}`, matched.length, projectNames, actSum, partSum];
    r.height = 24;
    styleDataRow(r, 2, 7, idx % 2 === 1);
    r.getCell(6).numFmt = '#,##0.00';
    r.getCell(7).numFmt = '#,##0';
    curRow++;
  });

  autoFitColumns(ws);
}

// ─── Sheet 4: Student Attendance Analytics ────────────────────────────────────

export function buildParticipantsSheet(wb: ExcelJS.Workbook, projects: Project[], academicYear = 'all', roster?: Participant[]) {
  const ws = wb.addWorksheet('สถิตินิสิต_Participants', {
    views: [{ showGridLines: true }],
  });

  const participants = scopeParticipants(roster ?? getParticipants(projects), projects);
  const referenceYear = participantReferenceYear(projects, participants, academicYear);
  const cohortReferenceYear = referenceYear ?? (academicYears(projects).length ? Math.max(...academicYears(projects)) : 2568);

  // Title Banner
  ws.mergeCells('B2:H2');
  const title = ws.getCell('B2');
  title.value = 'สถิติการมีส่วนร่วมในกิจกรรมของนิสิตจำแนกตามรุ่นปีและรายบุคคล';
  title.font = { name: 'Sarabun', size: 15, bold: true, color: { argb: THEME.headerText } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.headerBg } };
  title.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(2).height = 36;

  ws.mergeCells('B3:I3');
  ws.getCell('B3').value = `${academicYear === 'all' ? 'รวมประวัติทุกปีที่มีข้อมูล' : `ปีการศึกษา ${academicYear}`} • ชั้นปีอ้างอิง ${referenceYear ?? 'ยังไม่มีข้อมูล'} • อัตราเข้าร่วมจริง = โครงการที่เข้าจริง / โครงการที่มีชื่อ × 100 (หลายวันนับครั้งเดียว; ไม่มีข้อมูลไม่ถือว่าขาด)`;
  ws.getCell('B3').alignment = { wrapText: true, vertical: 'middle' };
  ws.getRow(3).height = 42;

  // Cohort Table
  let curRow = 4;
  ws.mergeCells(`B${curRow}:F${curRow}`);
  const t1 = ws.getCell(`B${curRow}`);
  t1.value = 'ตารางที่ 1: สรุปภาพรวมการมีส่วนร่วมจำแนกตามรหัสรุ่นปีนิสิต (Cohort Summary)';
  t1.font = { name: 'Sarabun', size: 11.5, bold: true, color: { argb: THEME.headerText } };
  t1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };
  t1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(curRow).height = 26;

  curRow++;
  const cohortCols = ['รหัสรุ่นปี', 'ชั้นปีการศึกษา', 'จำนวนนิสิตในระบบ (คน)', 'การเข้าร่วมสะสม (คน-ครั้ง)', 'เฉลี่ยกิจกรรม/คน'];
  const cohortColRow = ws.getRow(curRow);
  cohortColRow.values = ['', ...cohortCols];
  cohortColRow.height = 24;
  styleSubHeaderRow(cohortColRow, 2, 6);

  const cohorts = getDynamicCohortList(cohortReferenceYear);

  curRow++;
  cohorts.forEach((cohort, idx) => {
    const matched = participants.filter((st) => {
      return resolveStudentCohortDynamic(st.studentId, cohortReferenceYear).code === cohort.code;
    });

    const sCount = matched.length;
    const totalAttend = matched.reduce((s, st) => s + st.attendedProjects.length, 0);
    const avgPerSt = sCount > 0 ? totalAttend / sCount : 0;

    const r = ws.getRow(curRow);
    r.values = ['', cohort.label, cohort.yearLabel, sCount, totalAttend, avgPerSt];
    r.height = 22;
    styleDataRow(r, 2, 6, idx % 2 === 1);
    r.getCell(4).numFmt = '#,##0';
    r.getCell(5).numFmt = '#,##0';
    r.getCell(6).numFmt = '0.00';
    curRow++;
  });

  // Table 2: Student Registry
  curRow += 2;
  ws.mergeCells(`B${curRow}:H${curRow}`);
  const t2 = ws.getCell(`B${curRow}`);
  t2.value = 'ตารางที่ 2: ทะเบียนประวัติการเข้าร่วมกิจกรรมของนิสิตรายบุคคล (Student Activity Record)';
  t2.font = { name: 'Sarabun', size: 11.5, bold: true, color: { argb: THEME.headerText } };
  t2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.headerBg } };
  t2.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(curRow).height = 26;

  curRow++;
  const stCols = ['ลำดับ', 'รหัสนิสิต', 'ชื่อ - นามสกุล', 'รุ่นปีการศึกษา', 'ชั้นปี', 'โครงการที่ลงทะเบียน', 'โครงการที่เข้าจริง', 'อัตราการเข้าร่วม (%)'];
  const stColRow = ws.getRow(curRow);
  stColRow.values = ['', ...stCols];
  stColRow.height = 24;
  styleSubHeaderRow(stColRow, 2, 9);

  curRow++;
  participants.forEach((st, idx) => {
    const regCount = st.registeredProjects.length;
    const attCount = st.attendedProjects.length;
    const rate = (participantAttendanceRate(st) ?? 0) / 100;
    const cohortYear = `รุ่นปี ${st.studentId.substring(0, 2)}`;

    const r = ws.getRow(curRow);
    r.values = ['', idx + 1, st.studentId, st.name || 'ไม่ระบุชื่อ', cohortYear, resolveStudentCohortDynamic(st.studentId, cohortReferenceYear).yearLabel, regCount, attCount, rate];
    r.height = 22;
    styleDataRow(r, 2, 9, idx % 2 === 1);
    r.getCell(7).numFmt = '#,##0';
    r.getCell(8).numFmt = '#,##0';
    r.getCell(9).numFmt = '0.0%';
    curRow++;
  });

  autoFitColumns(ws);
}

// ─── Styling Utility Helpers ──────────────────────────────────────────────────

function applyCardBox(ws: ExcelJS.Worksheet, startCol: string, endCol: string, startRow: number, endRow: number, bgArgb: string, borderArgb: string) {
  const startColCode = startCol.charCodeAt(0);
  const endColCode = endCol.charCodeAt(0);

  for (let c = startColCode; c <= endColCode; c++) {
    const colChar = String.fromCharCode(c);
    for (let r = startRow; r <= endRow; r++) {
      const cell = ws.getCell(`${colChar}${r}`);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      cell.border = {
        top: { style: r === startRow ? 'medium' : 'thin', color: { argb: borderArgb } },
        bottom: { style: r === endRow ? 'medium' : 'thin', color: { argb: borderArgb } },
        left: { style: c === startColCode ? 'medium' : 'thin', color: { argb: borderArgb } },
        right: { style: c === endColCode ? 'medium' : 'thin', color: { argb: borderArgb } },
      };
    }
  }
}

function styleSubHeaderRow(row: ExcelJS.Row, startCol: number, endCol: number) {
  row.eachCell((cell, colNum) => {
    if (colNum >= startCol && colNum <= endCol) {
      cell.font = { name: 'Sarabun', size: 10.5, bold: true, color: { argb: 'FF1E293B' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: THEME.borderMedium } },
        bottom: { style: 'medium', color: { argb: 'FF64748B' } },
        left: { style: 'thin', color: { argb: THEME.borderLight } },
        right: { style: 'thin', color: { argb: THEME.borderLight } },
      };
    }
  });
}

function styleDataRow(row: ExcelJS.Row, startCol: number, endCol: number, isOdd: boolean) {
  const bg = isOdd ? THEME.zebraOdd : THEME.zebraEven;
  row.eachCell((cell, colNum) => {
    if (colNum >= startCol && colNum <= endCol) {
      cell.font = { name: 'Sarabun', size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.border = {
        top: { style: 'thin', color: { argb: THEME.borderLight } },
        bottom: { style: 'thin', color: { argb: THEME.borderLight } },
        left: { style: 'thin', color: { argb: THEME.borderLight } },
        right: { style: 'thin', color: { argb: THEME.borderLight } },
      };
      if (typeof cell.value === 'string' && !['K', 'U', 'D', 'I', 'ภาคต้น', 'ภาคปลาย', 'ภาคฤดูร้อน'].includes(cell.value) && !cell.value.startsWith('SDG') && !cell.value.startsWith('แผน')) {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      } else if (typeof cell.value === 'number') {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
    }
  });
}

function autoFitColumns(ws: ExcelJS.Worksheet) {
  ws.columns.forEach((column) => {
    let maxLen = 10;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      let text = cell.value ? cell.value.toString() : '';
      if (typeof cell.value === 'object' && cell.value !== null) {
        if ('result' in cell.value) text = String(cell.value.result ?? '');
        else if ('text' in cell.value) text = String(cell.value.text ?? '');
      }
      const clean = text.replace(/[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/g, '');
      if (clean.length > maxLen) {
        maxLen = clean.length;
      }
    });
    column.width = Math.min(Math.max(maxLen + 4, 12), 65);
  });
}

// ─── Browser Download ─────────────────────────────────────────────────────────


// ─── Sheet 5: Daily & Overall KPI Evaluations Breakdown ──────────────────────
function buildDailyKpiSheet(wb: ExcelJS.Workbook, projects: Project[]) {
  const ws = wb.addWorksheet('ผลประเมิน_KPI_Daily', {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: true }],
  });
  const headers = [
    'ลำดับ',
    'รหัสโครงการ',
    'ชื่อโครงการ',
    'ประเภทกิจกรรม',
    'อาจารย์ผู้รับผิดชอบ',
    'ปีการศึกษา',
    'รูปแบบการประเมิน',
    'วันที่ประเมิน',
    'จำนวนผู้ตอบ (คน)',
    'จำนวนผู้มีสิทธิ์ (คน)',
    'อัตราการตอบ (%)',
    'คะแนนเฉลี่ย (เต็ม 5.00)',
    'สถานะการประเมิน',
  ];
  const headerRow = ws.getRow(1);
  headerRow.values = headers;
  headerRow.height = 32;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Sarabun', size: 11, bold: true, color: { argb: THEME.headerText } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.headerBg } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF475569' } },
      bottom: { style: 'medium', color: { argb: THEME.borderDark } },
    };
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };

  let rowIdx = 1;
  let excelRow = 2;
  for (const p of projects) {
    const kpis = p.evaluationRows && p.evaluationRows.length > 0 ? p.evaluationRows : [
      {
        evaluation_type: 'ALL' as const,
        date: null,
        respondent_count: p.respondents > 0 ? p.respondents : null,
        eligible_count: p.participants > 0 ? p.participants : null,
        avg_satisfaction_score: p.satisfaction > 0 ? p.satisfaction : null,
      }
    ];
    for (const k of kpis) {
      const resp = k.respondent_count ?? 0;
      const elig = k.eligible_count ?? (p.participants > 0 ? p.participants : 0);
      const rate = elig > 0 ? resp / elig : 0;
      const score = k.avg_satisfaction_score ?? p.satisfaction ?? 0;
      const statusText = score >= 4.0 ? 'ดีมาก (≥4.00)' : score >= 3.5 ? 'ผ่านเกณฑ์ (≥3.50)' : score > 0 ? 'ควรปรับปรุง (<3.50)' : 'ยังไม่มีผลประเมิน';

      const row = ws.getRow(excelRow);
      row.values = [
        rowIdx,
        p.code || '-',
        p.name,
        p.type,
        p.lecturer,
        p.academicYear,
        k.evaluation_type === 'DAILY' ? 'ประเมินรายวัน (DAILY)' : 'ภาพรวมทั้งโครงการ (ALL)',
        ('date_key' in k && k.date_key ? String(k.date_key) : ('date' in k && (k as any).date ? String((k as any).date) : (k.evaluation_type === 'DAILY' ? p.startDate : 'ทั้งโครงการ'))),
        resp > 0 ? resp : '-',
        elig > 0 ? elig : '-',
        rate > 0 ? rate : '-',
        score > 0 ? score : '-',
        statusText,
      ];
      row.height = 24;
      styleDataRow(row, 1, headers.length, rowIdx % 2 === 0);
      if (typeof row.getCell(9).value === 'number') row.getCell(9).numFmt = '#,##0';
      if (typeof row.getCell(10).value === 'number') row.getCell(10).numFmt = '#,##0';
      if (typeof row.getCell(11).value === 'number') row.getCell(11).numFmt = '0.0%';
      if (typeof row.getCell(12).value === 'number') row.getCell(12).numFmt = '0.00';
      excelRow++;
      rowIdx++;
    }
  }
  autoFitColumns(ws);
}

// ─── Sheet 6: Budget & Cost Efficiency Breakdown ─────────────────────────────
function buildBudgetCostSheet(wb: ExcelJS.Workbook, projects: Project[]) {
  const ws = wb.addWorksheet('งบประมาณ_ความคุ้มค่า_Budget', {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: true }],
  });
  const headers = [
    'ลำดับ',
    'รหัสโครงการ',
    'ชื่อโครงการ',
    'ประเภทกิจกรรม',
    'อาจารย์ผู้รับผิดชอบ',
    'ปีการศึกษา',
    'ภาคเรียน',
    'งบอนุมัติ (บาท)',
    'งบใช้จริง (บาท)',
    'งบคงเหลือ (บาท)',
    'อัตราเบิกจ่าย (%)',
    'สถานะการใช้จ่าย',
    'ผู้เข้าร่วม (คน)',
    'ระยะเวลา (ชม.)',
    'ต้นทุนต่อนิสิต (บาท/คน)',
    'ต้นทุนต่อชั่วโมง (บาท/ชม.)',
  ];
  const headerRow = ws.getRow(1);
  headerRow.values = headers;
  headerRow.height = 32;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Sarabun', size: 11, bold: true, color: { argb: THEME.headerText } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.headerBg } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF475569' } },
      bottom: { style: 'medium', color: { argb: THEME.borderDark } },
    };
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };

  projects.forEach((p, idx) => {
    const remain = Math.max(0, p.budget - p.actual);
    const util = p.budget > 0 ? p.actual / p.budget : 0;
    const costPerStudent = p.participants > 0 ? p.actual / p.participants : null;
    const costPerHour = p.hours > 0 ? p.actual / p.hours : null;
    const status = util >= 0.8 ? 'ตามเกณฑ์ (≥80%)' : util > 0 ? 'ต่ำกว่าเกณฑ์ (<80%)' : 'ยังไม่เบิกจ่าย';

    const row = ws.getRow(idx + 2);
    row.values = [
      idx + 1,
      p.code || '-',
      p.name,
      p.type,
      p.lecturer,
      p.academicYear,
      p.semester === 't1' ? 'ภาคต้น' : p.semester === 't2' ? 'ภาคปลาย' : 'ฤดูร้อน',
      p.budget,
      p.actual,
      remain,
      util,
      status,
      p.participants,
      p.hours,
      costPerStudent ?? '-',
      costPerHour ?? '-',
    ];
    row.height = 24;
    styleDataRow(row, 1, headers.length, idx % 2 === 1);
    row.getCell(8).numFmt = '#,##0.00';
    row.getCell(9).numFmt = '#,##0.00';
    row.getCell(10).numFmt = '#,##0.00';
    row.getCell(11).numFmt = '0.0%';
    row.getCell(13).numFmt = '#,##0';
    row.getCell(14).numFmt = '#,##0.0';
    if (typeof row.getCell(15).value === 'number') row.getCell(15).numFmt = '#,##0.00';
    if (typeof row.getCell(16).value === 'number') row.getCell(16).numFmt = '#,##0.00';
  });
  autoFitColumns(ws);
}

async function triggerExcelDownload(wb: ExcelJS.Workbook, filename: string) {
  if (typeof window === 'undefined') return;

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 250);
}

// ─── Primary Export Function ──────────────────────────────────────────────────

export async function exportDashboardToExcel(
  allProjects: Project[],
  options: ExportOptions = {}
): Promise<void> {
  const {
    academicYear = 'all',
    semester = 'all',
    exportType = 'full',
  } = options;

  let filteredProjects = [...allProjects];
  if (academicYear !== 'all') {
    filteredProjects = filteredProjects.filter((p) => String(p.academicYear) === academicYear);
  }
  if (semester !== 'all') {
    filteredProjects = filteredProjects.filter((p) => p.semester === semester);
  }

  const now = new Date();
  const dateStamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const yearSuffix = academicYear === 'all' ? 'ทุกปีการศึกษา' : `ปีการศึกษา_${academicYear}`;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'ระบบบริหารและวิเคราะห์กิจกรรมนิสิต (CPE Dashboard Demo)';
  wb.lastModifiedBy = 'ระบบบริหารจัดการโครงการภาควิชา (CPE Executive System)';
  wb.created = now;
  wb.modified = now;

  if (exportType === 'projects-only') {
    buildProjectsRegistrySheet(wb, filteredProjects, 'ทะเบียนโครงการ');
    const filename = `ทะเบียนโครงการ_วิศวกรรมคอมพิวเตอร์_${yearSuffix}_${dateStamp}.xlsx`;
    await triggerExcelDownload(wb, filename);
    return;
  }

  if (exportType === 'participants-only') {
    buildParticipantsSheet(wb, filteredProjects, academicYear, await getParticipantRoster(filteredProjects));

  // 5. Daily & Overall KPI Evaluations Breakdown
  buildDailyKpiSheet(wb, filteredProjects);

  // 6. Budget & Cost Efficiency Breakdown
  buildBudgetCostSheet(wb, filteredProjects);
    const filename = `สถิติการเข้าร่วมกิจกรรมนิสิต_${yearSuffix}_${dateStamp}.xlsx`;
    await triggerExcelDownload(wb, filename);
    return;
  }

  // 1. Executive Summary with Visual KPI Cards and Embedded Charts
  buildExecutiveSummarySheet(wb, filteredProjects, allProjects, academicYear, semester);

  // 2. Projects Registry Table (Frozen Header, AutoFilter, Zebra Striping)
  buildProjectsRegistrySheet(wb, filteredProjects, 'ทะเบียนโครงการ_Projects');

  // 3. Strategic Alignment & SDGs Matrix
  buildStrategicSheet(wb, filteredProjects);

  // 4. Student Participants Analytics
  buildParticipantsSheet(wb, filteredProjects, academicYear, await getParticipantRoster(filteredProjects));

  // 5. Historical Archive (included if filtering is active)
  if (academicYear !== 'all' || semester !== 'all') {
    buildProjectsRegistrySheet(wb, allProjects, 'คลังโครงการทุกปี_Archive');
  }

  const filename = `รายงานโครงการภาควิชาวิศวกรรมคอมพิวเตอร์_${yearSuffix}_${dateStamp}.xlsx`;
  await triggerExcelDownload(wb, filename);
}
