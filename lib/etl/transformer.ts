// lib/etl/transformer.ts — Core Data Cleansing & Validation Engine for ETL
import { ProjectType, KUIdentity, PLONumber, SoftSkillArea } from '@/lib/mockData';
import { CleansedRecord, ValidationIssue, EtlParseResult, StudentAttendanceRecord, AttendanceParseResult, AttendanceStatus, ATTENDED_STATUSES } from './types';
import { calculateStudyYearFromPrefix, getDynamicCohortList, resolveAcademicYearBE, deriveDateContext } from '@/lib/cohortUtils';
import { deduplicateAttendance, isIsoDate, normalizeAttendanceDate } from './attendance';

// Helper to sanitize strings
function cleanString(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  return str === '-' ? '' : str;
}

// Helper to parse numbers, cleaning comma separated or messy inputs
function parseCleansedNumber(
  val: unknown,
  fieldName: string,
  rowNum: number,
  issues: ValidationIssue[],
  options: { allowDecimal?: boolean; defaultVal?: number; sumCommaSeparated?: boolean } = {}
): number {
  const { allowDecimal = false, defaultVal = 0, sumCommaSeparated = false } = options;
  if (val === null || val === undefined) return defaultVal;

  if (typeof val === 'number') {
    if (isNaN(val)) return defaultVal;
    return allowDecimal ? Math.round(val * 100) / 100 : Math.round(val);
  }

  const str = String(val).trim().replace(/,/g, '');
  if (str === '-' || str === '' || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'none') {
    return defaultVal;
  }

  // Handle multi-value strings like "15,25" or "15+25" or "15 25"
  const multiValMatch = String(val).trim().match(/^(\d+(?:\.\d+)?)\s*[,+/]\s*(\d+(?:\.\d+)?)/);
  if (multiValMatch && sumCommaSeparated) {
    const num1 = parseFloat(multiValMatch[1]);
    const num2 = parseFloat(multiValMatch[2]);
    const sum = num1 + num2;
    issues.push({
      type: 'warning',
      field: fieldName,
      row: rowNum,
      message: `พบข้อมูลหลายค่า ("${val}"): รวมยอดอัตโนมัติเป็น ${sum}`,
      rawValue: val,
      fixedValue: sum,
    });
    return allowDecimal ? Math.round(sum * 100) / 100 : Math.round(sum);
  }

  // Extract first number if mixed with text
  const numMatch = str.match(/[-+]?[0-9]*\.?[0-9]+/);
  if (!numMatch) {
    issues.push({
      type: 'warning',
      field: fieldName,
      row: rowNum,
      message: `ไม่สามารถแปลง "${val}" เป็นตัวเลขได้ ระบบปรับเป็น ${defaultVal}`,
      rawValue: val,
      fixedValue: defaultVal,
    });
    return defaultVal;
  }

  const parsed = allowDecimal ? parseFloat(numMatch[0]) : parseInt(numMatch[0], 10);
  if (isNaN(parsed)) return defaultVal;

  if (numMatch[0] !== str) {
    issues.push({
      type: 'info',
      field: fieldName,
      row: rowNum,
      message: `สกัดตัวเลขจากข้อความ "${val}" -> ${parsed}`,
      rawValue: val,
      fixedValue: parsed,
    });
  }

  return allowDecimal ? Math.round(parsed * 100) / 100 : Math.round(parsed);
}

