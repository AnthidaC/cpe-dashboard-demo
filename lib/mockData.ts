// lib/mockData.ts — Database-ready Architecture with Pure Calculation Engine
// Cleaned and structured using real data from warehouse.xlsx

export type ProjectType =
  | 'กิจกรรมวิชาการที่ส่งเสริมคุณลักษณะบัณฑิตที่พึงประสงค์'
  | 'กิจกรรมเสริมสร้างคุณธรรมและจริยธรรม'
  | 'กิจกรรมกีฬาหรือส่งเสริมสุขภาพ'
  | 'กิจกรรมบำเพ็ญประโยชน์'
  | 'กิจกรรมเสริมสร้างศิลปะและวัฒนธรรม'
  | 'กิจกรรมส่งเสริมการรักษาสิ่งแวดล้อม'
  | 'พัฒนาหลักสูตร';
export type KUIdentity = 'I' | 'D' | 'K' | 'U';
export type PLONumber = 1 | 2 | 3 | 4;
export type SoftSkillArea =
  | 'การคิดแก้ปัญหา'
  | 'การบริหารตัวเอง'
  | 'การทำงานเป็นทีม'
  | 'ความคิดสร้างสรรค์'
  | 'การสื่อสาร'
  | 'การสื่อสาร & แก้ปัญหา'
  | 'เทคโนโลยี';

export interface Project {
  responsibleNames?: string[];
  evalRateAvailable?: boolean;
  evaluationEligible?: number;
  evaluationRows?: import('./db/types').KpiRow[];
  dataIssues?: string[];
  missingMetrics?: import('./projectAvailability').ProjectMetric[];
  dataSource?: 'live' | 'mock';
  id: number;
  code: string;
  name: string;
  lecturer: string;
  type: ProjectType;
  budget: number;          // งบประมาณที่ได้รับอนุมัติ (บาท)
  actual: number;          // งบประมาณที่ใช้จริง (บาท)
  participants: number;    // จำนวนผู้เข้าร่วมจริง (คน)
  target: number;          // เป้าหมายจำนวนผู้เข้าร่วม (คน)
  satisfaction: number;    // คะแนนความพึงพอใจ (1.00 - 5.00) (0.00 if N/A)
  hours: number;           // จำนวนชั่วโมงจัดกิจกรรม
  evalRate: number;        // อัตราการตอบแบบประเมิน (%)
  respondents: number;     // จำนวนผู้ทำแบบประเมิน (คน)
  sdg: boolean;            // ตอบโจทย์ SDGs หรือไม่
  sdgList: number[];       // รายการเป้าหมาย SDGs
  ku: KUIdentity;          // อัตลักษณ์ KU หลัก (เพื่อความเข้ากันได้)
  kuList: KUIdentity[];    // อัตลักษณ์ KU ทั้งหมดที่สอดคล้อง
  plo: PLONumber[];        // PLO ที่สนับสนุน (1-4)
  softSkills: number[];    // Soft skills ที่สนับสนุน (1-4)
  strategy3: boolean;      // สอดคล้องกับกลยุทธ์ที่ 3 หรือไม่ (เพื่อความเข้ากันได้)
  strategySubs: number[];  // รายการกลยุทธ์ย่อย (1-3)
  tqf: number[];           // TQF ที่สนับสนุน (1-4)
  studentPlans: number[];  // แผนกิจการนิสิตที่สอดคล้อง (1-5)
  academicYear?: number;
  semester?: 't1' | 't2' | 'summer';
  startDate: string;
  endDate: string;
  remarks: string;
  softSkill?: SoftSkillArea; // เพื่อความเข้ากันได้
}

