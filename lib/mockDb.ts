// lib/mockDb.ts — Relational Mock Database Tables matching Supabase schema
// Loaded with cleaned, true records from warehouse.xlsx

import type {
  DimProject,
  DimActivity,
  DimDepartment,
  DimDate,
  DimTime,
  DimStrategy,
  DimSdg,
  FactActivity,
  FactBudget,
  FactParticipant,
  FactKpi,
} from './supabase';

// ─── 1. Dimension Tables ──────────────────────────────────────────────────────

export const mockDimProject: DimProject[] = [
  { project_key: 1, project_code: null, project_name: 'โครงการอบรมความมั่นคงปลอดภัยไซเบอร์เชิงปฏิบัติการ' },
  { project_key: 2, project_code: '268990000002', project_name: 'โครงการถ่ายทอดองค์ความรู้และนวัตกรรมสู่สังคม' },
  { project_key: 3, project_code: null, project_name: 'โครงการปฐมนิเทศและเตรียมความพร้อมนิสิตใหม่' },
  { project_key: 4, project_code: '268990000004', project_name: 'โครงการพัฒนาศักยภาพวิชาการสู่สากล' },
  { project_key: 5, project_code: '268990000005', project_name: 'โครงการค่ายนวัตกรรมหุ่นยนต์และปัญญาประดิษฐ์' },
  { project_key: 6, project_code: null, project_name: 'โครงการเสริมสร้างการเรียนรู้และให้คำปรึกษาวิชาการ' },
  { project_key: 7, project_code: null, project_name: 'โครงการเสริมสร้างทักษะวิชาชีพและสมรรถนะนิสิต' },
  { project_key: 8, project_code: null, project_name: 'โครงการสัมมนาเชิงปฏิบัติการเพื่อพัฒนาหลักสูตร' },
];

export const mockDimActivity: DimActivity[] = [
  { activity_key: 1, activity_code: null, activity_name: 'โครงการอบรมความมั่นคงปลอดภัยไซเบอร์เชิงปฏิบัติการ', activity_type: 'กิจกรรมวิชาการที่ส่งเสริมคุณลักษณะบัณฑิตที่พึงประสงค์' },
  { activity_key: 2, activity_code: '268990000002', activity_name: 'โครงการถ่ายทอดองค์ความรู้และนวัตกรรมสู่สังคม', activity_type: 'กิจกรรมวิชาการที่ส่งเสริมคุณลักษณะบัณฑิตที่พึงประสงค์' },
  { activity_key: 3, activity_code: null, activity_name: 'โครงการปฐมนิเทศและเตรียมความพร้อมนิสิตใหม่', activity_type: 'กิจกรรมวิชาการที่ส่งเสริมคุณลักษณะบัณฑิตที่พึงประสงค์' },
  { activity_key: 4, activity_code: '268990000004', activity_name: 'โครงการพัฒนาศักยภาพวิชาการสู่สากล', activity_type: 'กิจกรรมวิชาการที่ส่งเสริมคุณลักษณะบัณฑิตที่พึงประสงค์' },
  { activity_key: 5, activity_code: '268990000005', activity_name: 'โครงการค่ายนวัตกรรมหุ่นยนต์และปัญญาประดิษฐ์', activity_type: 'กิจกรรมวิชาการที่ส่งเสริมคุณลักษณะบัณฑิตที่พึงประสงค์' },
  { activity_key: 6, activity_code: null, activity_name: 'โครงการเสริมสร้างการเรียนรู้และให้คำปรึกษาวิชาการ', activity_type: 'กิจกรรมวิชาการที่ส่งเสริมคุณลักษณะบัณฑิตที่พึงประสงค์' },
  { activity_key: 7, activity_code: null, activity_name: 'โครงการเสริมสร้างทักษะวิชาชีพและสมรรถนะนิสิต', activity_type: 'กิจกรรมวิชาการที่ส่งเสริมคุณลักษณะบัณฑิตที่พึงประสงค์' },
  { activity_key: 8, activity_code: null, activity_name: 'โครงการสัมมนาเชิงปฏิบัติการเพื่อพัฒนาหลักสูตร', activity_type: 'พัฒนาหลักสูตร' },
];

export const mockDimDepartment: DimDepartment[] = [
  { department_key: 1, department_name: 'ภาควิชาวิศวกรรมคอมพิวเตอร์' },
];