// Parse satisfaction score (handles e.g. "4.60 และ 4.19  จาก2วัน", or "-", "N/A", "ไม่มีการประเมิน")
function parseSatisfaction(
  val: unknown,
  rowNum: number,
  issues: ValidationIssue[]
): number {
  if (val === null || val === undefined) return 0;

  if (typeof val === 'number') {
    if (isNaN(val) || val <= 0) return 0; // 0 or negative represents unassessed/no evaluation ('-')
    if (val < 1.0 || val > 5.0) {
      issues.push({
        type: 'warning',
        field: 'satisfaction',
        row: rowNum,
        message: `คะแนนความพึงพอใจ (${val}) อยู่นอกช่วงมาตรฐาน 1.00 - 5.00`,
        rawValue: val,
      });
    }
    return Math.round(val * 100) / 100;
  }

  const str = String(val).trim();
  // Tolerant match for "-" / "—" / "–" / "N/A" / "ไม่มี" / "ไม่ได้ประเมิน" / blank
  if (
    str === '-' ||
    str === '—' ||
    str === '–' ||
    str === '' ||
    str === '.' ||
    str === '0' ||
    str === '0.0' ||
    str === '0.00' ||
    str.toLowerCase() === 'n/a' ||
    str.toLowerCase() === 'none' ||
    str.toLowerCase() === 'null' ||
    str.includes('ไม่มี') ||
    str.includes('ไม่ได้ประเมิน') ||
    str.includes('ไม่ประเมิน') ||
    str.includes('ไม่ระบุ')
  ) {
    return 0; // Return 0 to represent unassessed / '-'
  }

  const numbers = str.match(/\b\d+(?:\.\d+)?\b/g);
  if (numbers && numbers.length > 1) {
    issues.push({ type: 'error', field: 'satisfaction', row: rowNum,
      message: 'พบคะแนนหลายค่าหรือข้อความกำกวม กรุณาส่งคะแนนสรุป หรือผล DAILY พร้อมจำนวนผู้ตอบแต่ละวัน', rawValue: val });
    return 0;
  }

  const single = parseCleansedNumber(val, 'satisfaction', rowNum, issues, {
    allowDecimal: true,
    defaultVal: 0,
  });

  if (single > 5.0) {
    issues.push({
      type: 'error',
      field: 'satisfaction',
      row: rowNum,
      message: `คะแนนความพึงพอใจ (${single}) เกินค่าสูงสุด 5.00`,
      rawValue: val,
    });
  }
  return single;
}