// ─── Cleaned Project DB Seed (derived from warehouse.xlsx) ─────────────────
// Next bundles API routes separately. Share temporary imports within the server process.
const projectStore = globalThis as typeof globalThis & { __whEtlProjects?: Project[] };
export const mockProjectsDB: Project[] = projectStore.__whEtlProjects ?? [
  {
    "id": 1,
    "code": "268990010101",
    "name": "โครงการปฐมนิเทศและเตรียมความพร้อมนิสิตใหม่",
    "lecturer": "ผศ.ดร.กิตติพงษ์ เจริญศิลป์",
    "type": "กิจกรรมวิชาการที่ส่งเสริมคุณลักษณะบัณฑิตที่พึงประสงค์",
    "budget": 25000,
    "actual": 23800,
    "participants": 120,
    "target": 125,
    "satisfaction": 4.75,
    "hours": 12,
    "respondents": 114,
    "evalRate": 95,
    "sdg": true,
    "sdgList": [
      4,
      8
    ],
    "ku": "I",
    "kuList": [
      "I",
      "D",
      "U"
    ],
    "plo": [
      1,
      2
    ],
    "softSkills": [
      1,
      2
    ],
    "strategy3": true,
    "strategySubs": [
      1,
      3
    ],
    "tqf": [
      1,
      2,
      4
    ],
    "studentPlans": [
      1,
      4
    ],
    "startDate": "2025-06-16",
    "endDate": "2025-06-17",
    "remarks": "",
    "academicYear": 2568,
    "semester": "t1",
    "softSkill": "การบริหารตัวเอง"
  },
  {
    "id": 2,
    "code": "268990010102",
    "name": "โครงการส่งเสริมวัฒนธรรมและกิจกรรมบำเพ็ญประโยชน์",
    "lecturer": "รศ.ดร.สุรชัย วงศ์สุวรรณ",
    "type": "กิจกรรมเสริมสร้างศิลปะและวัฒนธรรม",
    "budget": 20000,
    "actual": 18500,
    "participants": 85,
    "target": 80,
    "satisfaction": 4.8,
    "hours": 8,
    "respondents": 78,
    "evalRate": 91.8,
    "sdg": true,
    "sdgList": [
      11
    ],
    "ku": "U",
    "kuList": [
      "U",
      "I"
    ],
    "plo": [
      3,
      4
    ],
    "softSkills": [
      2,
      3
    ],
    "strategy3": true,
    "strategySubs": [
      3
    ],
    "tqf": [
      1,
      3
    ],
    "studentPlans": [
      1,
      4
    ],
    "startDate": "2025-07-03",
    "endDate": "2025-07-03",
    "remarks": "",
    "academicYear": 2568,
    "semester": "t1",
    "softSkill": "การทำงานเป็นทีม"
  },
  {
    "id": 3,
    "code": "268990010103",
    "name": "โครงการเสริมสร้างทักษะและสมรรถนะวิชาชีพ",
    "lecturer": "ผศ.ดร.วิภาดา พูนทรัพย์",
    "type": "กิจกรรมวิชาการที่ส่งเสริมคุณลักษณะบัณฑิตที่พึงประสงค์",
    "budget": 35000,
    "actual": 32400,
    "participants": 60,
    "target": 65,
    "satisfaction": 4.62,
    "hours": 16,
    "respondents": 56,
    "evalRate": 93.3,
    "sdg": true,
    "sdgList": [
      4,
      9
    ],
    "ku": "K",
    "kuList": [
      "K",
      "I",
      "D"
    ],
    "plo": [
      1,
      2,
      4
    ],
    "softSkills": [
      1,
      4
    ],
    "strategy3": true,
    "strategySubs": [
      1,
      2
    ],
    "tqf": [
      2,
      3,
      4
    ],
    "studentPlans": [
      2,
      3
    ],
    "startDate": "2025-07-19",
    "endDate": "2025-07-20",
    "remarks": "",
    "academicYear": 2568,
    "semester": "t1",
    "softSkill": "เทคโนโลยี"
  },
  {
    "id": 4,
    "code": "268990010104",
    "name": "โครงการพัฒนาศักยภาพนิสิตสู่ความเป็นเลิศระดับสากล",
    "lecturer": "อ.ดร.สมชาย ปัญญาดี",
    "type": "กิจกรรมวิชาการที่ส่งเสริมคุณลักษณะบัณฑิตที่พึงประสงค์",
    "budget": 45000,
    "actual": 42100,
    "participants": 52,
    "target": 50,
    "satisfaction": 4.58,
    "hours": 18,
    "respondents": 48,
    "evalRate": 92.3,
    "sdg": true,
    "sdgList": [
      4,
      8,
      17
    ],
    "ku": "D",
    "kuList": [
      "D",
      "K",
      "U"
    ],
    "plo": [
      2,
      3,
      4
    ],
    "softSkills": [
      1,
      3,
      4
    ],
    "strategy3": true,
    "strategySubs": [
      1,
      3
    ],
    "tqf": [
      2,
      3,
      4
    ],
    "studentPlans": [
      2,
      5
    ],
    "startDate": "2025-07-25",
    "endDate": "2025-07-27",
    "remarks": "",
    "academicYear": 2568,
    "semester": "t1",
    "softSkill": "การสื่อสาร & แก้ปัญหา"
  },
  {
    "id": 5,
    "code": "268990010105",
    "name": "โครงการกีฬาสานสัมพันธ์สร้างเสริมสุขภาพ",
    "lecturer": "อ.ศิริพร สวัสดิผล",
    "type": "กิจกรรมกีฬาหรือส่งเสริมสุขภาพ",
    "budget": 50000,
    "actual": 48900,
    "participants": 220,
    "target": 200,
    "satisfaction": 4.65,
    "hours": 12,
    "respondents": 195,
    "evalRate": 88.6,
    "sdg": true,
    "sdgList": [
      3,
      8
    ],
    "ku": "I",
    "kuList": [
      "I",
      "U"
    ],
    "plo": [
      3,
      4
    ],
    "softSkills": [
      2,
      3
    ],
    "strategy3": true,
    "strategySubs": [
      3
    ],
    "tqf": [
      1,
      3
    ],
    "studentPlans": [
      1,
      4
    ],
    "startDate": "2025-08-30",
    "endDate": "2025-08-31",
    "remarks": "",
    "academicYear": 2568,
    "semester": "t1",
    "softSkill": "การทำงานเป็นทีม"
  },
  {
    "id": 6,
    "code": "268990010106",
    "name": "โครงการติดตามและส่งเสริมสัมฤทธิผลทางการเรียน",
    "lecturer": "ผศ.ดร.กิตติพงษ์ เจริญศิลป์",
    "type": "กิจกรรมวิชาการที่ส่งเสริมคุณลักษณะบัณฑิตที่พึงประสงค์",
    "budget": 15000,
    "actual": 12500,
    "participants": 235,
    "target": 250,
    "satisfaction": 4.35,
    "hours": 6,
    "respondents": 210,
    "evalRate": 89.4,
    "sdg": true,
    "sdgList": [
      4
    ],
    "ku": "D",
    "kuList": [
      "D",
      "I"
    ],
    "plo": [
      1,
      2
    ],
    "softSkills": [
      1,
      2
    ],
    "strategy3": true,
    "strategySubs": [
      1
    ],
    "tqf": [
      2,
      4
    ],
    "studentPlans": [
      1,
      2
    ],
    "startDate": "2025-09-18",
    "endDate": "2025-09-19",
    "remarks": "",
    "academicYear": 2568,
    "semester": "t1",
    "softSkill": "การบริหารตัวเอง"
  },
  {
    "id": 7,
    "code": "268990010107",
    "name": "โครงการค่ายนวัตกรรมหุ่นยนต์และปัญญาประดิษฐ์",
    "lecturer": "อ.ปกรณ์ มุ่งมั่น",
    "type": "กิจกรรมวิชาการที่ส่งเสริมคุณลักษณะบัณฑิตที่พึงประสงค์",
    "budget": 40000,
    "actual": 37800,
    "participants": 45,
    "target": 40,
    "satisfaction": 4.88,
    "hours": 24,
    "respondents": 43,
    "evalRate": 95.6,
    "sdg": true,
    "sdgList": [
      4,
      8,
      9
    ],
    "ku": "K",
    "kuList": [
      "K",
      "D",
      "U"
    ],
    "plo": [
      1,
      2,
      4
    ],
    "softSkills": [
      1,
      3,
      4
    ],
    "strategy3": true,
    "strategySubs": [
      1,
      2
    ],
    "tqf": [
      2,
      3,
      4
    ],
    "studentPlans": [
      2,
      3,
      5
    ],
    "startDate": "2025-10-15",
    "endDate": "2025-10-17",
    "remarks": "",
    "academicYear": 2568,
    "semester": "t1",
    "softSkill": "การคิดแก้ปัญหา"
  },
  {
    "id": 8,
    "code": "268990010108",
    "name": "โครงการจิตอาสาพัฒนาและบริการวิชาการสู่ชุมชน",
    "lecturer": "อ.นพดล เกียรติสกุล",
    "type": "กิจกรรมบำเพ็ญประโยชน์",
    "budget": 25000,
    "actual": 23600,
    "participants": 62,
    "target": 60,
    "satisfaction": 4.7,
    "hours": 16,
    "respondents": 58,
    "evalRate": 93.5,
    "sdg": true,
    "sdgList": [
      4,
      10,
      11
    ],
    "ku": "U",
    "kuList": [
      "U",
      "I",
      "D"
    ],
    "plo": [
      3,
      4
    ],
    "softSkills": [
      2,
      3
    ],
    "strategy3": true,
    "strategySubs": [
      3
    ],
    "tqf": [
      1,
      3
    ],
    "studentPlans": [
      1,
      4
    ],
    "startDate": "2025-11-12",
    "endDate": "2025-11-13",
    "remarks": "",
    "academicYear": 2568,
    "semester": "t2",
    "softSkill": "การทำงานเป็นทีม"
  },
  {
    "id": 9,
    "code": "268990010109",
    "name": "โครงการส่งเสริมคุณธรรมจริยธรรมและจรรยาบรรณวิชาชีพ",
    "lecturer": "รศ.ดร.สุรชัย วงศ์สุวรรณ",
    "type": "กิจกรรมเสริมสร้างคุณธรรมและจริยธรรม",
    "budget": 18000,
    "actual": 16200,
    "participants": 95,
    "target": 100,
    "satisfaction": 4.55,
    "hours": 8,
    "respondents": 89,
    "evalRate": 93.7,
    "sdg": true,
    "sdgList": [
      4,
      16
    ],
    "ku": "I",
    "kuList": [
      "I",
      "D"
    ],
    "plo": [
      1,
      3
    ],
    "softSkills": [
      2,
      3
    ],
    "strategy3": true,
    "strategySubs": [
      3
    ],
    "tqf": [
      1,
      4
    ],
    "studentPlans": [
      1,
      4
    ],
    "startDate": "2025-11-28",
    "endDate": "2025-11-28",
    "remarks": "",
    "academicYear": 2568,
    "semester": "t2",
    "softSkill": "การบริหารตัวเอง"
  },
  {
    "id": 10,
    "code": "268990010110",
    "name": "โครงการส่งเสริมศักยภาพและแลกเปลี่ยนทางวิชาการสู่สากล",
    "lecturer": "อ.ดร.สมชาย ปัญญาดี",
    "type": "กิจกรรมวิชาการที่ส่งเสริมคุณลักษณะบัณฑิตที่พึงประสงค์",
    "budget": 50000,
    "actual": 46500,
    "participants": 40,
    "target": 35,
    "satisfaction": 4.52,
    "hours": 20,
    "respondents": 37,
    "evalRate": 92.5,
    "sdg": true,
    "sdgList": [
      4,
      8,
      17
    ],
    "ku": "D",
    "kuList": [
      "D",
      "K"
    ],
    "plo": [
      2,
      4
    ],
    "softSkills": [
      1,
      3,
      4
    ],
    "strategy3": true,
    "strategySubs": [
      1,
      3
    ],
    "tqf": [
      2,
      3,
      4
    ],
    "studentPlans": [
      2,
      5
    ],
    "startDate": "2025-12-02",
    "endDate": "2025-12-05",
    "remarks": "",
    "academicYear": 2568,
    "semester": "t2",
    "softSkill": "การสื่อสาร"
  },
  {
    "id": 11,
    "code": "268990010111",
    "name": "โครงการถ่ายทอดองค์ความรู้และนวัตกรรมสู่สังคม",
    "lecturer": "ผศ.ดร.กิตติพงษ์ เจริญศิลป์",
    "type": "กิจกรรมบำเพ็ญประโยชน์",
    "budget": 28000,
    "actual": 26000,
    "participants": 75,
    "target": 70,
    "satisfaction": 4.6,
    "hours": 14,
    "respondents": 70,
    "evalRate": 93.3,
    "sdg": true,
    "sdgList": [
      4,
      8,
      10
    ],
    "ku": "D",
    "kuList": [
      "D",
      "K",
      "U"
    ],
    "plo": [
      2,
      3,
      4
    ],
    "softSkills": [
      1,
      2,
      3
    ],
    "strategy3": true,
    "strategySubs": [
      2,
      3
    ],
    "tqf": [
      1,
      2,
      3
    ],
    "studentPlans": [
      1,
      3,
      4
    ],
    "startDate": "2025-12-18",
    "endDate": "2025-12-19",
    "remarks": "",
    "academicYear": 2568,
    "semester": "t2",
    "softSkill": "การทำงานเป็นทีม"
  },
  {
    "id": 12,
    "code": "268990010112",
    "name": "โครงการนวัตกรรมสีเขียวและเทคโนโลยีรักษาสิ่งแวดล้อม",
    "lecturer": "อ.ศิริพร สวัสดิผล",
    "type": "กิจกรรมส่งเสริมการรักษาสิ่งแวดล้อม",
    "budget": 22000,
    "actual": 19800,
    "participants": 48,
    "target": 50,
    "satisfaction": 4.45,
    "hours": 10,
    "respondents": 44,
    "evalRate": 91.7,
    "sdg": true,
    "sdgList": [
      7,
      12,
      13
    ],
    "ku": "U",
    "kuList": [
      "U",
      "D"
    ],
    "plo": [
      3,
      4
    ],
    "softSkills": [
      1,
      3
    ],
    "strategy3": true,
    "strategySubs": [
      2,
      3
    ],
    "tqf": [
      1,
      3
    ],
    "studentPlans": [
      1,
      3
    ],
    "startDate": "2026-01-20",
    "endDate": "2026-01-21",
    "remarks": "",
    "academicYear": 2568,
    "semester": "t2",
    "softSkill": "ความคิดสร้างสรรค์"
  },
  {
    "id": 13,
    "code": "268990010113",
    "name": "โครงการอาจารย์ที่ปรึกษาเพื่อการเรียนรู้และวางแผนชีวิต",
    "lecturer": "ผศ.ดร.กิตติพงษ์ เจริญศิลป์",
    "type": "กิจกรรมวิชาการที่ส่งเสริมคุณลักษณะบัณฑิตที่พึงประสงค์",
    "budget": 15000,
    "actual": 12800,
    "participants": 145,
    "target": 150,
    "satisfaction": 4.68,
    "hours": 8,
    "respondents": 136,
    "evalRate": 93.8,
    "sdg": true,
    "sdgList": [
      4,
      8
    ],
    "ku": "D",
    "kuList": [
      "D",
      "I"
    ],
    "plo": [
      1,
      4
    ],
    "softSkills": [
      2,
      3
    ],
    "strategy3": true,
    "strategySubs": [
      1,
      3
    ],
    "tqf": [
      1,
      4
    ],
    "studentPlans": [
      1,
      4
    ],
    "startDate": "2026-03-11",
    "endDate": "2026-03-12",
    "remarks": "",
    "academicYear": 2568,
    "semester": "t2",
    "softSkill": "การบริหารตัวเอง"
  },
  {
    "id": 14,
    "code": "268990010114",
    "name": "โครงการปัจฉิมนิเทศและเตรียมความพร้อมสู่การทำงาน",
    "lecturer": "ผศ.ดร.วิภาดา พูนทรัพย์",
    "type": "กิจกรรมวิชาการที่ส่งเสริมคุณลักษณะบัณฑิตที่พึงประสงค์",
    "budget": 30000,
    "actual": 27900,
    "participants": 102,
    "target": 100,
    "satisfaction": 4.82,
    "hours": 12,
    "respondents": 96,
    "evalRate": 94.1,
    "sdg": true,
    "sdgList": [
      4,
      8,
      9
    ],
    "ku": "I",
    "kuList": [
      "I",
      "D",
      "K",
      "U"
    ],
    "plo": [
      1,
      2,
      3,
      4
    ],
    "softSkills": [
      1,
      2,
      3,
      4
    ],
    "strategy3": true,
    "strategySubs": [
      1,
      2,
      3
    ],
    "tqf": [
      1,
      2,
      3,
      4
    ],
    "studentPlans": [
      1,
      2,
      4,
      5
    ],
    "startDate": "2026-04-08",
    "endDate": "2026-04-09",
    "remarks": "",
    "academicYear": 2568,
    "semester": "summer",
    "softSkill": "การสื่อสาร & แก้ปัญหา"
  },
  {
    "id": 15,
    "code": "267990010101",
    "name": "โครงการปฐมนิเทศและเตรียมความพร้อมนิสิตใหม่ (ปี 2567)",
    "lecturer": "ผศ.ดร.กิตติพงษ์ เจริญศิลป์",
    "type": "กิจกรรมวิชาการที่ส่งเสริมคุณลักษณะบัณฑิตที่พึงประสงค์",
    "budget": 22000,
    "actual": 21000,
    "participants": 110,
    "target": 115,
    "satisfaction": 4.6,
    "hours": 12,
    "respondents": 102,
    "evalRate": 92.7,
    "sdg": true,
    "sdgList": [
      4,
      8
    ],
    "ku": "I",
    "kuList": [
      "I",
      "D"
    ],
    "plo": [
      1,
      2
    ],
    "softSkills": [
      1,
      2
    ],
    "strategy3": true,
    "strategySubs": [
      1,
      3
    ],
    "tqf": [
      1,
      2,
      4
    ],
    "studentPlans": [
      1,
      4
    ],
    "startDate": "2024-06-17",
    "endDate": "2024-06-18",
    "remarks": "",
    "academicYear": 2567,
    "semester": "t1",
    "softSkill": "การบริหารตัวเอง"
  },
  {
    "id": 16,
    "code": "267990010102",
    "name": "โครงการส่งเสริมวัฒนธรรมและกิจกรรมบำเพ็ญประโยชน์ (ปี 2567)",
    "lecturer": "รศ.ดร.สุรชัย วงศ์สุวรรณ",
    "type": "กิจกรรมเสริมสร้างศิลปะและวัฒนธรรม",
    "budget": 18000,
    "actual": 16500,
    "participants": 75,
    "target": 70,
    "satisfaction": 4.7,
    "hours": 8,
    "respondents": 68,
    "evalRate": 90.7,
    "sdg": true,
    "sdgList": [
      11
    ],
    "ku": "U",
    "kuList": [
      "U",
      "I"
    ],
    "plo": [
      3,
      4
    ],
    "softSkills": [
      2,
      3
    ],
    "strategy3": true,
    "strategySubs": [
      3
    ],
    "tqf": [
      1,
      3
    ],
    "studentPlans": [
      1,
      4
    ],
    "startDate": "2024-07-04",
    "endDate": "2024-07-04",
    "remarks": "",
    "academicYear": 2567,
    "semester": "t1",
    "softSkill": "การทำงานเป็นทีม"
  },
  {
    "id": 17,
    "code": "267990010103",
    "name": "โครงการกีฬาสานสัมพันธ์สร้างเสริมสุขภาพ (ปี 2567)",
    "lecturer": "อ.ศิริพร สวัสดิผล",
    "type": "กิจกรรมกีฬาหรือส่งเสริมสุขภาพ",
    "budget": 45000,
    "actual": 43500,
    "participants": 190,
    "target": 180,
    "satisfaction": 4.58,
    "hours": 12,
    "respondents": 170,
    "evalRate": 89.5,
    "sdg": true,
    "sdgList": [
      3,
      8
    ],
    "ku": "I",
    "kuList": [
      "I",
      "U"
    ],
    "plo": [
      3,
      4
    ],
    "softSkills": [
      2,
      3
    ],
    "strategy3": true,
    "strategySubs": [
      3
    ],
    "tqf": [
      1,
      3
    ],
    "studentPlans": [
      1,
      4
    ],
    "startDate": "2024-08-24",
    "endDate": "2024-08-25",
    "remarks": "",
    "academicYear": 2567,
    "semester": "t1",
    "softSkill": "การทำงานเป็นทีม"
  },
  {
    "id": 18,
    "code": "267990010104",
    "name": "โครงการส่งเสริมจริยธรรมและจรรยาบรรณวิชาชีพ (ปี 2567)",
    "lecturer": "รศ.ดร.สุรชัย วงศ์สุวรรณ",
    "type": "กิจกรรมเสริมสร้างคุณธรรมและจริยธรรม",
    "budget": 15000,
    "actual": 14000,
    "participants": 80,
    "target": 85,
    "satisfaction": 4.5,
    "hours": 8,
    "respondents": 74,
    "evalRate": 92.5,
    "sdg": true,
    "sdgList": [
      4,
      16
    ],
    "ku": "I",
    "kuList": [
      "I",
      "D"
    ],
    "plo": [
      1,
      3
    ],
    "softSkills": [
      2,
      3
    ],
    "strategy3": true,
    "strategySubs": [
      3
    ],
    "tqf": [
      1,
      4
    ],
    "studentPlans": [
      1,
      4
    ],
    "startDate": "2024-11-20",
    "endDate": "2024-11-20",
    "remarks": "",
    "academicYear": 2567,
    "semester": "t2",
    "softSkill": "การบริหารตัวเอง"
  },
  {
    "id": 19,
    "code": "267990010105",
    "name": "โครงการจิตอาสาพัฒนาและบริการวิชาการสู่ชุมชน (ปี 2567)",
    "lecturer": "อ.นพดล เกียรติสกุล",
    "type": "กิจกรรมบำเพ็ญประโยชน์",
    "budget": 20000,
    "actual": 18900,
    "participants": 55,
    "target": 50,
    "satisfaction": 4.65,
    "hours": 16,
    "respondents": 50,
    "evalRate": 90.9,
    "sdg": true,
    "sdgList": [
      4,
      10
    ],
    "ku": "U",
    "kuList": [
      "U",
      "I",
      "D"
    ],
    "plo": [
      3,
      4
    ],
    "softSkills": [
      2,
      3
    ],
    "strategy3": true,
    "strategySubs": [
      3
    ],
    "tqf": [
      1,
      3
    ],
    "studentPlans": [
      1,
      4
    ],
    "startDate": "2024-12-14",
    "endDate": "2024-12-15",
    "remarks": "",
    "academicYear": 2567,
    "semester": "t2",
    "softSkill": "การทำงานเป็นทีม"
  },
  {
    "id": 20,
    "code": "267990010106",
    "name": "โครงการเทคโนโลยีสะอาดและสิ่งแวดล้อมน่าอยู่ (ปี 2567)",
    "lecturer": "อ.ศิริพร สวัสดิผล",
    "type": "กิจกรรมส่งเสริมการรักษาสิ่งแวดล้อม",
    "budget": 20000,
    "actual": 18200,
    "participants": 45,
    "target": 45,
    "satisfaction": 4.4,
    "hours": 10,
    "respondents": 41,
    "evalRate": 91.1,
    "sdg": true,
    "sdgList": [
      7,
      13
    ],
    "ku": "U",
    "kuList": [
      "U",
      "D"
    ],
    "plo": [
      3,
      4
    ],
    "softSkills": [
      1,
      3
    ],
    "strategy3": true,
    "strategySubs": [
      2,
      3
    ],
    "tqf": [
      1,
      3
    ],
    "studentPlans": [
      1,
      3
    ],
    "startDate": "2025-01-18",
    "endDate": "2025-01-19",
    "remarks": "",
    "academicYear": 2567,
    "semester": "t2",
    "softSkill": "ความคิดสร้างสรรค์"
  }
];

