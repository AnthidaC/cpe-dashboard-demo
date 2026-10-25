import { EtlValidationError, isIsoDate } from './attendance';
import type { EvaluationInput } from '@/lib/db/kpi';

export function validateEvaluations(value: unknown, start: string, end: string): asserts value is EvaluationInput[] {
  const fail = (message: string): never => { throw new EtlValidationError(message); };
  if (!Array.isArray(value) || value.length > 1000) fail('ผลประเมินต้องเป็นรายการไม่เกิน 1,000 แถว');
  const rows = value as unknown[];
  const seen = new Set<string>();
  let all = false;
  for (const raw of rows) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('รูปแบบผลประเมินไม่ถูกต้อง');
    const r = raw as EvaluationInput;
    if (!['ALL', 'DAILY'].includes(r.evaluation_type)) fail('ประเภทผลประเมินต้องเป็น ALL หรือ DAILY');
    if (r.evaluation_type === 'ALL') {
      all = true;
      if (r.date !== null) fail('ผลรวม ALL ต้องไม่มีวันที่');
    } else if (!isIsoDate(r.date) || r.date! < start || r.date! > end) fail('วันประเมินต้องอยู่ในช่วงโครงการ');
    const key = r.evaluation_type === 'ALL' ? 'ALL' : r.date!;
    if (seen.has(key)) fail('ผลประเมินซ้ำในวันเดียวกัน');
    seen.add(key);
    for (const n of [r.respondent_count, r.eligible_count]) if (n !== null && (!Number.isSafeInteger(n) || n < 0 || n > 2147483647)) fail('จำนวนผู้ตอบและผู้มีสิทธิ์ต้องเป็นจำนวนเต็มไม่ติดลบ หรือ null');
    if (r.respondent_count !== null && r.eligible_count !== null && r.respondent_count > r.eligible_count) fail('จำนวนผู้ตอบเกินจำนวนผู้มีสิทธิ์ตอบ');
    if (r.avg_satisfaction_score !== null && (typeof r.avg_satisfaction_score !== 'number' || !Number.isFinite(r.avg_satisfaction_score) || r.avg_satisfaction_score < 1 || r.avg_satisfaction_score > 5 || r.respondent_count === 0)) fail('คะแนนต้องอยู่ระหว่าง 1–5 และมีผู้ตอบ');
  }
  if (all && rows.length > 1) fail('ห้ามเก็บ ALL รวมกับผลประเมินแถวอื่น');
}

/** A date means DAILY; an empty date means ALL. No type selector is needed. */
export function normalizeEvaluationInputs(value: unknown): EvaluationInput[] {
  if (!Array.isArray(value)) throw new EtlValidationError('ผลประเมินต้องเป็นรายการ');
  return value.map(raw => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new EtlValidationError('รูปแบบผลประเมินไม่ถูกต้อง');
    const date = raw.date === undefined || raw.date === '' ? null : raw.date;
    const type = date === null ? 'ALL' : 'DAILY';
    if (raw.evaluation_type !== undefined && raw.evaluation_type !== type) throw new EtlValidationError('ประเภทผลประเมินไม่ตรงกับวันที่');
    return { evaluation_type: type, date, respondent_count: raw.respondent_count === undefined ? null : raw.respondent_count,
      eligible_count: raw.eligible_count === undefined ? null : raw.eligible_count,
      avg_satisfaction_score: raw.avg_satisfaction_score === undefined ? null : raw.avg_satisfaction_score };
  });
}
