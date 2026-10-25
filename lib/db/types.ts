// Current DW contract, verified 2026-10-25.
export interface ActivityRow { activity_key: number; activity_code: string | null; activity_name: string | null; activity_type: string | null }
export interface DateRow { date_key: number; full_date: string | null; day_of_month: number | null; month_name: string | null; quarter: number | null; year_be: number | null; year_ce: number | null; fiscal_year: number | null }
export interface PersonRow { person_key: number; student_id: string | null; name: string | null; lastName: string | null; person_type: string | null }
export interface PolicyRow { strategy_key: number; strategy_type: string | null; strategy_name: string | null; detail: string | null }
export interface ActivityFactRow { fact_activity_summary_id: number; start_date_key: number | null; end_date_key: number | null; activity_key: number | null; target_participants: number | null; actual_participants: number | null; approved_amount: number | null; actual_spent_amount: number | null; duration_hours: number | null }
export interface ParticipantFactRow { fact_participant_id: number; date_key: number | null; activity_key: number | null; person_key: number | null; session_type: 'SPLIT_SESSION' | 'SINGLE_SESSION' | null; attendance_status: 'FULL_DAY' | 'MORNING_ONLY' | 'AFTERNOON_ONLY' | 'ABSENT' | null }
export interface ActivityPolicyRow { activity_key: number; strategy_key: number }
export interface KpiRow { eligible_count_source?: string; fact_kpi_id: number; activity_key: number; evaluation_type: 'ALL' | 'DAILY'; date_key: number | null; respondent_count: number | null; eligible_count: number | null; avg_satisfaction_score: number | null }
export interface ResponsibleRow { activity_key: number; person_key: number }
export interface WarehouseSnapshot { activities: ActivityRow[]; dates: DateRow[]; people: PersonRow[]; policies: PolicyRow[]; facts: ActivityFactRow[]; attendance: ParticipantFactRow[]; links: ActivityPolicyRow[]; kpis: KpiRow[]; responsible: ResponsibleRow[] }