projectStore.__whEtlProjects = mockProjectsDB;
export const projects: Project[] = mockProjectsDB;

// ─── PURE DYNAMIC CALCULATION ENGINE (NO FAKE / ARBITRARY FORMULAS) ───────────

/** Helper: Array Average */
export function calculateArrayAvg(numbers: number[]): number {
  if (!numbers || numbers.length === 0) return 0;
  return numbers.reduce((sum, val) => sum + val, 0) / numbers.length;
}

/** Dynamic Aggregations: Total Budget, Actual Spend, Utilization % */
export function calculateBudgetSummary(data: Project[] = mockProjectsDB) {
  const totalBudget = data.reduce((sum, p) => sum + p.budget, 0);
  const totalActual = data.reduce((sum, p) => sum + p.actual, 0);
  const budgetUtilization = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;
  return { totalBudget, totalActual, budgetUtilization };
}

/** Dynamic Aggregations: Participants Summary */
export function calculateParticipantSummary(data: Project[] = mockProjectsDB) {
  const totalParticipants = data.reduce((sum, p) => sum + p.participants, 0);
  const totalTarget = data.reduce((sum, p) => sum + p.target, 0);
  const avgCostPerParticipant = totalParticipants > 0
    ? Math.round(data.reduce((sum, p) => sum + p.actual, 0) / totalParticipants)
    : 0;
  const avgAttendanceRate = data.length > 0
    ? calculateArrayAvg(data.map((p) => (p.participants / (p.target || 1)) * 100))
    : 0;
  return { totalParticipants, totalTarget, avgCostPerParticipant, avgAttendanceRate };
}

