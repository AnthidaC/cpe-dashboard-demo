// lib/ploLabels.ts — Program Learning Outcomes (PLO 1–4) for Computer Engineering Curriculum
// Maps PLO codes to formal descriptions stored in dim_policy_alignment

export interface PLODefinition {
  number: number;
  title: string;
  shortDesc: string;
  detail: string;
}

/** Standard official PLO definitions for Computer Engineering (วิศวกรรมคอมพิวเตอร์) */
export const defaultPloDefinitions: Record<number, PLODefinition> = {
  1: {
    number: 1,
    title: 'PLO 1',
    shortDesc: 'ประยุกต์ใช้ความรู้แก้ปัญหาทางวิศวกรรม',
    detail: 'สามารถประยุกต์ใช้หลักการและความรู้ทั้งในเชิงทฤษฎีและปฏิบัติ ในการวิเคราะห์และออกแบบเพื่อแก้ปัญหาทางวิศวกรรมคอมพิวเตอร์ได้',
  },
  2: {
    number: 2,
    title: 'PLO 2',
    shortDesc: 'ค้นคว้าเรียนรู้เทคโนโลยีและสร้างนวัตกรรม',
    detail: 'สามารถค้นคว้า เรียนรู้ เครื่องมือและเทคโนโลยีคอมพิวเตอร์ด้วยตนเองเพื่อนำมาใช้ในแก้ปัญหาทางวิศวกรรมคอมพิวเตอร์หรือสร้างนวัตกรรมได้',
  },
  3: {
    number: 3,
    title: 'PLO 3',
    shortDesc: 'สื่อสารผลงานและความเข้าใจเชิงเทคนิค',
    detail: 'สามารถสื่อสารผลงาน องค์ความรู้และความเข้าใจเชิงเทคนิคและเชิงทั่วไปได้',
  },
  4: {
    number: 4,
    title: 'PLO 4',
    shortDesc: 'พร้อมปฏิบัติงานอย่างมืออาชีพ',
    detail: 'มีความพร้อมในการทำงานในสถานประกอบการ สามารถปฏิบัติงานอย่างมืออาชีพ',
  },
};

/** Derive a concise short phrase if a custom detail is provided */
export function deriveShortDesc(num: number, detail?: string | null): string {
  if (defaultPloDefinitions[num]) {
    return defaultPloDefinitions[num].shortDesc;
  }
  if (!detail || !detail.trim()) {
    return `PLO ${num}`;
  }
  const d = detail.trim();
  if (d.includes('ค้นคว้า') || d.includes('เรียนรู้') || d.includes('นวัตกรรม')) {
    return 'ค้นคว้าเรียนรู้เทคโนโลยีและสร้างนวัตกรรม';
  }
  if (d.includes('วิเคราะห์และออกแบบ') || d.includes('แก้ปัญหาทางวิศวกรรม') || d.includes('ประยุกต์ใช้')) {
    return 'ประยุกต์ใช้ความรู้แก้ปัญหาทางวิศวกรรม';
  }
  if (d.includes('สื่อสาร') || d.includes('องค์ความรู้')) {
    return 'สื่อสารผลงานและความเข้าใจเชิงเทคนิค';
  }
  if (d.includes('สถานประกอบการ') || d.includes('มืออาชีพ') || d.includes('พร้อมในการทำงาน')) {
    return 'พร้อมปฏิบัติงานอย่างมืออาชีพ';
  }
  // Fallback: take first 40 characters or default
  return d.length > 40 ? `${d.slice(0, 38)}...` : d;
}

/** Convert database policy rows to a lookup dictionary for PLO 1-4 */
export function mapPoliciesToPloDefinitions(
  policies?: Array<{ strategy_type?: string | null; strategy_name?: string | null; detail?: string | null }>
): Record<number, PLODefinition> {
  const definitions: Record<number, PLODefinition> = { ...defaultPloDefinitions };
  if (!policies || !Array.isArray(policies)) return definitions;

  for (const row of policies) {
    if ((row.strategy_type || '').toUpperCase() !== 'PLO') continue;
    const match = (row.strategy_name || '').match(/(\d+)/);
    if (!match) continue;
    const num = Number(match[1]);
    if (num >= 1 && num <= 4) {
      const detail = row.detail?.trim() || defaultPloDefinitions[num]?.detail || '';
      definitions[num] = {
        number: num,
        title: `PLO ${num}`,
        shortDesc: deriveShortDesc(num, detail),
        detail,
      };
    }
  }

  return definitions;
}

export function getPloDefinition(
  num: number,
  customMap?: Record<number, PLODefinition>
): PLODefinition {
  return customMap?.[num] ?? defaultPloDefinitions[num] ?? {
    number: num,
    title: `PLO ${num}`,
    shortDesc: `PLO ${num}`,
    detail: `ผลลัพธ์การเรียนรู้ระดับหลักสูตร PLO ${num}`,
  };
}

export function ploLabel(
  num: number,
  customMap?: Record<number, PLODefinition>
): string {
  const def = getPloDefinition(num, customMap);
  return `${def.title}: ${def.shortDesc}`;
}

export function ploShortDesc(
  num: number,
  customMap?: Record<number, PLODefinition>
): string {
  return getPloDefinition(num, customMap).shortDesc;
}

export function ploDetail(
  num: number,
  customMap?: Record<number, PLODefinition>
): string {
  return getPloDefinition(num, customMap).detail;
}

/** Balanced multi-line labels for radar chart vertices to ensure crisp typography and optimal web size */
export function getPloRadarMultiLine(
  num: number,
  customMap?: Record<number, PLODefinition>
): string[] {
  const def = getPloDefinition(num, customMap);
  switch (num) {
    case 1:
      return ['PLO 1', 'ประยุกต์ใช้ความรู้', 'แก้ปัญหาทางวิศวกรรม'];
    case 2:
      return ['PLO 2', 'ค้นคว้าเทคโนโลยี', 'และสร้างนวัตกรรม'];
    case 3:
      return ['PLO 3', 'สื่อสารผลงาน', 'และเข้าใจเชิงเทคนิค'];
    case 4:
      return ['PLO 4', 'พร้อมปฏิบัติงาน', 'อย่างมืออาชีพ'];
    default:
      return [def.title, def.shortDesc];
  }
}
