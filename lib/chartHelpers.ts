// lib/chartHelpers.ts — High-Contrast Crisp Typography & Executive Chart Helpers

export const palette = {
  green:   '#059669', // Modern Emerald (Success / Completed targets)
  navy:    '#1D4ED8', // Deep Royal Cobalt
  teal:    '#0D9488', // Refined Slate Teal (Quality / Evaluation)
  emerald: '#059669', // Executive Emerald Accent (80–100% ผ่านเกณฑ์)
  amber:   '#D97706', // Refined Amber
  orange:  '#EA580C', // Executive Orange (50–<70% เฝ้าระวัง)
  yellow:  '#EAB308', // Warm Golden Yellow (70–<80% ปานกลาง/ใกล้เป้าหมาย)
  crimson: '#E11D48', // Balanced Rose / Crimson (Alert / Needs attention)
  purple:  '#7C3AED', // Modern Violet / Strategic Initiatives
  slate:   '#64748B', // Neutral Slate
  blue:    '#2563EB', // Refined Cobalt Blue (Primary / Identity)
  cyan:    '#0284C7', // Crisp Sky/Cyan Blue (>100% เกินเป้าหมาย)
  sky:     '#0284C7', // Sky Blue
  rose:    '#E11D48', // Red (<50% วิกฤต/ต้องปรับปรุง)
  red:     '#E11D48', // Red
  indigo:  '#4F46E5', // Modern Indigo
};

/** Metric colors are stable across pages. Category charts use their named maps.
 * Alert colors require an explicit threshold; a smaller value alone is not a warning.
 */
export const chartColors = {
  budget: palette.blue,
  approvedBudget: palette.slate,
  remainingBudget: '#E2E8F0',
  participants: palette.emerald,
  costPerPerson: palette.teal,
  hours: palette.cyan,
  projectCount: palette.blue,
  budgetOverrun: palette.crimson,
} as const;

/** Assign from the full category list so filtering and ranking retain each person's color. */
export function categoryColorMap(categories: string[]): Map<string, string> {
  const colors = [
    '#2563EB', '#0D9488', '#7C3AED', '#D97706',
    '#E11D48', '#0891B2', '#059669', '#4F46E5',
    '#475569', '#9333EA', '#0284C7', '#EA580C',
    '#DB2777', '#1D4ED8', '#0F766E', '#6366F1',
  ];
  return new Map(Array.from(new Set(categories)).sort().map((category, index) => [
    category,
    colors[index] ?? `hsl(${((index - colors.length) * 137.508 + 17) % 360}, 62%, ${index % 2 ? 42 : 48}%)`,
  ]));
}

/** Shared rate bands measuring success/completion rate. */
export const percentageBands = [
  { label: '<50%', color: palette.red, text: 'วิกฤต/ต้องปรับปรุง' },
  { label: '50–<70%', color: palette.orange, text: 'เฝ้าระวัง' },
  { label: '70–<80%', color: palette.yellow, text: 'ปานกลาง/ใกล้เป้าหมาย' },
  { label: '80–100%', color: palette.emerald, text: 'ผ่านเกณฑ์' },
  { label: '>100%', color: palette.cyan, text: 'เกินเป้าหมาย' },
] as const;

export function percentageBandColor(rate: number): string {
  if (rate > 100) return palette.cyan;    // >100%: สีฟ้า (เกินเป้าหมาย)
  if (rate >= 80) return palette.emerald; // 80–100%: สีเขียว (ผ่านเกณฑ์)
  if (rate >= 70) return palette.yellow;  // 70–<80%: สีเหลือง (ปานกลาง/ใกล้เป้าหมาย)
  if (rate >= 50) return palette.orange;  // 50–<70%: สีส้ม (เฝ้าระวัง)
  return palette.red;                     // <50%: สีแดง (วิกฤต/ต้องปรับปรุง)
}

/** Hex → rgba string with alpha 0–1 */
export function alpha(hex: string, a: number): string {
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export const gridColor  = '#F1F5F9';  // Ultra-clean soft grid lines
export const tickColor  = '#1E293B';  // Crisp Dark Slate 800 for zero-squint readability
export const fontFamily = "'Sarabun', 'Inter', system-ui, sans-serif";
export const chartDevicePixelRatio = 2; // Exact 2x integer HiDPI ratio (avoids fractional 2.5x resampling halos)

/** Shared base options injected into every chart — clean and readable styling */
export const baseScales = {
  x: {
    grid: { color: gridColor },
    ticks: { color: tickColor, font: { family: fontFamily, size: 12, weight: 400 } },
  },
  y: {
    grid: { color: gridColor },
    ticks: { color: tickColor, font: { family: fontFamily, size: 12, weight: 400 } },
  },
};

export const baseLegend = {
  labels: {
    color: '#1E293B',
    font: { family: fontFamily, size: 13, weight: 500 },
    usePointStyle: true,
    pointStyle: 'rectRounded' as const,
    boxWidth: 10,
    boxHeight: 10,
    padding: 16,
    useBorderRadius: true,
    borderRadius: 3,
  },
};

export const baseTooltip = {
  backgroundColor: '#1A1F23',
  titleColor: '#FFFFFF',
  bodyColor: '#F8FAFC',
  borderColor: '#373D42',
  borderWidth: 1,
  padding: 10,
  cornerRadius: 6,
  titleFont: { family: fontFamily, size: 13, weight: '600' as const },
  bodyFont: { family: fontFamily, size: 12, weight: '400' as const },
};

/** Truncate long labels */
export function truncate(s: string, n = 18): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

/** Array average */
export function avg(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
}