export const avgCostPerParticipant = calculateParticipantSummary(mockProjectsDB).avgCostPerParticipant;

/** Dynamic Aggregations: Quality & Satisfaction Averages (Excluding projects with 0 satisfaction) */
export function calculateQualitySummary(data: Project[] = mockProjectsDB) {
  const evaluatedProjects = data.filter((p) => p.satisfaction > 0);
  const avgSatisfaction = evaluatedProjects.length > 0
    ? calculateArrayAvg(evaluatedProjects.map((p) => p.satisfaction))
    : 0;
  const rateProjects = data.filter(p => p.evalRateAvailable !== false);
  const liveRates = rateProjects.filter(p => p.dataSource === 'live');
  const avgEvalRate = liveRates.length ? liveRates.reduce((n,p) => n+p.respondents,0) / liveRates.reduce((n,p) => n+(p.evaluationEligible ?? 0),0)*100
    : rateProjects.length ? calculateArrayAvg(rateProjects.map(p => p.evalRate)) : 0;
  const avgHours = data.length > 0
    ? calculateArrayAvg(data.map((p) => p.hours))
    : 0;
  return { avgSatisfaction, avgEvalRate, avgHours };
}

/** Dynamic Aggregations: Group 1 Performance & Efficiency */
export function calculateGroup1Metrics(data: Project[] = mockProjectsDB) {
  const { totalBudget, totalActual, budgetUtilization } = calculateBudgetSummary(data);
  const { avgCostPerParticipant } = calculateParticipantSummary(data);

  const costPerHeadList = data.map((p) => p.participants > 0 ? Math.round(p.actual / p.participants) : 0);
  const sortedByCost = data.filter(p => p.participants > 0).sort((a, b) => {
    const aCost = a.participants > 0 ? a.actual / a.participants : 0;
    const bCost = b.participants > 0 ? b.actual / b.participants : 0;
    return aCost - bCost;
  });
  
  const minCostProject = sortedByCost[0];
  const maxCostProject = sortedByCost[sortedByCost.length - 1];

  return {
    totalBudget,
    totalActual,
    budgetUtilization,
    avgCostPerParticipant,
    costPerHeadList,
    sortedByCost,
    minCostProject,
    maxCostProject,
  };
}

