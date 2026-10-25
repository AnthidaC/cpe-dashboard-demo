// lib/mockParticipants.ts — Deterministic Mock Participant Generator + Dynamic Cohort Resolution
import { Project } from './mockData';
import { calculateStudyYearFromPrefix, resolveAcademicYearBE } from './cohortUtils';

export interface Participant {
  studentId: string;
  name?: string;
  entryYear: number;
  studyYear: number;
  registeredProjects: number[]; // Array of project IDs registered
  attendedProjects: number[]; // Array of project IDs actually attended (attended <= registered)
}

// In-memory store for custom imported student attendance
const participantStore = globalThis as typeof globalThis & { __whEtlParticipants?: Map<string, Participant> };
const customAttendanceStore = participantStore.__whEtlParticipants ??= new Map<string, Participant>();

export function addCustomStudentAttendance(
  studentId: string,
  name?: string,
  projectId: number = 1,
  attended = true,
  refAcademicYear = 2568
) {
  const cleanId = String(studentId).trim();
  const prefix = cleanId.substring(0, 2);
  const pNum = parseInt(prefix, 10);
  const entryYear = !isNaN(pNum) ? (pNum >= 40 ? 2500 + pNum : 2600 + pNum) : 2568;
  const studyYear = calculateStudyYearFromPrefix(prefix, refAcademicYear);

  let student = customAttendanceStore.get(cleanId);
  if (!student) {
    student = {
      studentId: cleanId,
      name: name || `นิสิต รหัส ${cleanId}`,
      entryYear,
      studyYear,
      registeredProjects: [],
      attendedProjects: [],
    };
    customAttendanceStore.set(cleanId, student);
  } else {
    student.studyYear = studyYear;
    student.entryYear = entryYear;
  }

  if (!student.registeredProjects.includes(projectId)) {
    student.registeredProjects.push(projectId);
  }
  if (attended && !student.attendedProjects.includes(projectId)) {
    student.attendedProjects.push(projectId);
  }
  if (!attended) {
    student.attendedProjects = student.attendedProjects.filter((id) => id !== projectId);
  }
}

export function getCustomStudents(): Participant[] {
  return Array.from(customAttendanceStore.values());
}

const firstNames = [
  'สมชาย', 'สมหญิง', 'วิทยา', 'อนงค์', 'ปกรณ์', 'กัญญา', 'ธีรยุทธ', 'นรีรัตน์',
  'เกียรติศักดิ์', 'พรทิพย์', 'ชัชวาล', 'ศิริพร', 'อภิชาติ', 'วรรณภา', 'ธนพล',
  'พัชรา', 'สุรชัย', 'จารุณี', 'สุรพงษ์', 'วิไลวรรณ', 'อัครเดช', 'จิราภรณ์',
  'กิตติพงษ์', 'นงลักษณ์', 'ประเสริฐ', 'ศิริรัตน์', 'นพดล', 'สิริพร', 'สกล',
  'นภา', 'เกียรติ', 'รัชนี', 'กิตติ', 'อุษา', 'ณรงค์', 'จินตนา', 'ปรีชา',
  'อารีย์', 'มานะ', 'สุดใจ', 'สุวรรณ', 'พิกุล', 'จงรักษ์', 'บุญยืน', 'ประสงค์',
  'ดวงใจ', 'เสถียร', 'สุนทร', 'ชูชาติ', 'วันดี'
];

const lastNames = [
  'ใจดี', 'รักเรียน', 'ประเสริฐศิลป์', 'รุ่งเรือง', 'มณีรัตน์', 'แก้ววิจิตร',
  'สมบูรณ์สุข', 'ทองดี', 'พึ่งสุข', 'สิริกุล', 'เลิศล้ำ', 'เจริญสุข', 'คงมั่น',
  'สุขสวัสดิ์', 'งามดี', 'พูนทรัพย์', 'ขยันยิ่ง', 'ปัญญาดี', 'รอดไพร่',
  'วงศ์สุวรรณ', 'สิริทรัพย์', 'สวัสดิผล', 'วัฒนพาณิชย์', 'บารมีกุล',
  'โชคดีมีชัย', 'พงษ์พาณิชย์', 'แสงทอง', 'ร่มเย็น', 'อนันตศิลป์', 'ศิริโรจน์',
  'ประสพสุข', 'รุ่งโรจน์', 'ทวีสิน', 'สุขสำราญ', 'ปัญญาสกุล', 'เลิศศิริ',
  'พงษ์ศักดิ์', 'เจริญผล', 'ดีเลิศ', 'มิตรภาพ', 'ภักดี', 'แสนดี', 'รักษ์ไทย',
  'ชูเกียรติ', 'ยอดเยี่ยม', 'ทองคำ', 'ดวงดี', 'มีศรี', 'ชุ่มชื่น', 'มั่นคง'
];

