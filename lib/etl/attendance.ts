import { AttendanceStatus, StudentAttendanceRecord, ATTENDED_STATUSES } from './types';

export class EtlValidationError extends Error {}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function normalizeAttendanceDate(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number' && value > 20000 && value < 70000) {
    return new Date(Math.round((value - 25569) * 86400000)).toISOString().slice(0, 10);
  }
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  const text = String(value).trim();
  const dmy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!dmy) return text;
  const year = Number(dmy[3]) > 2500 ? Number(dmy[3]) - 543 : Number(dmy[3]);
  return `${year}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
}

/** Only combine duplicate rows within one upload. A later import can correct a status. */
export function mergeAttendanceStatus(a: AttendanceStatus, b: AttendanceStatus): AttendanceStatus {
  if (a === 'attended' || b === 'attended') return 'attended';
  if ((a === 'morning' && b === 'afternoon') || (a === 'afternoon' && b === 'morning')) return 'attended';
  if (ATTENDED_STATUSES.includes(a)) return a;
  if (ATTENDED_STATUSES.includes(b)) return b;
  return b;
}

export function deduplicateAttendance(records: StudentAttendanceRecord[]): StudentAttendanceRecord[] {
  const unique = new Map<string, StudentAttendanceRecord>();
  for (const record of records) {
    const key = `${record.checkDate ?? ''}:${record.studentId}`;
    const previous = unique.get(key);
    unique.set(key, previous ? {
      ...previous,
      status: mergeAttendanceStatus(previous.status, record.status),
      satisfactionScore: record.satisfactionScore ?? previous.satisfactionScore,
      issues: [...previous.issues, ...record.issues],
    } : { ...record });
  }
  return Array.from(unique.values());
}

export function validateAttendanceRecords(value: unknown): asserts value is StudentAttendanceRecord[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 10000) {
    throw new EtlValidationError('กรุณาส่งรายชื่อ 1–10,000 รายการต่อครั้ง');
  }
  for (const record of value) {
    if (!record || typeof record !== 'object' || typeof record.studentId !== 'string' || !/^(\d{8}|\d{10})$/.test(record.studentId)
      || !['attended', 'morning', 'afternoon', 'leave', 'absent'].includes(record.status)
      || !Array.isArray(record.issues) || record.issues.some((issue: { type?: string }) => issue?.type === 'error')) {
      throw new EtlValidationError('พบรหัสนิสิต สถานะ หรือรายการที่ไม่ผ่านการตรวจสอบ กรุณาแก้ไขก่อนบันทึก');
    }
    if (record.satisfactionScore !== undefined &&
      (!Number.isFinite(record.satisfactionScore) || record.satisfactionScore < 1 || record.satisfactionScore > 5)) {
      throw new EtlValidationError('คะแนนความพึงพอใจต้องอยู่ระหว่าง 1 ถึง 5');
    }
  }
}