/** Dynamic Aggregations: Group 2 Attendance & Target Analysis */
export function calculateGroup2Metrics(data: Project[] = mockProjectsDB) {
  const attRates = data.map((p) => +((p.participants / (p.target || 1)) * 100).toFixed(1));
  const sortedByAttendance = data.filter(p => p.target > 0).sort((a, b) => (b.participants / (b.target || 1)) - (a.participants / (a.target || 1)));
  const sortedByEval = data.filter(p => p.evalRateAvailable !== false).sort((a, b) => b.evalRate - a.evalRate);

  const maxAttProject = sortedByAttendance[0];
  const minAttProject = sortedByAttendance[sortedByAttendance.length - 1];
  const maxEvalProject = sortedByEval[0];

  return {
    attRates,
    sortedByAttendance,
    sortedByEval,
    maxAttProject,
    minAttProject,
    maxEvalProject,
  };
}

/** Dynamic Aggregations: Group 3 Quality & Performance by Lecturer/Organizer (Excluding N/A values) */
export function calculateGroup3Metrics(data: Project[] = mockProjectsDB) {
  const evaluated = data.filter((p) => p.satisfaction > 0);
  const satSorted = [...evaluated].sort((a, b) => b.satisfaction - a.satisfaction);
  
  // Lecturer-level statistics (since type is redundant)
  const lecturerStats: Record<string, { sat: number[]; hours: number[]; pph: number[]; budget: number }> = Object.create(null);
  data.forEach((p) => {
    for (const key of p.responsibleNames?.length ? p.responsibleNames : [p.lecturer || 'ไม่ระบุ']) {
    if (!lecturerStats[key]) {
      lecturerStats[key] = { sat: [], hours: [], pph: [], budget: 0 };
    }
    if (p.satisfaction > 0) {
      lecturerStats[key].sat.push(p.satisfaction);
    }
    lecturerStats[key].hours.push(p.hours);
    if (p.hours > 0) {
      lecturerStats[key].pph.push(p.participants / p.hours);
    }
    lecturerStats[key].budget += p.actual;
    }
  });

  return {
    satSorted,
    lecturerStats,
    typeBudget: lecturerStats, // For backward compatibility matching typeBudget structures
    topSatisfactionProject: satSorted[0],
  };
}