// Parse date string into YYYY-MM-DD and compute academic year / semester
function parseDatesAndAcademic(
  startRaw: unknown,
  endRaw: unknown,
  rowNum: number,
  issues: ValidationIssue[],
  explicitYearRaw?: unknown
): { startDate: string; endDate: string; academicYear: number; semester: 't1' | 't2' | 'summer'; fiscalYear: number } {
  let startDate = '';
  let endDate = '';

  const normalizeDate = (d: unknown): string => {
    if (!d) return '';
    if (d instanceof Date && !isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    // Handle numeric Excel serial date (e.g. 45723 -> 2025-03-07)
    if (typeof d === 'number' && d > 20000 && d < 70000) {
      const jsDate = new Date(Math.round((d - 25569) * 86400 * 1000));
      if (!isNaN(jsDate.getTime())) {
        return jsDate.toISOString().substring(0, 10);
      }
    }
    const str = String(d).trim();
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      return str.substring(0, 10);
    }
    // DD/MM/YYYY
    const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (dmy) {
      let y = parseInt(dmy[3], 10);
      if (y > 2500) y -= 543; // convert BE to CE
      return `${y}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    }
    return '';
  };

  startDate = normalizeDate(startRaw);
  endDate = normalizeDate(endRaw) || startDate;

  if ((startDate && !isIsoDate(startDate)) || (endDate && !isIsoDate(endDate)) || (startDate && endDate < startDate)) {
    issues.push({ type: 'error', field: 'endDate', row: rowNum, message: 'ช่วงวันที่จัดโครงการไม่ถูกต้อง หรือวันที่สิ้นสุดอยู่ก่อนวันเริ่ม' });
  }

  if (!startDate) {
    // Default to current date if missing
    startDate = new Date().toISOString().substring(0, 10);
    endDate = startDate;
    issues.push({
      type: 'warning',
      field: 'startDate',
      row: rowNum,
      message: 'ไม่พบวันที่จัดกิจกรรม ระบบกำหนดเป็นวันที่ปัจจุบัน',
      fixedValue: startDate,
    });
  }

  // Derive Academic Year, Semester, and Fiscal Year using unified engine
  const dateCtx = deriveDateContext(startDate);
  let academicYear = dateCtx.academicYearBE;
  const semester = dateCtx.semester;
  const fiscalYear = dateCtx.fiscalYearBE;

  // Check explicit academic year if provided in row
  if (explicitYearRaw !== undefined && explicitYearRaw !== null && String(explicitYearRaw).trim() !== '') {
    const parsedExp = parseInt(String(explicitYearRaw).replace(/[^0-9]/g, ''), 10);
    if (!isNaN(parsedExp) && parsedExp > 2500 && parsedExp < 2650) {
      if (parsedExp !== academicYear) {
        if (parsedExp === dateCtx.calendarYearBE && dateCtx.isDifferentFromCalendarYear) {
          issues.push({
            type: 'info',
            field: 'academicYear',
            row: rowNum,
            message: `วันที่จัด ${startDate} อยู่ใน${dateCtx.semesterLabel} จึงนับเป็น "ปีการศึกษา ${academicYear}" (ไฟล์ระบุ ${parsedExp} ซึ่งเป็นปีปฏิทิน) ระบบใช้ปีการศึกษา ${academicYear} ตามเกณฑ์ มก.`,
            rawValue: explicitYearRaw,
            fixedValue: academicYear,
          });
        } else {
          issues.push({
            type: 'warning',
            field: 'academicYear',
            row: rowNum,
            message: `ระบุปีการศึกษา ${parsedExp} ต่างจากคำนวณตามวันที่จัด (${academicYear}) ระบบยึดตามที่ระบุในไฟล์`,
            rawValue: explicitYearRaw,
            fixedValue: parsedExp,
          });
          academicYear = parsedExp;
        }
      }
    }
  }

  return { startDate, endDate, academicYear, semester, fiscalYear };
}

// Parse SDGs (e.g. "8", "4, 8, 10", "SDG 8")
function parseSdgs(raw: unknown): { sdg: boolean; sdgList: number[] } {
  if (!raw) return { sdg: false, sdgList: [] };
  const str = String(raw).trim();
  if (str === '-' || str === '' || str.includes('ไม่มี')) return { sdg: false, sdgList: [] };

  const matches = str.match(/\b([1-9]|1[0-7])\b/g);
  if (matches && matches.length > 0) {
    const list = Array.from(new Set(matches.map(Number))).sort((a, b) => a - b);
    return { sdg: true, sdgList: list };
  }
  return { sdg: false, sdgList: [] };
}

// Parse KU Identity (I, D, K, U)
function parseKuList(raw: unknown, fallbackType: ProjectType): { ku: KUIdentity; kuList: KUIdentity[] } {
  const defaultKu = fallbackType.includes('วิชาการ') ? 'K' : fallbackType.includes('บริการ') ? 'I' : 'D';
  if (!raw) return { ku: defaultKu, kuList: [defaultKu] };

  const str = String(raw).toUpperCase();
  const valid: KUIdentity[] = ['I', 'D', 'K', 'U'];
  const found: KUIdentity[] = valid.filter((v) => str.includes(v));

  if (found.length > 0) {
    return { ku: found[0], kuList: found };
  }
  return { ku: defaultKu, kuList: [defaultKu] };
}

// Parse PLO (1 to 4)
function parsePloList(raw: unknown): PLONumber[] {
  if (!raw) return [1];
  const str = String(raw);
  const matches = str.match(/[1-4]/g);
  if (matches && matches.length > 0) {
    return Array.from(new Set(matches.map(Number))) as PLONumber[];
  }
  return [1];
}

// Main transform function: accepts an array of raw objects (from Excel or JSON)
export function transformRawRows(rows: Record<string, unknown>[], fileName = 'data.xlsx'): EtlParseResult {
  const records: CleansedRecord[] = [];
  const allIssues: ValidationIssue[] = [];

  rows.forEach((row, index) => {
    const rowNum = index + 2; // considering 1-based index and header row
    const issues: ValidationIssue[] = [];

    // Skip completely empty rows
    const hasAnyValue = Object.values(row).some((v) => v !== null && v !== undefined && String(v).trim() !== '');
    if (!hasAnyValue) return;

    // Detect field mappings (flexible for Thai/English variations)
    const code = cleanString(
      row['รหัสกิจกรรม'] ?? row['Activity_Code'] ?? row['code'] ?? '-'
    ) || '-';

    const name = cleanString(
      row['ชื่อโครงการ'] ?? row['ชื่อกิจกรรม'] ?? row['Project_Name'] ?? row['Activity_Name'] ?? row['name']
    );

    if (!name || name === 'โฟลเดอร์รวมไฟล์ โครงการปี68' || name.startsWith('โฟลเดอร์')) {
      // Skip metadata or header notes
      return;
    }

    const lecturer = cleanString(
      row['อาจารย์ผู้รับผิดชอบ'] ?? row['อาจารย์ที่ปรึกษา'] ?? row['ผู้รับผิดชอบ'] ?? row['lecturer'] ?? 'ไม่ระบุ'
    ) || 'ไม่ระบุ';

    const rawType = cleanString(
      row['หมวดหมู่กิจกรรม'] ?? row['ประเภทกิจกรรม'] ?? row['ประเภทโครงการ'] ?? row['type']
    );
    let type: ProjectType = 'กิจกรรมวิชาการที่ส่งเสริมคุณลักษณะบัณฑิตที่พึงประสงค์';
    if (rawType.includes('หลักสูตร')) type = 'พัฒนาหลักสูตร';
    else if (rawType.includes('บำเพ็ญ')) type = 'กิจกรรมบำเพ็ญประโยชน์';
    else if (rawType.includes('กีฬา')) type = 'กิจกรรมกีฬาหรือส่งเสริมสุขภาพ';
    else if (rawType.includes('ศิลปะ') || rawType.includes('วัฒนธรรม')) type = 'กิจกรรมเสริมสร้างศิลปะและวัฒนธรรม';
    else if (rawType.includes('สิ่งแวดล้อม')) type = 'กิจกรรมส่งเสริมการรักษาสิ่งแวดล้อม';
    else if (rawType.includes('คุณธรรม') || rawType.includes('จริยธรรม')) type = 'กิจกรรมเสริมสร้างคุณธรรมและจริยธรรม';

    // Numbers & Budgets
    const budget = parseCleansedNumber(
      row['งบอนุมัติ'] ?? row['งบประมาณอนุมัติ'] ?? row['งบประมาณที่ได้รับอนุมัติ'] ?? row['budget'],
      'budget',
      rowNum,
      issues,
      { allowDecimal: true, defaultVal: 0 }
    );

    const actual = parseCleansedNumber(
      row['งบใช้งานจริง'] ?? row['งบใช้จริง'] ?? row['งบประมาณที่ใช้จริง'] ?? row['actual'],
      'actual',
      rowNum,
      issues,
      { allowDecimal: true, defaultVal: 0 }
    );

    if (actual > budget && budget > 0) {
      issues.push({
        type: 'warning',
        field: 'actual',
        row: rowNum,
        message: `งบใช้งานจริง (${actual.toLocaleString()} บาท) สูงกว่างบอนุมัติ (${budget.toLocaleString()} บาท)`,
        rawValue: actual,
      });
    }

    // Participants & Target
    const target = parseCleansedNumber(
      row['กลุ่มเป้าหมายผู้เข้าร่วม'] ?? row['เป้าหมายผู้เข้าร่วม'] ?? row['เป้าหมาย'] ?? row['target'],
      'target',
      rowNum,
      issues,
      { defaultVal: 0 }
    );

    const participants = parseCleansedNumber(
      row['จำนวนผู้เข้าร่วมจริง'] ?? row['ผู้เข้าร่วมจริง'] ?? row['participants'],
      'participants',
      rowNum,
      issues,
      { defaultVal: 0 }
    );

    // Respondents (can be comma-separated e.g. "15,25")
    const rawRespondents = row['จำนวนผู้ทำแบบสอบถาม'] ?? row['ผู้ตอบแบบประเมิน'] ?? row['respondents'];
    const respondents = parseCleansedNumber(
      rawRespondents,
      'respondents',
      rowNum,
      issues,
      { defaultVal: 0 }
    );

    // Eval Rate
    const evalRate = participants > 0 ? Math.round((respondents / participants) * 1000) / 10 : 0;
    if (respondents > participants) issues.push({ type: 'error', field: 'respondents', row: rowNum, message: 'จำนวนผู้ตอบเกินผู้เข้าร่วม กรุณาตรวจขอบเขตการประเมิน' });
    if (typeof rawRespondents === 'string' && /[+\/]|^\d{1,2},\d{1,2}$/.test(rawRespondents.trim())) issues.push({ type: 'error', field: 'respondents', row: rowNum, message: 'จำนวนผู้ตอบหลายรอบต้องนำเข้าเป็น DAILY แยกวัน' });

    // Satisfaction score
    const satisfaction = parseSatisfaction(
      row['คะแนนความพึงพอใจเฉลี่ย'] ?? row['คะแนนความพึงพอใจ'] ?? row['satisfaction'],
      rowNum,
      issues
    );

    // Duration hours
    const hours = parseCleansedNumber(
      row['จำนวนชั่วโมงกิจกรรม (ชั่วโมง)'] ?? row['จำนวนชั่วโมง'] ?? row['ชั่วโมง'] ?? row['hours'],
      'hours',
      rowNum,
      issues,
      { allowDecimal: true, defaultVal: 0, sumCommaSeparated: true }
    );

    // Dates and Academic Year
    const startRaw = row['วันที่จัด'] ?? row['วันที่เริ่มจัด'] ?? row['startDate'];
    const endRaw = row['วันที่สิ้นสุด'] ?? row['endDate'];
    const expYearRaw = row['ปีการศึกษา'] ?? row['Academic_Year'] ?? row['academicYear'];
    const { startDate, endDate, academicYear, semester, fiscalYear } = parseDatesAndAcademic(
      startRaw,
      endRaw,
      rowNum,
      issues,
      expYearRaw
    );

    // Strategic Dimensions
    const { sdg, sdgList } = parseSdgs(row['SDGs'] ?? row['sdg'] ?? row['เป้าหมาย SDGs']);
    const { ku, kuList } = parseKuList(row['อัตลักษณ์'] ?? row['อัตลักษณ์ KU'] ?? row['ku'], type);
    const plo = parsePloList(row['PLO'] ?? row['plo']);

    // Soft skill
    let softSkill: SoftSkillArea | undefined;
    const rawSoft = cleanString(row['Soft Skill'] ?? row['softSkill'] ?? row['ทักษะ']);
    if (rawSoft.includes('คิด') || rawSoft.includes('แก้ปัญหา')) softSkill = 'การคิดแก้ปัญหา';
    else if (rawSoft.includes('บริหาร')) softSkill = 'การบริหารตัวเอง';
    else if (rawSoft.includes('ทีม')) softSkill = 'การทำงานเป็นทีม';
    else if (rawSoft.includes('สร้างสรรค์')) softSkill = 'ความคิดสร้างสรรค์';
    else if (rawSoft.includes('สื่อสาร')) softSkill = 'การสื่อสาร';

    const strategy3 = String(row['ยุทธศาสตร์ที่ 3'] ?? row['strategy3'] ?? '').includes('ใช่') ||
      String(row['ยุทธศาสตร์ที่ 3'] ?? '').includes('true') ||
      type.includes('วิชาการ');

    const remarks = cleanString(row['หมายเหตุ'] ?? row['remarks']);

    // Determine record status
    const hasError = issues.some((i) => i.type === 'error');
    const hasWarning = issues.some((i) => i.type === 'warning');
    const status: 'valid' | 'warning' | 'error' = hasError ? 'error' : hasWarning ? 'warning' : 'valid';

    allIssues.push(...issues);

    records.push({
      tempId: `row-${rowNum}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      rowNumber: rowNum,
      code,
      name,
      lecturer,
      type,
      budget,
      actual,
      target,
      participants,
      respondents,
      missingMetrics: ([
        ['budget', row['งบอนุมัติ'] ?? row['งบประมาณอนุมัติ'] ?? row['งบประมาณที่ได้รับอนุมัติ'] ?? row['budget']],
        ['actual', row['งบใช้งานจริง'] ?? row['งบใช้จริง'] ?? row['งบประมาณที่ใช้จริง'] ?? row['actual']],
        ['target', row['กลุ่มเป้าหมายผู้เข้าร่วม'] ?? row['เป้าหมายผู้เข้าร่วม'] ?? row['เป้าหมาย'] ?? row['target']],
        ['participants', row['จำนวนผู้เข้าร่วมจริง'] ?? row['ผู้เข้าร่วมจริง'] ?? row['participants']],
        ['hours', row['จำนวนชั่วโมงกิจกรรม (ชั่วโมง)'] ?? row['จำนวนชั่วโมง'] ?? row['ชั่วโมง'] ?? row['hours']],
      ] as const).filter(([,v]) => v === null || v === undefined || ['', '-', 'n/a'].includes(String(v).trim().toLowerCase())).map(([metric]) => metric),
      respondentsKnown: rawRespondents !== null && rawRespondents !== undefined && !['', '-', 'n/a'].includes(String(rawRespondents).trim().toLowerCase()),
      evalRate,
      satisfaction,
      hours,
      startDate,
      endDate,
      academicYear,
      semester,
      fiscalYear,
      sdg,
      sdgList,
      ku,
      kuList,
      plo,
      softSkills: [],
      softSkill,
      strategy3,
      remarks,
      issues,
      status,
    });
  });

  const validCount = records.filter((r) => r.status === 'valid').length;
  const warningCount = records.filter((r) => r.status === 'warning').length;
  const errorCount = records.filter((r) => r.status === 'error').length;

  return {
    fileName,
    totalRows: records.length,
    validCount,
    warningCount,
    errorCount,
    records,
    summaryIssues: allIssues,
  };
}

