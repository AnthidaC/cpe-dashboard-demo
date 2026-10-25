// lib/thaiLabelUtils.ts — Intelligent Thai Label Condensation & Word Segmentation Engine
// Designed for High-Density Executive Dashboards & Chart Visual Alignment

const THAI_COMBINING_RE = /[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/g;

/**
 * Returns visual length in Thai typography, ignoring combining vowels and tone marks.
 * On-screen text width correlates with the number of base consonants and symbols.
 */
export function thaiVisualLength(text: string): number {
  return text.replace(THAI_COMBINING_RE, '').length;
}

/**
 * Recognized Thai compound words and domain-specific academic terms.
 * Intl.Segmenter normally splits these into smaller morphemes (e.g. หุ่น + ยนต์, จิต + อาสา).
 * This dictionary ensures they stay merged as single semantic units.
 */
export const THAI_COMPOUNDS = [
  'ภาควิชาวิศวกรรมคอมพิวเตอร์',
  'วิศวกรรมคอมพิวเตอร์',
  'วิศวคอมฯ',
  'วิศวคอม',
  '(วิศวคอมฯ)',
  'ภาควิชา',
  'นิสิตใหม่',
  'ร.ร.',
  'ร.ร.ชุมชน',
  'พัฒนา ร.ร.',
  'จิตอาสาพัฒนา ร.ร.',
  'ปฐมนิเทศ',
  'ปัจฉิมนิเทศ',
  'ปัญญาประดิษฐ์',
  'จิตอาสา',
  'บำเพ็ญประโยชน์',
  'คุณธรรม',
  'จริยธรรม',
  'จรรยาบรรณ',
  'จรรยาบรรณวิชาชีพ',
  'วิชาชีพวิศวกร',
  'วิชาชีพไอที',
  'หุ่นยนต์',
  'ที่ปรึกษา',
  'ออกแบบได้',
  'ชีวิตออกแบบได้',
  'ความเป็นเลิศ',
  'ระดับสากล',
  'ผลการเรียน',
  'ทักษะวิชาการ',
  'โรงเรียนชุมชน',
  'การแลกเปลี่ยน',
  'สิ่งแวดล้อม',
  'เทคโนโลยีสะอาด',
  'นวัตกรรมสีเขียว',
  'สืบสานวัฒนธรรม',
  'ความปลอดภัยไซเบอร์',
  'ไซเบอร์',
  'บริการวิชาการ',
  'สานสัมพันธ์',
  'เตรียมความพร้อม',
  'สู่การทำงาน',
  'ความรู้และทักษะ',
  'สถานประกอบการ',
  'เชิงปฏิบัติการ',
];

/**
 * Segments Thai text into semantic words while respecting compound words and parenthesized tokens.
 */
export function segmentThaiWords(text: string): string[] {
  if (!text) return [];
  if (typeof Intl === 'undefined' || !Intl.Segmenter) {
    return text.split(/\s+/);
  }

  const segmenter = new Intl.Segmenter('th', { granularity: 'word' });
  const rawWords = Array.from(segmenter.segment(text), s => s.segment);
  const merged: string[] = [];
  let i = 0;

  while (i < rawWords.length) {
    // 1. Keep parenthesized suffix / expressions as atomic units e.g. (ปี 67), (1)
    if (rawWords[i] === '(') {
      let paren = '';
      let j = i;
      while (j < rawWords.length && rawWords[j] !== ')') {
        paren += rawWords[j];
        j++;
      }
      if (j < rawWords.length && rawWords[j] === ')') {
        paren += ')';
        merged.push(paren.trim());
        i = j + 1;
        continue;
      }
    }

    // 2. Match recognized compounds
    let matched = false;
    for (const compound of THAI_COMPOUNDS) {
      let sub = '';
      let j = i;
      while (j < rawWords.length && sub.length < compound.length) {
        sub += rawWords[j];
        j++;
      }
      if (sub === compound) {
        merged.push(compound);
        i = j;
        matched = true;
        break;
      }
    }
    if (!matched) {
      const token = rawWords[i];
      if (token.trim().length > 0) {
        merged.push(token);
      }
      i++;
    }
  }

  return merged;
}

/**
 * High-value domain replacements for standard academic projects.
 * Applied after stripping "โครงการ" / "กิจกรรม" prefix.
 */
const DOMAIN_REPLACEMENTS: [RegExp, string][] = [
  // Generic sanitized project titles -> crisp recognizable 1-line aliases
  [/^ปฐมนิเทศและเตรียมความพร้อมนิสิตใหม่/g, 'ปฐมนิเทศนิสิตใหม่'],
  [/^ส่งเสริมวัฒนธรรมและกิจกรรมบำเพ็ญประโยชน์/g, 'ส่งเสริมวัฒนธรรม'],
  [/^เสริมสร้างทักษะและสมรรถนะวิชาชีพ/g, 'เสริมทักษะวิชาชีพ'],
  [/^กีฬาสานสัมพันธ์สร้างเสริมสุขภาพ/g, 'กีฬาสานสัมพันธ์'],
  [/^ติดตามและส่งเสริมสัมฤทธิผลทางการเรียน/g, 'ติดตามผลการเรียน'],
  [/^ค่ายนวัตกรรมหุ่นยนต์และปัญญาประดิษฐ์/g, 'ค่ายหุ่นยนต์ & AI'],
  [/^จิตอาสาพัฒนาและบริการวิชาการสู่ชุมชน/g, 'จิตอาสาพัฒนาชุมชน'],
  [/^ส่งเสริมคุณธรรมจริยธรรมและจรรยาบรรณวิชาชีพ/g, 'คุณธรรม & จรรยาบรรณ'],
  [/^ส่งเสริมศักยภาพและแลกเปลี่ยนทางวิชาการสู่สากล/g, 'ศักยภาพสู่สากล'],
  [/^ถ่ายทอดองค์ความรู้และนวัตกรรมสู่สังคม/g, 'ถ่ายทอดความรู้สู่สังคม'],
  [/^อาจารย์ที่ปรึกษาเพื่อการเรียนรู้และวางแผนชีวิต/g, 'อาจารย์ที่ปรึกษา'],
  [/^ปัจฉิมนิเทศและเตรียมความพร้อมสู่การทำงาน/g, 'ปัจฉิมนิเทศเตรียมทำงาน'],
  [/^อบรมความมั่นคงปลอดภัยไซเบอร์เชิงปฏิบัติการ/g, 'ความปลอดภัยไซเบอร์'],
  [/^เสริมสร้างทักษะวิชาชีพและสมรรถนะนิสิต/g, 'เสริมสมรรถนะนิสิต'],
  [/^สัมมนาเชิงปฏิบัติการเพื่อพัฒนาหลักสูตร/g, 'สัมมนาพัฒนาหลักสูตร'],

  // Full known project titles -> crisp recognizable 1-line aliases
  [/^ปฐมนิเทศนิสิตใหม่ภาควิชาวิศวกรรมคอมพิวเตอร์/g, 'ปฐมนิเทศนิสิตใหม่'],
  [/^ทำบุญและพัฒนาภาควิชาวิศวกรรมคอมพิวเตอร์/g, 'ทำบุญพัฒนาภาควิชา'],
  [/^เสริมความรู้และทักษะสำหรับวิศวกรคอมพิวเตอร์/g, 'เสริมความรู้&ทักษะ'],
  [/^พัฒนาศักยภาพนิสิตสู่ความเป็นเลิศระดับสากล/g, 'พัฒนาศักยภาพนิสิต'],
  [/^กีฬาสัมพันธ์นิสิตภาควิชาวิศวกรรมคอมพิวเตอร์/g, 'กีฬาสัมพันธ์นิสิต'],
  [/^ติดตามผลการเรียนและพัฒนาทักษะวิชาการ/g, 'ติดตามผลการเรียน'],
  [/^ค่ายหุ่นยนต์และปัญญาประดิษฐ์เพื่อการเรียนรู้/g, 'ค่ายหุ่นยนต์ & AI'],
  [/^บำเพ็ญประโยชน์จิตอาสาพัฒนาโรงเรียนชุมชน/g, 'จิตอาสาพัฒนา ร.ร.'],
  [/^ส่งเสริมคุณธรรม จริยธรรม และจรรยาบรรณวิชาชีพวิศวกร/g, 'คุณธรรม & จรรยาบรรณ'],
  [/^ส่งเสริมศักยภาพสู่สากลและการแลกเปลี่ยนทางวิชาการ/g, 'ศักยภาพสู่สากล'],
  [/^แบ่งปันความรู้และประสบการณ์วิศวกรรมคอมพิวเตอร์สู่สังคม/g, 'แบ่งปันความรู้สู่สังคม'],
  [/^นวัตกรรมสีเขียวและเทคโนโลยีรักษาสิ่งแวดล้อม/g, 'นวัตกรรมสีเขียว'],
  [/^อาจารย์ที่ปรึกษาพบนิสิตชีวิตออกแบบได้/g, 'อาจารย์ที่ปรึกษาพบนิสิต'],
  [/^ปัจฉิมนิเทศและเตรียมความพร้อมสู่การทำงานวิศวกรรม/g, 'ปัจฉิมนิเทศเตรียมทำงาน'],

  // Year 2567 variations
  [/^ปฐมนิเทศนิสิตใหม่/g, 'ปฐมนิเทศนิสิตใหม่'],
  [/^ทำบุญและสืบสานวัฒนธรรมภาควิชา/g, 'ทำบุญสืบสานวัฒนธรรม'],
  [/^กีฬาสานสัมพันธ์วิศวคอมพิวเตอร์/g, 'กีฬาสานสัมพันธ์'],
  [/^ส่งเสริมจริยธรรมนักวิชาชีพไอที/g, 'จริยธรรมวิชาชีพไอที'],
  [/^อาสาพัฒนาและบริการวิชาการแก่ชุมชน/g, 'อาสาพัฒนาชุมชน'],
  [/^เทคโนโลยีสะอาดและสิ่งแวดล้อมน่าอยู่/g, 'เทคโนโลยีสะอาด'],

  // Generic phrase simplifications
  [/ภาควิชาวิศวกรรมคอมพิวเตอร์/g, ''],
  [/วิศวกรรมคอมพิวเตอร์/g, 'วิศวคอมฯ'],
  [/สำหรับวิศวกรคอมพิวเตอร์/g, ''],
  [/ปัญญาประดิษฐ์/g, 'AI'],
  [/เทคโนโลยีสารสนเทศ/g, 'IT'],
  [/การแข่งขันเขียนโปรแกรมคอมพิวเตอร์/g, 'แข่งเขียนโปรแกรม'],
  [/แข่งขันเขียนโปรแกรมคอมพิวเตอร์/g, 'แข่งเขียนโปรแกรม'],
  [/การอบรมเชิงปฏิบัติการการพัฒนา/g, 'อบรมพัฒนา'],
  [/การอบรมเชิงปฏิบัติการ/g, 'อบรม'],
  [/อบรมเชิงปฏิบัติการ/g, 'อบรม'],
  [/การรักษาความมั่นคงปลอดภัยไซเบอร์/g, 'ไซเบอร์'],
  [/ความมั่นคงปลอดภัยไซเบอร์/g, 'ไซเบอร์'],
  [/บำเพ็ญประโยชน์จิตอาสาพัฒนาโรงเรียนชุมชน/g, 'จิตอาสาพัฒนา ร.ร.'],
  [/บำเพ็ญประโยชน์จิตอาสา/g, 'จิตอาสา'],
  [/จิตอาสาพัฒนาโรงเรียนชุมชน/g, 'จิตอาสาพัฒนา ร.ร.'],
  [/ส่งเสริมคุณธรรม จริยธรรม และจรรยาบรรณวิชาชีพวิศวกร/g, 'คุณธรรม & จรรยาบรรณ'],
  [/ส่งเสริมคุณธรรม จริยธรรม/g, 'คุณธรรม & จริยธรรม'],
  [/และการแลกเปลี่ยนทางวิชาการ/g, ''],
  [/สู่ความเป็นเลิศระดับสากล/g, 'สู่สากล'],
  [/และเตรียมความพร้อมสู่การทำงาน/g, 'เตรียมทำงาน'],
  [/และประสบการณ์/g, ''],
  [/และทักษะ/g, '&ทักษะ'],
  [/พบนิสิตชีวิตออกแบบได้/g, 'พบนิสิต'],
  [/และบริการวิชาการแก่ชุมชน/g, 'บริการวิชาการ'],
  [/และสิ่งแวดล้อมน่าอยู่/g, ''],
  [/และเทคโนโลยีรักษาสิ่งแวดล้อม/g, ''],
  [/เพื่อการเรียนรู้/g, ''],
];

/**
 * Generates an intelligent, clean 1-line project alias.
 * - Extracts and preserves distinguishing academic year / round suffix e.g. (ปี 67)
 * - Strips administrative boilerplate prefix ("โครงการ", "กิจกรรม")
 * - Applies domain-aware keyword condensation
 * - Prunes subordinate clauses intelligently if length exceeds budget
 * - Truncates strictly at Thai word boundaries as safety net (never mid-word!)
 *
 * @param fullName Original full project name
 * @param maxVisual Max visual character length (default: 22)
 */
export function generateCleanProjectAlias(fullName: string, maxVisual = 24): string {
  if (!fullName) return '';
  let s = fullName.trim();

  // If already short and not a project name, keep as-is (e.g. strategy labels, soft skills)
  if (thaiVisualLength(s) <= 16 && !s.startsWith('โครงการ') && !s.startsWith('กิจกรรม')) {
    return s;
  }

  // 1. Separate & preserve year or iteration suffix
  let suffix = '';
  const suffixMatch = s.match(/\s*(\((?:ปีการศึกษา|ปี)\s*(?:25)?(\d{2,4})\)|\(ครั้งที่\s*(\d+)\)|ประจำปี(?:การศึกษา)?\s*(?:25)?(\d{2,4})|ครั้งที่\s*(\d+))\s*$/);
  if (suffixMatch) {
    const yr = suffixMatch[2] || suffixMatch[4];
    const round = suffixMatch[3] || suffixMatch[5];
    if (yr) {
      const shortYr = yr.length === 4 ? yr.slice(2) : yr;
      suffix = ` (ปี ${shortYr})`;
    } else if (round) {
      suffix = ` (${round})`;
    }
    s = s.slice(0, suffixMatch.index).trim();
  }

  // 2. Strip administrative prefixes
  s = s.replace(/^(?:โครงการ|กิจกรรม|การจัดทำโครงการ|การจัดโครงการ|การดำเนินงาน)\s*/, '');

  // 3. Apply domain replacements
  for (const [re, rep] of DOMAIN_REPLACEMENTS) {
    s = s.replace(re, rep);
  }
  s = s.replace(/\s+/g, ' ').trim();

  const availableBudget = maxVisual - thaiVisualLength(suffix);
  if (thaiVisualLength(s) <= availableBudget) {
    return (s + suffix).trim();
  }

  // 4. Subordinate clause reduction (e.g. เพื่อ..., สู่..., สำหรับ..., ด้าน...)
  const clauseMatches = s.split(/(?=\s*(?:เพื่อ|สู่|สำหรับ|ด้าน|ประจำปี))/);
  if (clauseMatches.length > 1 && thaiVisualLength(clauseMatches[0]) >= 8) {
    const candidate = clauseMatches[0].trim();
    if (thaiVisualLength(candidate) <= availableBudget) {
      return (candidate + suffix).trim();
    }
  }

  // 5. Word-boundary safe truncation (Safety Net)
  const words = segmentThaiWords(s);
  let res = '';
  for (const w of words) {
    if (thaiVisualLength(res + w) > availableBudget - 1) break;
    res += w;
  }
  res = res.trim();
  if (!res) res = s.slice(0, Math.max(1, availableBudget - 1));

  return (res + '…' + suffix).trim();
}

/**
 * Formats labels for vertical bar charts (BarChart):
 * - count > 12: 1-line clean alias (tilted at 35°-45°)
 * - count 7..12: up to 3 lines (max 12 visual chars per line) split strictly at Thai word boundaries
 * - count <= 6: 2 balanced lines split strictly at Thai word boundaries
 */
export function wrapThaiLabelForVerticalChart(label: string, totalCount = 10): string | string[] {
  if (totalCount > 12) {
    return generateCleanProjectAlias(label, 18);
  }

  // 7 to 12 items: 2-3 lines (max ~12 visual chars/line)
  if (totalCount > 6) {
    const alias = generateCleanProjectAlias(label, 26);
    const words = segmentThaiWords(alias);
    const maxPerLine = 12;
    const maxLines = 3;
    const lines: string[] = [];
    let current = '';

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (current && (thaiVisualLength(current + w) > maxPerLine)) {
        lines.push(current.trim());
        current = '';
        if (lines.length === maxLines - 1) {
          const rest = words.slice(i).join('').trim();
          lines.push(thaiVisualLength(rest) > maxPerLine ? rest.slice(0, maxPerLine - 1) + '…' : rest);
          return lines;
        }
      }
      current += w;
    }
    if (current) lines.push(current.trim());
    return lines;
  }

  // <= 6 items: 2 balanced lines
  const clean = label.replace(/^(?:โครงการ|กิจกรรม)\s*/, '');
  if (thaiVisualLength(clean) <= 16) return [clean];

  const words = segmentThaiWords(clean);
  const targetLen = thaiVisualLength(clean) / 2;
  let currentLen = 0;
  let bestIdx = 0;
  let bestDiff = Infinity;

  for (let i = 0; i < words.length - 1; i++) {
    currentLen += thaiVisualLength(words[i]);
    const diff = Math.abs(currentLen - targetLen);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }

  const line1 = words.slice(0, bestIdx + 1).join('').trim();
  const line2 = words.slice(bestIdx + 1).join('').trim();
  return [line1, line2];
}