/** Dynamic Aggregations: Group 4 Strategic Alignment Analysis */
export function calculateGroup4Metrics(data: Project[] = mockProjectsDB) {
  // KU Identity counts (I-D-K-U count supports)
  const kuDistribution: Record<KUIdentity, number> = { I: 0, D: 0, K: 0, U: 0 };
  data.forEach((p) => {
    p.kuList.forEach((letter) => {
      if (letter in kuDistribution) {
        kuDistribution[letter]++;
      }
    });
  });
  const topKU = Object.entries(kuDistribution).sort((a, b) => b[1] - a[1])[0];

  // SDGs compliance comparison
  const sdgProjects = data.filter((p) => p.sdgList.length > 0);
  const nonSdgProjects = data.filter((p) => p.sdgList.length === 0);
  
  const sdgAvgSat = sdgProjects.filter(p => p.satisfaction > 0).length > 0
    ? calculateArrayAvg(sdgProjects.filter(p => p.satisfaction > 0).map((p) => p.satisfaction))
    : 0;
  const nonSdgAvgSat = nonSdgProjects.filter(p => p.satisfaction > 0).length > 0
    ? calculateArrayAvg(nonSdgProjects.filter(p => p.satisfaction > 0).map((p) => p.satisfaction))
    : 0;
    
  const sdgAvgAtt = sdgProjects.length > 0
    ? calculateArrayAvg(sdgProjects.map((p) => (p.participants / (p.target || 1)) * 100))
    : 0;
  const nonSdgAvgAtt = nonSdgProjects.length > 0
    ? calculateArrayAvg(nonSdgProjects.map((p) => (p.participants / (p.target || 1)) * 100))
    : 0;

  const sdgAvgPart = sdgProjects.length > 0
    ? calculateArrayAvg(sdgProjects.map((p) => p.participants))
    : 0;
  const nonSdgAvgPart = nonSdgProjects.length > 0
    ? calculateArrayAvg(nonSdgProjects.map((p) => p.participants))
    : 0;

  // PLO coverage counts (1-4)
  const ploCoverage: Record<PLONumber, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  data.forEach((p) => p.plo.forEach((n) => {
    if (n in ploCoverage) {
      ploCoverage[n]++;
    }
  }));
  const minPLO = Object.entries(ploCoverage).sort((a, b) => +a[1] - +b[1])[0];

  // Strategy Subcategories compliance counts (1, 2, 3)
  const strategySubDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  data.forEach((p) => {
    p.strategySubs.forEach((num) => {
      if (num in strategySubDistribution) {
        strategySubDistribution[num]++;
      }
    });
  });

  return {
    kuDistribution,
    topKU,
    sdgProjects,
    nonSdgProjects,
    sdgAvgSat,
    nonSdgAvgSat,
    sdgAvgAtt,
    nonSdgAvgAtt,
    sdgAvgPart,
    nonSdgAvgPart,
    ploCoverage,
    minPLO,
    strategySubDistribution,
  };
}