/**
 * Returns deterministic mock participants dynamically shifted to match the reference academic year.
 * Only returns students who have registered for at least one project in the provided projects list.
 */
export function getParticipants(projects: Project[]): Participant[] {
  const projectIds = new Set(projects.map(project => project.id));
  if (projectIds.size === 0) return [];
  // Determine reference academic year from projects, or fallback to 2568
  const foundYear = projects.find((p) => p.academicYear)?.academicYear;
  const refYear = resolveAcademicYearBE(foundYear, 2568);

  const totalStudents = 250;
  const students: Participant[] = [];

  for (let i = 0; i < totalStudents; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[(i * 3) % lastNames.length];

    let entryYear = refYear;
    let studyYear = 1;

    // Dynamically calculate entry year relative to refYear:
    // Year 1 (Entry = refYear) - 65 students
    // Year 2 (Entry = refYear - 1) - 60 students
    // Year 3 (Entry = refYear - 2) - 50 students
    // Year 4 (Entry = refYear - 3) - 40 students
    // Year 5+ (Entry = refYear - 4 and before) - 35 students
    if (i < 65) {
      entryYear = refYear;
      studyYear = 1;
    } else if (i < 125) {
      entryYear = refYear - 1;
      studyYear = 2;
    } else if (i < 175) {
      entryYear = refYear - 2;
      studyYear = 3;
    } else if (i < 215) {
      entryYear = refYear - 3;
      studyYear = 4;
    } else {
      entryYear = i % 2 === 0 ? refYear - 4 : refYear - 5;
      studyYear = 5;
    }

    const idPrefix = String(entryYear).slice(-2); // e.g. '70', '69', '68', '67'
    const idRest = String(i + 1).padStart(8, '0');
    const studentId = idPrefix + idRest;

    students.push({
      studentId,
      name: `${fn} ${ln}`,
      entryYear,
      studyYear,
      registeredProjects: [],
      attendedProjects: [],
    });
  }

  // Map registrations & attendance dynamically based on projects in the active dataset.
  projects.forEach((proj) => {
    // Skip academic/lecturer development project
    if (proj.id === 8 || proj.type === 'พัฒนาหลักสูตร') {
      return;
    }

    const target = Math.max(proj.target || 0, proj.participants || 0);
    const participants = Math.min(proj.participants || 0, target);

    // Use deterministic offset per project to distribute student attendance
    const offset = (proj.id * 31) % totalStudents;

    for (let k = 0; k < target; k++) {
      const studentIdx = (offset + k) % totalStudents;
      const student = students[studentIdx];

      student.registeredProjects.push(proj.id);
      if (k < participants) {
        student.attendedProjects.push(proj.id);
      }
    }
  });

  // Merge with custom imported students
  const studentMap = new Map<string, Participant>();
  for (const s of students) {
    studentMap.set(s.studentId, s);
  }

  customAttendanceStore.forEach((customStudent, id) => {
    // Dynamically recalculate study year for the current reference year
    const registeredProjects = customStudent.registeredProjects.filter(pid => projectIds.has(pid));
    if (!registeredProjects.length) return;
    const scopedStudent = { ...customStudent, studyYear: calculateStudyYearFromPrefix(id.substring(0, 2), refYear),
      registeredProjects, attendedProjects: customStudent.attendedProjects.filter(pid => projectIds.has(pid)) };

    const existing = studentMap.get(id);
    if (existing) {
      scopedStudent.registeredProjects.forEach((pid) => {
        if (!existing.registeredProjects.includes(pid)) existing.registeredProjects.push(pid);
      });
      existing.attendedProjects = existing.attendedProjects.filter(pid => !registeredProjects.includes(pid));
      scopedStudent.attendedProjects.forEach((pid) => {
        if (!existing.attendedProjects.includes(pid)) existing.attendedProjects.push(pid);
      });
    } else {
      studentMap.set(id, scopedStudent);
    }
  });

  // Filter and return only students who have registered activity in this active project list
  return Array.from(studentMap.values()).filter((s) => s.registeredProjects.length > 0);
}