export const mockDimDate: DimDate[] = [
  { date_key: 20250307, full_date: '2025-03-07', day_of_month: 7, month_name: 'มีนาคม', quarter: 2, year_be: 2568, year_ce: 2025, fiscal_year: '2568' },
  { date_key: 20251205, full_date: '2025-12-05', day_of_month: 5, month_name: 'ธันวาคม', quarter: 1, year_be: 2568, year_ce: 2025, fiscal_year: '2569' },
  { date_key: 20250615, full_date: '2025-06-15', day_of_month: 15, month_name: 'มิถุนายน', quarter: 3, year_be: 2568, year_ce: 2025, fiscal_year: '2568' },
  { date_key: 20251202, full_date: '2025-12-02', day_of_month: 2, month_name: 'ธันวาคม', quarter: 1, year_be: 2568, year_ce: 2025, fiscal_year: '2569' },
  { date_key: 20251104, full_date: '2025-11-04', day_of_month: 4, month_name: 'พฤศจิกายน', quarter: 1, year_be: 2568, year_ce: 2025, fiscal_year: '2569' },
  { date_key: 20260311, full_date: '2026-03-11', day_of_month: 11, month_name: 'มีนาคม', quarter: 2, year_be: 2569, year_ce: 2026, fiscal_year: '2569' },
  { date_key: 20260517, full_date: '2026-05-17', day_of_month: 17, month_name: 'พฤษภาคม', quarter: 3, year_be: 2569, year_ce: 2026, fiscal_year: '2569' },
];

export const mockDimTime: DimTime[] = [
  { time_key: 1, hour_24: 9, minute: 0, time_of_day: 'เช้า' },
];

export const mockDimStrategy: DimStrategy[] = [
  { strategy_key: 1, strategy_type: 'คณะ', strategy_name: 'ยุทธศาสตร์ที่ 1: วิชาการและวิจัยเพื่อความเป็นเลิศ' },
  { strategy_key: 4, strategy_type: 'PLO', strategy_name: 'PLO 1', detail: 'สามารถประยุกต์ใช้หลักการและความรู้ทั้งในเชิงทฤษฎีและปฏิบัติ ในการวิเคราะห์และออกแบบเพื่อแก้ปัญหาทางวิศวกรรมคอมพิวเตอร์ได้' },
  { strategy_key: 5, strategy_type: 'PLO', strategy_name: 'PLO 2', detail: 'สามารถค้นคว้า เรียนรู้ เครื่องมือและเทคโนโลยีคอมพิวเตอร์ด้วยตนเองเพื่อนำมาใช้ในแก้ปัญหาทางวิศวกรรมคอมพิวเตอร์หรือสร้างนวัตกรรมได้' },
  { strategy_key: 6, strategy_type: 'PLO', strategy_name: 'PLO 3', detail: 'สามารถสื่อสารผลงาน องค์ความรู้และความเข้าใจเชิงเทคนิคและเชิงทั่วไปได้' },
  { strategy_key: 7, strategy_type: 'PLO', strategy_name: 'PLO 4', detail: 'มีความพร้อมในการทำงานในสถานประกอบการ สามารถปฏิบัติงานอย่างมืออาชีพ' },
  { strategy_key: 8, strategy_type: 'Soft Skill', strategy_name: 'การคิดแก้ปัญหา' },
  { strategy_key: 9, strategy_type: 'Soft Skill', strategy_name: 'การบริหารตัวเอง' },
  { strategy_key: 10, strategy_type: 'Soft Skill', strategy_name: 'การทำงานเป็นทีม' },
  { strategy_key: 11, strategy_type: 'Soft Skill', strategy_name: 'ความคิดสร้างสรรค์' },
  { strategy_key: 12, strategy_type: 'Soft Skill', strategy_name: 'การสื่อสาร' },
];

export const mockDimSdg: DimSdg[] = [
  { sdg_key: 4, sdg_name: 'Quality Education' },
  { sdg_key: 8, sdg_name: 'Decent Work and Economic Growth' },
  { sdg_key: 10, sdg_name: 'Reduced Inequalities' },
  { sdg_key: 17, sdg_name: 'Partnerships for the Goals' },
];

// ─── 2. Fact Tables ───────────────────────────────────────────────────────────