// ─── DYNAMIC TRANSFORMS REPLACING HARDCODED TRENDS & STATS ────────────────────

// Color Palette Maps
export const typeColorMap: Record<ProjectType, string> = {
  'กิจกรรมวิชาการที่ส่งเสริมคุณลักษณะบัณฑิตที่พึงประสงค์': '#2563EB',
  'กิจกรรมเสริมสร้างคุณธรรมและจริยธรรม': '#0D9488',
  'กิจกรรมกีฬาหรือส่งเสริมสุขภาพ': '#059669',
  'กิจกรรมบำเพ็ญประโยชน์': '#D97706',
  'กิจกรรมเสริมสร้างศิลปะและวัฒนธรรม': '#7C3AED',
  'กิจกรรมส่งเสริมการรักษาสิ่งแวดล้อม': '#0891B2',
  'พัฒนาหลักสูตร': '#4F46E5',
};

export const kuColorMap: Record<KUIdentity, string> = {
  I: '#059669',
  D: '#D97706',
  K: '#2563EB',
  U: '#7C3AED',
};

// Dynamically generate monthly trend data instead of hardcoded quarterlyData
export function getMonthlyTrends(data: Project[] = mockProjectsDB) {
  // Sort projects by startDate
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const monthlyStats = months.map((m, idx) => {
    const monthNum = idx + 1;
    // filter projects in this month (any year)
    const projs = data.filter((p) => {
      const month = parseInt(p.startDate.split('-')[1], 10);
      return month === monthNum;
    });
    const budget = projs.reduce((s, p) => s + p.budget, 0);
    const actual = projs.reduce((s, p) => s + p.actual, 0);
    return {
      label: m,
      budget,
      actual,
    };
  });
  return monthlyStats;
}

