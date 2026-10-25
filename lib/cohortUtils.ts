// lib/cohortUtils.ts — Dynamic Academic Year & Cohort Resolution Engine
// Automatically shifts Cohorts (ปี 1 - ปี 5+) when transitioning across academic years (e.g. 2568 -> 2569 -> 2570)

export interface CohortConfig {
  code: string;       // e.g. '70', '69', '68', '67', '66-'
  label: string;      // e.g. 'รุ่นปี 70'
  studyYear: number;  // 1, 2, 3, 4, 5 (or 0 for future cohort)
  yearLabel: string;  // 'ปี 1', 'ปี 2', 'ปี 3', 'ปี 4', 'ปี 5+'
  fullTitle: string;  // 'รุ่นปี 70 (ชั้นปีที่ 1)'
  badgeText: string;  // 'รุ่นปี 70 (ปี 1)'
  color: string;
  bgAlpha: string;
}

export interface DateContextResult {
  dateStr: string;                      // YYYY-MM-DD
  calendarYearBE: number;               // ปีปฏิทิน พ.ศ. (e.g. 2570)
  calendarYearCE: number;               // ค.ศ. (e.g. 2027)
  month: number;                        // 1 - 12
  day: number;
  academicYearBE: number;               // ปีการศึกษา พ.ศ. (e.g. 2569 if month < 6, 2570 if month >= 6)
  semester: 't1' | 't2' | 'summer';     // 't1' (ภาคต้น), 't2' (ภาคปลาย), 'summer' (ภาคฤดูร้อน)
  semesterLabel: string;                // 'ภาคต้น', 'ภาคปลาย', 'ภาคฤดูร้อน'
  fiscalYearBE: number;                 // ปีงบประมาณ พ.ศ. (1 ต.ค. - 30 ก.ย.)
  activeYear1Prefix: string;            // รหัสนิสิตปี 1 ณ ช่วงเวลานั้น (e.g. '69' หรือ '70')
  isDifferentFromCalendarYear: boolean; // ปีปฏิทิน != ปีการศึกษา
  explanation: string;                  // คำอธิบายบริบทวันที่และปีการศึกษา
}

/**
 * Derives comprehensive date context: Calendar Year, Academic Year, Semester, and Fiscal Year.
 * Critical Rule:
 * Thai Academic Year starts in June and ends in May of the next calendar year.
 * Therefore, Jan - May of Calendar Year 2570 belongs to Academic Year 2569 (Semester 2 / Summer)!
 */
