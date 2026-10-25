// Database Schema Type Interfaces for Mock Schema
import type { Project } from '@/lib/mockData';

export interface DimProject {
  project_key: number;
  project_code: string | null;
  project_name: string;
}

export interface DimActivity {
  activity_key: number;
  activity_code: string | null;
  activity_name: string;
  activity_type: string | null;
  start_date?: string | null;
  end_date?: string | null;
  etl_metadata?: Partial<Omit<Project, 'id'>> | null;
}

export interface DimDepartment {
  department_key: number;
  department_name: string;
}

export interface DimDate {
  date_key: number;
  full_date: string;
  day_of_month: number | null;
  month_name: string | null;
  quarter: number | null;
  year_be: number | null;
  year_ce: number | null;
  fiscal_year: string | null;
}

export interface DimTime {
  time_key: number;
  hour_24: number | null;
  minute: number | null;
  time_of_day: string | null;
}

export interface DimStrategy {
  strategy_key: number;
  strategy_type: string | null;
  strategy_name: string;
  detail?: string | null;
}

export interface DimSdg {
  sdg_key: number;
  sdg_name: string | null;
}

export interface FactActivity {
  fact_activity_id: number;
  date_key: number;
  time_key: number | null;
  activity_key: number;
  project_key: number | null;
  department_key: number | null;
  location_key: number | null;
  organizer_person_key: number | null;
  duration_hours: number | null;
}

export interface FactBudget {
  fact_budget_id: number;
  date_key: number;
  activity_key: number;
  budget_category_key: number | null;
  funding_key: number | null;
  approved_amount: number | null;
  actual_spent_amount: number | null;
}

export interface FactParticipant {
  fact_participant_id: number;
  date_key: number;
  activity_key: number;
  person_key: number | null;
  attendance_status: string | null;
}

export interface FactKpi {
  fact_kpi_id: number;
  date_key: number | null;
  activity_key: number | null;
  strategy_key: number | null;
  sdg_key: number | null;
  avg_satisfaction_score: number | null;
  target_participants: number | null;
  actual_participants: number | null;
}
