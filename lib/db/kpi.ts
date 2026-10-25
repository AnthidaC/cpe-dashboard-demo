import type { KpiRow, WarehouseSnapshot } from './types';

export interface EvaluationInput {
  evaluation_type: 'ALL' | 'DAILY';
  date: string | null;
  respondent_count: number | null;
  eligible_count: number | null;
  avg_satisfaction_score: number | null;
}

/** Never mix whole-project totals with daily observations or silently drop incomplete days. */
export function summarizeKpis(rows: KpiRow[]) {
  const issues: string[] = [];
  const keys = rows.map(r => r.evaluation_type === 'ALL' ? 'ALL' : String(r.date_key));
  if (rows.some(r => !['ALL', 'DAILY'].includes(r.evaluation_type) || (r.evaluation_type === 'DAILY' && r.date_key === null))) issues.push('Invalid evaluation scope');
  if (rows.some(r => r.evaluation_type === 'ALL') && rows.length > 1) issues.push('ALL and other evaluation rows overlap');
  if (new Set(keys).size !== keys.length) issues.push('Duplicate evaluation date');
  const invalidScope = issues.length > 0;
  const validCount = (v: number | null) => v === null || (Number.isSafeInteger(v) && v >= 0);
  const invalidRespondents = rows.some(r => !validCount(r.respondent_count));
  const invalidEligible = rows.some(r => !validCount(r.eligible_count)
    || (r.respondent_count !== null && r.eligible_count !== null && r.respondent_count > r.eligible_count));
  const invalidScore = rows.some(r => r.avg_satisfaction_score !== null && (!Number.isFinite(r.avg_satisfaction_score) || r.avg_satisfaction_score < 1 || r.avg_satisfaction_score > 5 || r.respondent_count === 0));
  if (invalidRespondents) issues.push('Invalid respondent count');
  if (invalidEligible) issues.push('Invalid evaluation denominator');
  if (invalidScore) issues.push('Invalid evaluation score');
  const respondentsAvailable = rows.length > 0 && rows.every(r => r.respondent_count !== null);
  const respondents = rows.reduce((n, r) => n + (r.respondent_count ?? 0), 0);
  const eligible = rows.reduce((n, r) => n + (r.eligible_count ?? 0), 0);
  const rateAvailable = respondentsAvailable && rows.every(r => r.eligible_count !== null) && eligible > 0;
  const scoreRows = rows.filter(r => r.avg_satisfaction_score !== null);
  const weighted = scoreRows.length > 0 && scoreRows.every(r => r.respondent_count !== null && r.respondent_count > 0);
  const score = weighted ? scoreRows.reduce((n, r) => n + r.avg_satisfaction_score! * r.respondent_count!, 0) / scoreRows.reduce((n, r) => n + r.respondent_count!, 0)
    : scoreRows.length === 1 && rows.length === 1 ? scoreRows[0].avg_satisfaction_score! : 0;
  if (scoreRows.length > 1 && !weighted) issues.push('Missing respondent counts for weighted score');
  const invalidRate = invalidScope || invalidRespondents || invalidEligible || !rateAvailable;
  return { respondents: invalidScope || invalidRespondents ? 0 : respondents, eligible: invalidScope || invalidEligible ? 0 : eligible,
    satisfaction: invalidScope || invalidRespondents || invalidScore ? 0 : score,
    evalRate: invalidRate ? 0 : respondents / eligible * 100,
    respondentsAvailable: !invalidScope && !invalidRespondents && respondentsAvailable, evalRateAvailable: !invalidRate, issues };
}

/** Choose a denominator without prompting the operator or changing stored source data. */
export function resolveEligibleCount(snapshot: WarehouseSnapshot, activityKey: number, dateKey: number | null) {
  const latest = new Map<string, WarehouseSnapshot['attendance'][number]>();
  for (const row of snapshot.attendance) {
    if (row.activity_key !== activityKey || row.person_key === null || row.date_key === null) continue;
    const key = `${row.date_key}:${row.person_key}`;
    if (!latest.has(key) || latest.get(key)!.fact_participant_id < row.fact_participant_id) latest.set(key, row);
  }
  const rows = Array.from(latest.values());
  const count = (items: typeof rows) => new Set(items.filter(r => ['FULL_DAY','MORNING_ONLY','AFTERNOON_ONLY'].includes(r.attendance_status ?? '')).map(r => r.person_key)).size;
  if (dateKey !== null) {
    const sameDay = rows.filter(r => r.date_key === dateKey);
    if (sameDay.length) return { count: count(sameDay), source: 'ATTENDANCE_DAY' };
  }
  const facts = snapshot.facts.filter(f => f.activity_key === activityKey);
  const summary = facts.length === 1 ? facts[0] : undefined;
  if (summary?.actual_participants !== null && summary?.actual_participants !== undefined) return { count: summary.actual_participants, source: 'ACTIVITY_TOTAL' };
  if (rows.length) {
    if (dateKey === null) return { count: count(rows), source: 'ATTENDANCE_TOTAL' };
    const dates = new Map(snapshot.dates.map(d => [d.date_key, d.full_date]));
    const first = [...rows].sort((a,b) => (dates.get(a.date_key!) ?? '').localeCompare(dates.get(b.date_key!) ?? ''))[0].date_key;
    return { count: count(rows.filter(r => r.date_key === first)), source: 'FIRST_ATTENDANCE_DAY' };
  }
  if (summary?.target_participants !== null && summary?.target_participants !== undefined) return { count: summary.target_participants, source: 'TARGET' };
  return { count: null, source: 'UNKNOWN' };
}

export function resolveKpis(snapshot: WarehouseSnapshot, rows = snapshot.kpis): KpiRow[] {
  return rows.map(row => {
    if (row.eligible_count !== null && row.eligible_count !== undefined) return { ...row, eligible_count_source: 'RECORDED' };
    const chosen = resolveEligibleCount(snapshot, row.activity_key, row.evaluation_type === 'DAILY' ? row.date_key : null);
    return { ...row, eligible_count: chosen.count, eligible_count_source: chosen.source };
  });
}