export function deriveDateContext(dateInput: string | Date = new Date()): DateContextResult {
  let date: Date;
  let dateStr = '';

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const parts = trimmed.split('-');
      let y = parseInt(parts[0], 10);
      if (y > 2500) y -= 543; // BE to CE
      date = new Date(y, parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      dateStr = `${y}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    } else {
      date = new Date(dateInput);
      dateStr = !isNaN(date.getTime()) ? date.toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10);
    }
  } else {
    date = dateInput;
    dateStr = !isNaN(date.getTime()) ? date.toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10);
  }

  if (isNaN(date.getTime())) {
    date = new Date();
    dateStr = date.toISOString().substring(0, 10);
  }

  const yCe = date.getFullYear();
  const m = date.getMonth() + 1;
  const day = date.getDate();
  const calendarYearBE = yCe + 543;

  // 1. Academic Year & Semester Calculation
  let academicYearBE = calendarYearBE;
  let semester: 't1' | 't2' | 'summer' = 't1';
  let semesterLabel = 'ภาคต้น';

  if (m >= 6 && m <= 10) {
    // มิถุนายน - ตุลาคม: ภาคต้น ปีการศึกษาปัจจุบัน
    academicYearBE = calendarYearBE;
    semester = 't1';
    semesterLabel = 'ภาคต้น';
  } else if (m >= 11 && m <= 12) {
    // พฤศจิกายน - ธันวาคม: ภาคปลาย ปีการศึกษาปัจจุบัน (ก่อนสิ้นปีปฏิทิน)
    academicYearBE = calendarYearBE;
    semester = 't2';
    semesterLabel = 'ภาคปลาย';
  } else if (m >= 1 && m <= 3) {
    // มกราคม - มีนาคม: ภาคปลาย ของ "ปีการศึกษาก่อนหน้า" (ข้ามปีปฏิทินมาแล้ว)
    academicYearBE = calendarYearBE - 1;
    semester = 't2';
    semesterLabel = 'ภาคปลาย';
  } else {
    // เมษายน - พฤษภาคม: ภาคฤดูร้อน ของ "ปีการศึกษาก่อนหน้า"
    academicYearBE = calendarYearBE - 1;
    semester = 'summer';
    semesterLabel = 'ภาคฤดูร้อน';
  }

  // 2. Fiscal Year (1 ต.ค. - 30 ก.ย.)
  const fiscalYearBE = m >= 10 ? calendarYearBE + 1 : calendarYearBE;

  // 3. Active Year 1 Cohort Prefix
  const activeYear1Prefix = String(academicYearBE % 100).padStart(2, '0');

  const isDifferentFromCalendarYear = calendarYearBE !== academicYearBE;

  const thaiMonths = [
    '', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  let explanation = '';
  if (isDifferentFromCalendarYear) {
    explanation = `วันที่ ${day} ${thaiMonths[m]} ${calendarYearBE} อยู่ในปีปฏิทิน ${calendarYearBE} แต่จัดในช่วง${semesterLabel} จึงนับเป็น "ปีการศึกษา ${academicYearBE}" (นิสิตปี 1 คือรุ่น ${activeYear1Prefix}, ส่วนรุ่น ${calendarYearBE % 100} จะเริ่มศึกษาในเดือน มิ.ย. ${calendarYearBE})`;
  } else {
    explanation = `วันที่ ${day} ${thaiMonths[m]} ${calendarYearBE} อยู่ในปีการศึกษา ${academicYearBE} (${semesterLabel}, ปีงบประมาณ ${fiscalYearBE}, นิสิตปี 1 คือรุ่น ${activeYear1Prefix})`;
  }

  return {
    dateStr,
    calendarYearBE,
    calendarYearCE: yCe,
    month: m,
    day,
    academicYearBE,
    semester,
    semesterLabel,
    fiscalYearBE,
    activeYear1Prefix,
    isDifferentFromCalendarYear,
    explanation,
  };
}

/**
 * Returns current academic year in Buddhist Era (BE) based on date.
 * Thai university academic year transitions around June (Semester 1).
 * Jun-Dec: BE year
 * Jan-May: BE year - 1
 */
export function getCurrentAcademicYearBE(refDate: Date = new Date()): number {
  const yCe = refDate.getFullYear();
  const m = refDate.getMonth() + 1;
  const yBe = yCe + 543;
  return m >= 6 ? yBe : yBe - 1;
}

/**
 * Normalizes an academic year value (handles 'all', string, number, or defaults)
 */
export function resolveAcademicYearBE(yearInput?: string | number, fallbackYear = 2568): number {
  if (!yearInput || yearInput === 'all') return fallbackYear;
  const parsed = parseInt(String(yearInput), 10);
  if (!isNaN(parsed) && parsed > 2500 && parsed < 2650) {
    return parsed;
  }
  return fallbackYear;
}

/**
 * Calculates study year (1, 2, 3, 4, 5+) from 2-digit student cohort prefix
 * given an active academic year (e.g. 2570, 2569, 2568)
 * Returns 0 if student has not yet entered university in that academic year.
 */
export function calculateStudyYearFromPrefix(prefix: string, academicYearBE: number): number {
  const pNum = parseInt(prefix, 10);
  if (isNaN(pNum)) return 1;

  // e.g., 2570 -> 70, 2568 -> 68
  const currentTwoDigit = academicYearBE % 100;

  // Study year = (currentTwoDigit - pNum) + 1
  const studyYear = currentTwoDigit - pNum + 1;

  if (studyYear <= 0) return 0; // Future cohort or pre-matriculation
  if (studyYear >= 5) return 5; // Year 5 and above (senior / delayed)
  return studyYear;
}

/**
 * Generates the dynamic CohortConfig list for any given academic year.
 * In 2568: [68 (ปี 1), 67 (ปี 2), 66 (ปี 3), 65 (ปี 4), 64- (ปี 5+)]
 * In 2570: [70 (ปี 1), 69 (ปี 2), 68 (ปี 3), 67 (ปี 4), 66- (ปี 5+)]
 */
export function getDynamicCohortList(academicYearBE: number): CohortConfig[] {
  const y2 = academicYearBE % 100;
  const colors = [
    { color: '#1E61F0', bgAlpha: 'rgba(30, 97, 240, 0.15)' },  // Year 1 (Cobalt)
    { color: '#0D9488', bgAlpha: 'rgba(13, 148, 136, 0.15)' }, // Year 2 (Teal)
    { color: '#7C3AED', bgAlpha: 'rgba(124, 58, 237, 0.15)' }, // Year 3 (Purple)
    { color: '#D97706', bgAlpha: 'rgba(217, 119, 6, 0.15)' },  // Year 4 (Amber)
    { color: '#E11D48', bgAlpha: 'rgba(225, 29, 72, 0.15)' },  // Year 5+ (Crimson)
  ];

  return [
    {
      code: String(y2).padStart(2, '0'),
      label: `รุ่นปี ${y2}`,
      studyYear: 1,
      yearLabel: 'ปี 1',
      fullTitle: `รุ่นปี ${y2} (ชั้นปีที่ 1)`,
      badgeText: `รุ่นปี ${y2} (ปี 1)`,
      ...colors[0],
    },
    {
      code: String(y2 - 1).padStart(2, '0'),
      label: `รุ่นปี ${y2 - 1}`,
      studyYear: 2,
      yearLabel: 'ปี 2',
      fullTitle: `รุ่นปี ${y2 - 1} (ชั้นปีที่ 2)`,
      badgeText: `รุ่นปี ${y2 - 1} (ปี 2)`,
      ...colors[1],
    },
    {
      code: String(y2 - 2).padStart(2, '0'),
      label: `รุ่นปี ${y2 - 2}`,
      studyYear: 3,
      yearLabel: 'ปี 3',
      fullTitle: `รุ่นปี ${y2 - 2} (ชั้นปีที่ 3)`,
      badgeText: `รุ่นปี ${y2 - 2} (ปี 3)`,
      ...colors[2],
    },
    {
      code: String(y2 - 3).padStart(2, '0'),
      label: `รุ่นปี ${y2 - 3}`,
      studyYear: 4,
      yearLabel: 'ปี 4',
      fullTitle: `รุ่นปี ${y2 - 3} (ชั้นปีที่ 4)`,
      badgeText: `รุ่นปี ${y2 - 3} (ปี 4)`,
      ...colors[3],
    },
    {
      code: `${y2 - 4}-`,
      label: `รุ่นปี ${y2 - 4}-`,
      studyYear: 5,
      yearLabel: 'ปี 5+',
      fullTitle: `รุ่นปี ${y2 - 4} และก่อนหน้า (ปี 5+)`,
      badgeText: `รุ่นปี ${y2 - 4}- (ปี 5+)`,
      ...colors[4],
    },
  ];
}

/**
 * Resolves a student's cohort configuration based on their student ID and reference academic year.
 */
export function resolveStudentCohortDynamic(
  studentId: string,
  academicYearBE: number
): CohortConfig {
  const cohortList = getDynamicCohortList(academicYearBE);
  const cleanId = String(studentId || '').trim();
  const prefix = cleanId.substring(0, 2);
  const pNum = parseInt(prefix, 10);
  const y2 = academicYearBE % 100;

  // Handle future cohorts that haven't enrolled yet in this academic year
  if (!isNaN(pNum) && pNum > y2) {
    return {
      code: prefix,
      label: `รุ่นปี ${prefix}`,
      studyYear: 0,
      yearLabel: 'ยังไม่เข้าศึกษา',
      fullTitle: `รุ่นปี ${prefix} (ยังไม่เปิดภาคเรียนในปีการศึกษา ${academicYearBE})`,
      badgeText: `รุ่นปี ${prefix} (รหัสล่วงหน้า)`,
      color: '#64748B',
      bgAlpha: 'rgba(100, 116, 139, 0.15)',
    };
  }

  // Check matching year 1-4
  const matched = cohortList.slice(0, 4).find((c) => c.code === prefix);
  if (matched) return matched;

  // Otherwise returns Year 5+
  return cohortList[4];
}