// Dynamically calculate soft skill stats from projects
export function getSoftSkillStats(data: Project[] = mockProjectsDB) {
  const skillNames = ['ด้านการคิดและแก้ไขปัญหา', 'ด้านการบริหารจัดการตัวเอง', 'ด้านการทำงานร่วมกับผู้อื่น', 'ด้านเทคโนโลยี'];
  return skillNames.map((name, index) => {
    const skillCode = index + 1;
    const projs = data.filter((p) => p.softSkills.includes(skillCode));
    const satisfactionProjs = projs.filter(p => p.satisfaction > 0);
    const score = satisfactionProjs.length > 0 ? calculateArrayAvg(satisfactionProjs.map(p => p.satisfaction)) : 0;
    const totalActual = projs.reduce((s, p) => s + p.actual, 0);
    const totalParticipants = projs.reduce((s, p) => s + p.participants, 0);
    const costPerHead = totalParticipants > 0 ? Math.round(totalActual / totalParticipants) : null;
    return {
      name,
      costPerHead,
      score: score || null,
    };
  });
}

// Dynamically calculate student plans stats from projects
export function getStudentPlanStats(data: Project[] = mockProjectsDB) {
  const plans = [
    '1. ส่งเสริมอัตลักษณ์นิสิต',
    '2. พัฒนาทักษะการทำงาน',
    '3. ยกระดับสิ่งสนับสนุนการเรียนรู้',
    '4. สร้างความผูกพันและภูมิใจ',
    '5. สร้างความร่วมมือนิสิตเก่า'
  ];
  return plans.map((name, index) => {
    const planCode = index + 1;
    const projs = data.filter((p) => p.studentPlans.includes(planCode));
    const totalBudget = projs.reduce((s, p) => s + p.budget, 0);
    const totalActual = projs.reduce((s, p) => s + p.actual, 0);
    const participants = projs.reduce((s, p) => s + p.participants, 0);
    return {
      name,
      count: projs.length,
      budget: totalBudget,
      actual: totalActual,
      participants,
    };
  });
}

// Static fallback variables for backward compatibility
export const quarterlyData = [
  { label: 'Q1 ต.ค.–ธ.ค.', budget: 86990, actual: 79292 },
  { label: 'Q2 ม.ค.–มี.ค.', budget: 74940, actual: 47688 },
  { label: 'Q3 เม.ย.–มิ.ย.', budget: 90000, actual: 83454 },
  { label: 'Q4 ก.ค.–ก.ย.', budget: 0, actual: 0 },
];

export const softSkillData = [
  { name: 'การคิดแก้ปัญหา',    costPerHead: 565, score: 4.16 },
  { name: 'การบริหารตัวเอง',   costPerHead: 1102, score: 4.20 },
  { name: 'การทำงานเป็นทีม',   costPerHead: 88, score: 4.59 },
  { name: 'ความคิดสร้างสรรค์', costPerHead: 2938, score: 4.75 },
  { name: 'การสื่อสาร',        costPerHead: 471, score: 4.58 },
];

export const yearParticipation = {
  labels: [
    'วิชาการ/คุณลักษณะบัณฑิต',
    'คุณธรรมและจริยธรรม',
    'กีฬาหรือส่งเสริมสุขภาพ',
    'บำเพ็ญประโยชน์',
    'ส่งเสริมการรักษาสิ่งแวดล้อม',
  ],
  datasets: [
    { year: 'ปี 1', data: [72, 85, 65, 78, 90] },
    { year: 'ปี 2', data: [91, 78, 82, 88, 85] },
    { year: 'ปี 3', data: [85, 60, 78, 92, 70] },
    { year: 'ปี 4', data: [88, 42, 55, 80, 60] },
  ],
};

export const identityTargeting = [
  { year: 'ปี 1', D: 48, I: 18, K: 25 },
  { year: 'ปี 2', D: 28, I: 32, K: 35 },
  { year: 'ปี 3', D: 16, I: 30, K: 30 },
  { year: 'ปี 4', D: 8,  I: 20, K: 10 },
];
