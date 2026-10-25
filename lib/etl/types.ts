// lib/etl/types.ts — Type definitions for ETL pipeline

import { ProjectType, KUIdentity, PLONumber, SoftSkillArea } from '@/lib/mockData';

export interface RawExcelRow {
  [key: string]: unknown;
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  field: string;
  row: number;
  message: string;
  rawValue?: unknown;
  fixedValue?: unknown;
}

export interface CleansedRecord {
  missingMetrics?: import('@/lib/projectAvailability').ProjectMetric[];
  kpis?: Partial<import('@/lib/db/kpi').EvaluationInput>[];
  responsibleNames?: string[];
  respondentsKnown?: boolean;
  tempId: string;
  rowNumber: number;
  code: string;
  name: string;
  lecturer: string;
  type: ProjectType;
  budget: number;
  actual: number;
  target: number;
  participants: number;
  respondents: number;
  evalRate: number;
  satisfaction: number;
  hours: number;
  startDate: string;
  endDate: string;
  academicYear: number;
  semester: 't1' | 't2' | 'summer';
  fiscalYear?: number;
  sdg: boolean;
  sdgList: number[];
  ku: KUIdentity;
  kuList: KUIdentity[];
  plo: PLONumber[];
  softSkills: number[];
  softSkill?: SoftSkillArea;
  strategy3: boolean;
  strategySubs?: number[];
  remarks: string;
  issues: ValidationIssue[];
  status: 'valid' | 'warning' | 'error';
}

export interface EtlParseResult {
  fileName: string;
  totalRows: number;
  validCount: number;
  warningCount: number;
  errorCount: number;
  records: CleansedRecord[];
  summaryIssues: ValidationIssue[];
}

export interface EtlImportPayload {
  records: Omit<CleansedRecord, 'tempId' | 'issues' | 'status' | 'rowNumber'>[];
}

export interface EtlImportResponse {
  success: boolean;
  insertedCount: number;
  updatedCount: number;
  totalProjects: number;
  message: string;
  isLive: boolean;
}

// ─── Student Attendance ETL Types ─────────────────────────────────────────────

// App-level status. Mirrors the Supabase CHECK constraint on fact_participant.attendance_status
// (FULL_DAY | MORNING_ONLY | AFTERNOON_ONLY | ABSENT). 'leave' is kept for UX but stored as ABSENT.
export type AttendanceStatus =
  | 'attended' // เข้าร่วมทั้งวัน → FULL_DAY
  | 'morning' // เข้าเฉพาะช่วงเช้า → MORNING_ONLY
  | 'afternoon' // เข้าเฉพาะช่วงบ่าย → AFTERNOON_ONLY
  | 'leave' // ลา → ABSENT (DW has no LEAVE value)
  | 'absent'; // ขาด → ABSENT

// fact_participant.session_type CHECK: SINGLE_SESSION | SPLIT_SESSION
export type SessionType = 'SINGLE_SESSION' | 'SPLIT_SESSION';
export type AttendanceImportMode = 'merge' | 'replace';

export interface AttendanceDaySummary {
  date: string;
  registered: number;
  attended: number;
  fullDay: number;
  morning: number;
  afternoon: number;
  absent: number;
}

export interface AttendanceSummary {
  uniqueAttended: number;
  attendedPersonDays: number;
  days: AttendanceDaySummary[];
}

export type DwAttendanceStatus = 'FULL_DAY' | 'MORNING_ONLY' | 'AFTERNOON_ONLY' | 'ABSENT';

export const ATTENDED_STATUSES: AttendanceStatus[] = ['attended', 'morning', 'afternoon'];

export function toDwAttendanceStatus(s: AttendanceStatus): DwAttendanceStatus {
  switch (s) {
    case 'attended':
      return 'FULL_DAY';
    case 'morning':
      return 'MORNING_ONLY';
    case 'afternoon':
      return 'AFTERNOON_ONLY';
    default:
      return 'ABSENT';
  }
}

export interface StudentAttendanceRecord {
  tempId: string;
  rowNumber: number;
  studentId: string;
  checkDate?: string;
  studentName?: string; // Optional (DW does not store names to preserve privacy)
  projectCodeOrName: string;
  projectId?: number;
  cohort: string; // '68', '67', '66', '65', '64-'
  studyYear: number; // 1, 2, 3, 4, 5
  status: AttendanceStatus;
  satisfactionScore?: number;
  remarks: string;
  issues: ValidationIssue[];
}

export interface AttendanceParseResult {
  fileName: string;
  totalRows: number;
  validCount: number;
  warningCount: number;
  errorCount: number;
  cohortBreakdown: Record<string, number>; // e.g. { 'ปี 1 (รุ่น 68)': 45, 'ปี 2 (รุ่น 67)': 12 }
  statusBreakdown?: Record<AttendanceStatus, number>;
  records: StudentAttendanceRecord[];
  summaryIssues: ValidationIssue[];
}

export interface AttendanceImportResponse {
  success: boolean;
  importedCount: number;
  projectId: number;
  projectName: string;
  newParticipantTotal: number;
  cohortBreakdown: Record<string, number>;
  message: string;
  isLive: boolean;
  summary: AttendanceSummary;
}