// ─── Student Attendance Transform Engine ──────────────────────────────────────

export function transformAttendanceRows(
  rows: Record<string, unknown>[],
  fileName = 'attendance.xlsx',
  defaultProjectId?: number,
  defaultProjectName?: string,
  targetAcademicYearBE?: number,
  context: { checkDate?: string; projectCode?: string } = {}
): AttendanceParseResult {
  const records: StudentAttendanceRecord[] = [];
  const allIssues: ValidationIssue[] = [];
  const seenStudentIds = new Set<string>();

  const academicYear = resolveAcademicYearBE(targetAcademicYearBE, 2568);
  const cohortList = getDynamicCohortList(academicYear);

  const cohortBreakdown: Record<string, number> = {};
  cohortList.forEach((c) => {
    cohortBreakdown[c.badgeText] = 0;
  });

  rows.forEach((row, index) => {
    const rowNum = index + 2;
    const issues: ValidationIssue[] = [];

    // Extract student ID
    const rawId = row['รหัสนิสิต'] ?? row['รหัสนิสิต (10 หลัก)'] ?? row['studentId'] ?? row['student_id'] ?? row['id'];
    if (!rawId) return;

    const studentId = String(rawId).trim();
    if (studentId.length === 0) return;

    // Check student ID validity (typically 10 or 8 digits)
    if (!/^(\d{8}|\d{10})$/.test(studentId)) {
      issues.push({
        type: 'error',
        field: 'studentId',
        row: rowNum,
        message: `รหัสนิสิต "${studentId}" มีความยาว ${studentId.length} หลัก (ปกติ 10 หลัก)`,
        rawValue: rawId,
      });
    }

    // Dynamically calculate Study Year and Cohort relative to the active academic year
    const prefix = studentId.substring(0, 2);
    const studyYear = calculateStudyYearFromPrefix(prefix, academicYear);
    const pNum = parseInt(prefix, 10);

    let cohort = prefix;
    let cohortLabel = `รุ่นปี ${prefix}`;

    if (studyYear === 0) {
      cohortLabel = `รุ่นปี ${prefix} (รหัสล่วงหน้า/ยังไม่เข้าศึกษา)`;
      issues.push({
        type: 'warning',
        field: 'studentId',
        row: rowNum,
        message: `รหัสนิสิต ${studentId} (รุ่น ${prefix}) ระบุการเข้าศึกษาปี ${2500 + pNum} ซึ่งยังไม่เปิดภาคเรียนในปีการศึกษา ${academicYear} (จะเริ่มศึกษาในภาคต้น มิ.ย. ${2500 + pNum})`,
        rawValue: studentId,
      });
    } else {
      const matchedCohort = cohortList.find((c) => c.studyYear === studyYear) || cohortList[4];
      cohort = matchedCohort.code;
      cohortLabel = matchedCohort.badgeText;
    }

    // Check duplicate student in this upload batch
    if (seenStudentIds.has(studentId)) {
      issues.push({
        type: 'warning',
        field: 'studentId',
        row: rowNum,
        message: `พบรหัสนิสิต ${studentId} ซ้ำในไฟล์ ระบบจะควบรวมรายการ`,
        rawValue: studentId,
      });
    } else {
      seenStudentIds.add(studentId);
    }

    // Student Name (optional, DW stores student_id only)
    const rawName = row['ชื่อ - นามสกุล'] ?? row['ชื่อ-นามสกุล'] ?? row['ชื่อ'] ?? row['name'] ?? row['studentName'];
    const studentName = cleanString(rawName) || undefined;

    // Project Name / Code
    const projectCodeOrName = cleanString(
      row['รหัสกิจกรรมหรือชื่อโครงการ'] ?? row['ชื่อโครงการ'] ?? row['โครงการ'] ?? defaultProjectName ?? 'โครงการไม่ระบุ'
    );
    const checkDate = normalizeAttendanceDate(row['วันที่เช็คชื่อ'] ?? row['checkDate']) || context.checkDate;
    if (checkDate && (!isIsoDate(checkDate) || (context.checkDate && checkDate !== context.checkDate))) {
      issues.push({ type: 'error', field: 'checkDate', row: rowNum, message: 'วันที่ในไฟล์ต้องตรงกับวันที่เช็คชื่อที่เลือก ให้นำเข้าแยกแต่ละวัน' });
    }
    if (context.projectCode && defaultProjectName && ![context.projectCode, defaultProjectName].includes(projectCodeOrName)) {
      issues.push({ type: 'error', field: 'projectId', row: rowNum, message: 'โครงการในแถวนี้ไม่ตรงกับโครงการที่เลือก กรุณานำเข้าแยกโครงการ' });
    }

    // Attendance Status & Session (Tolerant normalization for: เช้า, บ่าย, บางช่วง, ลา, ขาด, ลงทะเบียน, เข้าร่วมจริง)
    const rawStatus = String(row['สถานะการเข้าร่วม'] ?? row['สถานะการเข้าร่วม (ทั้งวัน / เช้า / บ่าย / บางช่วง / ลา / ขาด)'] ?? row['สถานะ'] ?? row['ช่วงเวลา'] ?? row['session'] ?? row['status'] ?? '')
      .trim()
      .toLowerCase();
    let status: AttendanceStatus = 'attended';

    if (rawStatus.includes('ลา') || rawStatus.includes('leave') || rawStatus.includes('ป่วย')) {
      status = 'leave';
    } else if (rawStatus.includes('morning_only') || rawStatus.includes('เช้า') || rawStatus.includes('morning') || rawStatus === 'am') {
      status = 'morning';
    } else if (rawStatus.includes('afternoon_only') || rawStatus.includes('บ่าย') || rawStatus.includes('afternoon') || rawStatus === 'pm') {
      status = 'afternoon';
    } else if (
      rawStatus.includes('absent') ||
      rawStatus.includes('ไม่มา') ||
      rawStatus.includes('ขาด') ||
      rawStatus === '0' ||
      rawStatus === 'false' ||
      rawStatus === 'no'
    ) {
      status = 'absent';
    } else if (['attended', 'full_day', '1', 'true', 'yes', 'มา', 'ครบ', 'ทั้งวัน'].includes(rawStatus) || rawStatus.includes('ทั้งวัน') || rawStatus.includes('เข้าร่วมจริง')) {
      status = 'attended';
    } else {
      status = 'absent';
      issues.push({ type: 'error', field: 'status', row: rowNum, message: 'ไม่รู้จักสถานะการเข้าร่วม กรุณาระบุทั้งวัน เช้า บ่าย ลา หรือขาดให้ชัดเจน' });
    }

    // Cohort breakdown counts students who participated (full day, morning, or afternoon)
    if (ATTENDED_STATUSES.includes(status)) {
      cohortBreakdown[cohortLabel] = (cohortBreakdown[cohortLabel] || 0) + 1;
    }

    // Individual Satisfaction Score (optional, handles '-' or empty if unassessed)
    const rawSat = row['คะแนนความพึงพอใจรายบุคคล'] ?? row['ความพึงพอใจ'] ?? row['satisfaction'];
    let satisfactionScore: number | undefined;
    if (rawSat !== undefined && rawSat !== null && String(rawSat).trim() !== '') {
      const satTrim = String(rawSat).trim();
      if (
        satTrim !== '-' &&
        satTrim !== '—' &&
        satTrim !== '–' &&
        satTrim.toLowerCase() !== 'n/a' &&
        satTrim.toLowerCase() !== 'none' &&
        !satTrim.includes('ไม่มี')
      ) {
        const num = parseFloat(satTrim);
        if (!isNaN(num) && num >= 1.0 && num <= 5.0) {
          satisfactionScore = Math.round(num * 100) / 100;
        }
      }
    }

    const remarks = cleanString(row['หมายเหตุ'] ?? row['remarks']);

    allIssues.push(...issues);

    records.push({
      tempId: `att-${rowNum}-${studentId}-${Date.now()}`,
      rowNumber: rowNum,
      studentId,
      checkDate,
      studentName,
      projectCodeOrName,
      projectId: defaultProjectId,
      cohort,
      studyYear,
      status,
      satisfactionScore,
      remarks,
      issues,
    });
  });

  const mergedRecords = deduplicateAttendance(records);
  Object.keys(cohortBreakdown).forEach((key) => { cohortBreakdown[key] = 0; });
  mergedRecords.forEach((record) => {
    if (!ATTENDED_STATUSES.includes(record.status) || record.issues.some((i) => i.type === 'error')) return;
    const key = record.studyYear === 0 ? `รุ่นปี ${record.studentId.slice(0, 2)} (รหัสล่วงหน้า/ยังไม่เข้าศึกษา)`
      : (cohortList.find((c) => c.studyYear === record.studyYear) || cohortList[4]).badgeText;
    cohortBreakdown[key] = (cohortBreakdown[key] || 0) + 1;
  });
  const errorCount = mergedRecords.filter((record) => record.issues.some((issue) => issue.type === 'error')).length;
  const warningCount = mergedRecords.filter((record) => record.issues.some((issue) => issue.type === 'warning')).length;
  const validCount = mergedRecords.length - errorCount;

  const statusBreakdown: Record<AttendanceStatus, number> = {
    attended: mergedRecords.filter((r) => r.status === 'attended').length,
    morning: mergedRecords.filter((r) => r.status === 'morning').length,
    afternoon: mergedRecords.filter((r) => r.status === 'afternoon').length,
    leave: mergedRecords.filter((r) => r.status === 'leave').length,
    absent: mergedRecords.filter((r) => r.status === 'absent').length,
  };

  return {
    fileName,
    totalRows: mergedRecords.length,
    validCount,
    warningCount,
    errorCount,
    cohortBreakdown,
    statusBreakdown,
    records: mergedRecords,
    summaryIssues: allIssues,
  };
}