export const mockFactActivity: FactActivity[] = [
  { fact_activity_id: 1, date_key: 20250307, time_key: 1, activity_key: 1, project_key: 1, department_key: 1, location_key: null, organizer_person_key: null, duration_hours: 12 },
  { fact_activity_id: 2, date_key: 20251205, time_key: 1, activity_key: 2, project_key: 2, department_key: 1, location_key: null, organizer_person_key: null, duration_hours: 16 },
  { fact_activity_id: 3, date_key: 20250615, time_key: 1, activity_key: 3, project_key: 3, department_key: 1, location_key: null, organizer_person_key: null, duration_hours: 12 },
  { fact_activity_id: 4, date_key: 20251202, time_key: 1, activity_key: 4, project_key: 4, department_key: 1, location_key: null, organizer_person_key: null, duration_hours: 18 },
  { fact_activity_id: 5, date_key: 20251104, time_key: 1, activity_key: 5, project_key: 5, department_key: 1, location_key: null, organizer_person_key: null, duration_hours: 19.5 },
  { fact_activity_id: 6, date_key: 20260311, time_key: 1, activity_key: 6, project_key: 6, department_key: 1, location_key: null, organizer_person_key: null, duration_hours: 6 },
  { fact_activity_id: 7, date_key: 20260311, time_key: 1, activity_key: 7, project_key: 7, department_key: 1, location_key: null, organizer_person_key: null, duration_hours: 11 },
  { fact_activity_id: 8, date_key: 20260517, time_key: 1, activity_key: 8, project_key: 8, department_key: 1, location_key: null, organizer_person_key: null, duration_hours: 8 },
];

export const mockFactBudget: FactBudget[] = [
  { fact_budget_id: 1, date_key: 20250307, activity_key: 1, budget_category_key: null, funding_key: null, approved_amount: 35000, actual_spent_amount: 31500 },
  { fact_budget_id: 2, date_key: 20251205, activity_key: 2, budget_category_key: null, funding_key: null, approved_amount: 25000, actual_spent_amount: 22800 },
  { fact_budget_id: 3, date_key: 20250615, activity_key: 3, budget_category_key: null, funding_key: null, approved_amount: 18000, actual_spent_amount: 16400 },
  { fact_budget_id: 4, date_key: 20251202, activity_key: 4, budget_category_key: null, funding_key: null, approved_amount: 50000, actual_spent_amount: 46200 },
  { fact_budget_id: 5, date_key: 20251104, activity_key: 5, budget_category_key: null, funding_key: null, approved_amount: 20000, actual_spent_amount: 17500 },
  { fact_budget_id: 6, date_key: 20260311, activity_key: 6, budget_category_key: null, funding_key: null, approved_amount: 18000, actual_spent_amount: 15300 },
  { fact_budget_id: 7, date_key: 20260311, activity_key: 7, budget_category_key: null, funding_key: null, approved_amount: 28000, actual_spent_amount: 23800 },
  { fact_budget_id: 8, date_key: 20260517, activity_key: 8, budget_category_key: null, funding_key: null, approved_amount: 75000, actual_spent_amount: 69153.57 },
];

export const mockFactParticipant: FactParticipant[] = [];

export const mockFactKpi: FactKpi[] = [
  { fact_kpi_id: 1, date_key: 20250307, activity_key: 1, strategy_key: 1, sdg_key: 8, avg_satisfaction_score: 4.16, target_participants: 60, actual_participants: 51 },
  { fact_kpi_id: 2, date_key: 20251205, activity_key: 2, strategy_key: 1, sdg_key: null, avg_satisfaction_score: 4.40, target_participants: 100, actual_participants: 89 },
  { fact_kpi_id: 3, date_key: 20250615, activity_key: 3, strategy_key: 1, sdg_key: 8, avg_satisfaction_score: 4.71, target_participants: 190, actual_participants: 171 },
  { fact_kpi_id: 4, date_key: 20251202, activity_key: 4, strategy_key: 1, sdg_key: 4, avg_satisfaction_score: 4.20, target_participants: 34, actual_participants: 45 },
  { fact_kpi_id: 5, date_key: 20251104, activity_key: 5, strategy_key: 1, sdg_key: 8, avg_satisfaction_score: 4.64, target_participants: 5, actual_participants: 5 },
  { fact_kpi_id: 6, date_key: 20260311, activity_key: 6, strategy_key: 1, sdg_key: 8, avg_satisfaction_score: 4.38, target_participants: 166, actual_participants: 125 },
  { fact_kpi_id: 7, date_key: 20260311, activity_key: 7, strategy_key: 1, sdg_key: 8, avg_satisfaction_score: 4.53, target_participants: 130, actual_participants: 55 },
  { fact_kpi_id: 8, date_key: 20260517, activity_key: 8, strategy_key: null, sdg_key: null, avg_satisfaction_score: null, target_participants: 5, actual_participants: 5 },
];
