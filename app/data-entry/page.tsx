'use client';
// app/data-entry/page.tsx — Executive ETL Data Management Portal with Student Attendance
import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './data-entry.module.css';
import { CleansedRecord, EtlParseResult, AttendanceParseResult, AttendanceStatus, ATTENDED_STATUSES, AttendanceImportMode, AttendanceSummary, SessionType } from '@/lib/etl/types';
import { isIsoDate } from '@/lib/etl/attendance';
import { exportDashboardToExcel } from '@/lib/exportExcel';
import { Project, ProjectType, KUIdentity, PLONumber, SoftSkillArea } from '@/lib/mockData';
import { deriveDateContext, getDynamicCohortList } from '@/lib/cohortUtils';
import { defaultPloDefinitions, getPloDefinition, type PLODefinition } from '@/lib/ploLabels';


function humanizeError(err: unknown, defaultMessage = 'เกิดข้อผิดพลาดในการประมวลผลข้อมูล'): string {
  if (!err) return defaultMessage;
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('fetch failed')) {
    return 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ในขณะนี้ กรุณาตรวจสอบสัญญาณอินเทอร์เน็ตหรือรีเฟรชหน้าเว็บแล้วลองใหม่อีกครั้ง';
  }
  if (msg.includes('JSON.parse') || msg.includes('SyntaxError')) {
    return 'ข้อมูลที่ได้รับจากเซิร์ฟเวอร์ไม่ถูกต้องตามรูปแบบ กรุณาลองใหม่อีกครั้ง';
  }
  if (msg.includes('ไม่พบแผ่นงานเช็คชื่อในไฟล์')) {
    return 'ไม่พบแผ่นงาน (Sheet) ชื่อ "เช็คชื่อ" หรือ "นิสิต" ในไฟล์ Excel ที่อัปโหลด กรุณาตรวจสอบชื่อแผ่นงานหรือดาวน์โหลดแม่แบบตัวอย่าง';
  }
  if (msg.includes('กรุณาส่งรายชื่อ 1–10,000 รายการต่อครั้ง')) {
    return 'กรุณาระบุรายชื่อนิสิตอย่างน้อย 1 คน (ไม่เกิน 10,000 คนต่อครั้ง)';
  }
  if (msg.includes('พบรหัสนิสิต สถานะ หรือรายการที่ไม่ผ่านการตรวจสอบ')) {
    return 'พบรายการที่ไม่ถูกต้อง: กรุณาตรวจสอบรหัสนิสิต (ต้องมี 8 หรือ 10 หลัก) และสถานะการเช็คชื่อ (ต้องเป็น เข้าร่วม, เช้า, บ่าย, ลา หรือ ขาด) ให้ถูกต้องก่อนบันทึก';
  }
  if (msg.includes('ช่วงวันที่จัดโครงการไม่ถูกต้อง') || msg.includes('วันที่สิ้นสุดอยู่ก่อนวันเริ่ม')) {
    return 'ช่วงวันที่จัดกิจกรรมไม่ถูกต้อง: วันที่สิ้นสุดโครงการต้องเป็นวันเดียวกับหรือหลังวันเริ่มโครงการ';
  }
  if (msg.includes('วันที่เช็คชื่ออยู่นอกช่วงจัดโครงการ')) {
    return 'วันที่เช็คชื่อไม่อยู่ในช่วงวันที่จัดกิจกรรมของโครงการ กรุณาตรวจสอบวันที่เช็คชื่อให้ตรงกับวันจัดงานจริง';
  }
  if (msg.includes('พบคะแนนหลายค่า')) {
    return 'พบคะแนนหลายค่าในช่องเดียวกัน: หากมีผลประเมินหลายรอบ กรุณาระบุเป็นคะแนนสรุปเพียงค่าเดียว หรือใช้ฟังก์ชันประเมินรายวัน (Daily KPI)';
  }
  return msg;
}

export interface FormKpiItem {
  id: string;
  scope: 'ALL' | 'DAILY';
  date: string;
  respondents: number | '';
  eligible: number | '';
  score: number | '';
}

const KNOWN_LECTURERS = [
  'ผศ.ดร.กิตติพงษ์ เจริญศิลป์',
  'รศ.ดร.สุรชัย วงศ์สุวรรณ',
  'ผศ.ดร.วิภาดา พูนทรัพย์',
  'อ.ดร.สมชาย ปัญญาดี',
  'อ.ศิริพร สวัสดิผล',
  'อ.ปกรณ์ มุ่งมั่น',
  'อ.นพดล เกียรติสกุล',
  'ผศ.ดร.ธนพล รุ่งเรือง',
  'รศ.ดร.จารุณี ประเสริฐผล',
  'ผศ.ดร.เกียรติศักดิ์ ชูชัย',
  'โครงการภาควิชาวิศวกรรมคอมพิวเตอร์',
  'คณะทำงานพัฒนานิสิตและฝึกงาน',
];

const ALL_SDGS = [
  { num: 1, label: 'ขจัดความยากจน (No Poverty)' },
  { num: 2, label: 'ยุติความหิวโหย (Zero Hunger)' },
  { num: 3, label: 'สุขภาพและความเป็นอยู่ที่ดี (Good Health & Well-being)' },
  { num: 4, label: 'การศึกษาที่มีคุณภาพ (Quality Education)' },
  { num: 5, label: 'ความเท่าเทียมทางเพศ (Gender Equality)' },
  { num: 6, label: 'น้ำสะอาดและสุขอนามัย (Clean Water & Sanitation)' },
  { num: 7, label: 'พลังงานสะอาดที่เข้าถึงได้ (Affordable & Clean Energy)' },
  { num: 8, label: 'งานที่มีคุณค่าและเศรษฐกิจเติบโต (Decent Work & Growth)' },
  { num: 9, label: 'อุตสาหกรรม นวัตกรรม โครงสร้างพื้นฐาน (Industry & Innovation)' },
  { num: 10, label: 'ลดความเหลื่อมล้ำ (Reduced Inequalities)' },
  { num: 11, label: 'เมืองและชุมชนที่ยั่งยืน (Sustainable Cities)' },
  { num: 12, label: 'การบริโภคและการผลิตที่ยั่งยืน (Responsible Consumption)' },
  { num: 13, label: 'รับมือการเปลี่ยนแปลงสภาพภูมิอากาศ (Climate Action)' },
  { num: 14, label: 'ทรัพยากรทางทะเล (Life Below Water)' },
  { num: 15, label: 'ระบบนิเวศบนบก (Life on Land)' },
  { num: 16, label: 'ความสงบสุข ยุติธรรม สถาบันเข้มแข็ง (Peace & Justice)' },
  { num: 17, label: 'ความร่วมมือเพื่อการพัฒนาที่ยั่งยืน (Partnerships)' },
];

const FACULTY_STRATEGIES = [
  {
    num: 1,
    title: 'ยุทธศาสตร์ที่ 1: การจัดการศึกษาเพื่อผลิตวิศวกรที่มีสมรรถนะสูง',
    desc: 'มุ่งเน้นการเรียนรู้ตลอดชีวิต (Lifelong Learning) การศึกษาดิจิทัล และพัฒนาทักษะแห่งอนาคต',
  },
  {
    num: 2,
    title: 'ยุทธศาสตร์ที่ 2: วิจัยขั้นแนวหน้า นวัตกรรม และการสร้างมูลค่าเพิ่ม',
    desc: 'สนับสนุนงานวิจัย Deep Tech, AI, นวัตกรรม และทรัพย์สินทางปัญญาเชิงพาณิชย์',
  },
  {
    num: 3,
    title: 'ยุทธศาสตร์ที่ 3: การบริการวิชาการและการถ่ายทอดเทคโนโลยีเพื่อสังคม',
    desc: 'บริการวิชาการ เสริมสร้างศักยภาพชุมชน ถ่ายทอดเทคโนโลยี และร่วมมือกับอุตสาหกรรม',
  },
  {
    num: 4,
    title: 'ยุทธศาสตร์ที่ 4: การบริหารจัดการองค์กรที่ทันสมัย คล่องตัว และยั่งยืน',
    desc: 'พัฒนาระบบบริหารดิจิทัล ความโปร่งใส และโครงสร้างพื้นฐานสีเขียวเป็นมิตรต่อสิ่งแวดล้อม',
  },
  {
    num: 5,
    title: 'ยุทธศาสตร์ที่ 5: การสร้างความเป็นเลิศและเครือข่ายความร่วมมือสากล',
    desc: 'ยกระดับหลักสูตรมาตรฐานสากล แลกเปลี่ยนนิสิตนานาชาติ และเครือข่ายความร่วมมือทั่วโลก',
  },
];

export default function DataEntryPage() {
  const [activeTab, setActiveTab] = useState<'bulk' | 'attendance' | 'form' | 'records' | 'kpi'>('bulk');
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parseResult, setParseResult] = useState<EtlParseResult | null>(null);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [warehouseProjects, setWarehouseProjects] = useState<Project[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Student Attendance ETL State ───────────────────────────────────────────
  const [attProjectId, setAttProjectId] = useState<number | ''>('');
  const [attCheckDate, setAttCheckDate] = useState('');
  const [attSessionType, setAttSessionType] = useState<SessionType>('SPLIT_SESSION');
  const [attImportMode, setAttImportMode] = useState<AttendanceImportMode>('merge');
  const [attSummary, setAttSummary] = useState<AttendanceSummary | null>(null);
  const [attMode, setAttMode] = useState<'file' | 'paste'>('paste');
  const [attBatchStatus, setAttBatchStatus] = useState<AttendanceStatus | ''>('');
  const [attRawText, setAttRawText] = useState('');
  const [attParseResult, setAttParseResult] = useState<AttendanceParseResult | null>(null);
  const [isAttParsing, setIsAttParsing] = useState(false);
  const [isAttImporting, setIsAttImporting] = useState(false);
  const attFileInputRef = useRef<HTMLInputElement>(null);

  // ─── Single Entry Form State ────────────────────────────────────────────────
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formLecturer, setFormLecturer] = useState('');
  const [formType, setFormType] = useState<ProjectType | ''>('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formAcademicYearChoice, setFormAcademicYearChoice] = useState<'auto' | number>('auto');
  const [formHours, setFormHours] = useState<number | ''>('');
  const [formBudget, setFormBudget] = useState<number | ''>('');
  const [formActual, setFormActual] = useState<number | ''>('');
  const [formTarget, setFormTarget] = useState<number | ''>('');
  const [formParticipants, setFormParticipants] = useState<number | ''>('');
  const [formRespondents, setFormRespondents] = useState<number | ''>('');
  const [formSatisfaction, setFormSatisfaction] = useState<string>('');
  const [formKuList, setFormKuList] = useState<KUIdentity[]>([]);
  const [formSdgs, setFormSdgs] = useState<number[]>([]);
  const [formPlos, setFormPlos] = useState<PLONumber[]>([]);
  const [ploDefs, setPloDefs] = useState<Record<number, PLODefinition>>(defaultPloDefinitions);
  const [formSoftSkill, setFormSoftSkill] = useState<SoftSkillArea | ''>('');
  const [formStrategies, setFormStrategies] = useState<number[]>([]);
  const [formRemarks, setFormRemarks] = useState('');
  // ─── Dynamic KPI Builder State ──────────────────────────────────────────────
  const [formKpiList, setFormKpiList] = useState<FormKpiItem[]>([
    { id: 'kpi-init-1', scope: 'ALL', date: '', respondents: '', eligible: '', score: '' },
  ]);

  // ─── Dedicated Daily KPI Manager Tab State ──────────────────────────────────
  const [manageKpiProjectId, setManageKpiProjectId] = useState<number | ''>('');
  const [manageKpiRows, setManageKpiRows] = useState<FormKpiItem[]>([]);
  const [isLoadingKpis, setIsLoadingKpis] = useState(false);
  const [isSavingKpis, setIsSavingKpis] = useState(false);


  const fetchWarehouseRecords = useCallback(async () => {
    setIsLoadingRecords(true);
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'โหลดโครงการไม่สำเร็จ');
      if (Array.isArray(data.projects)) {
        setWarehouseProjects(data.projects);
        if (data.ploDefinitions) setPloDefs(data.ploDefinitions);
        setAttProjectId((current) => data.projects.some((p: Project) => p.id === current) ? current : '');
      }
    } catch (err) {
      console.error('Failed to load records:', err);
      setAlertMsg({ type: 'error', text: 'โหลดรายการโครงการไม่สำเร็จ กรุณากดรีเฟรชรายการเพื่อลองใหม่' });
    } finally {
      setIsLoadingRecords(false);
    }
  }, []);

  useEffect(() => { fetchWarehouseRecords(); }, [activeTab, fetchWarehouseRecords]);

  useEffect(() => {
    if (!attProjectId || activeTab !== 'attendance') return;
    let cancelled = false;
    fetch(`/api/etl/attendance/import?projectId=${attProjectId}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'โหลดสรุปเช็คชื่อไม่สำเร็จ');
        if (!cancelled) setAttSummary(data.summary);
      }).catch((error: Error) => {
        if (!cancelled) setAlertMsg({ type: 'error', text: error.message });
      });
    return () => { cancelled = true; };
  }, [attProjectId, activeTab]);

  // Download official Excel template
  const handleDownloadTemplate = () => {
    window.location.href = '/api/etl/template';
  };

  // ─── Bulk Projects File Upload & Parse ───────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setAlertMsg(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/etl/parse', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'การประมวลผลไฟล์ล้มเหลว');
      }

      setParseResult(data);
      setAlertMsg({
        type: 'success',
        text: `ตรวจสอบไฟล์ "${data.fileName}" สำเร็จ: พบ ${data.totalRows} แถว (สมบูรณ์ ${data.validCount}, มีข้อควรปรับปรุง ${data.warningCount}, ข้อผิดพลาด ${data.errorCount})`,
      });
    } catch (err: unknown) {
      setAlertMsg({ type: 'error', text: humanizeError(err, 'ไม่สามารถเปิดอ่านไฟล์ที่อัปโหลดได้ กรุณาตรวจว่าเป็นไฟล์ Excel ที่สมบูรณ์') });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Commit and Load Bulk Projects to Warehouse
  const handleCommitLoad = async () => {
    if (!parseResult || parseResult.records.length === 0) return;
    const validRecordsToLoad = parseResult.records.filter((r) => r.status !== 'error');

    if (validRecordsToLoad.length === 0) {
      setAlertMsg({ type: 'error', text: 'ไม่พบรายการที่ถูกต้องสำหรับนำเข้าสู่ระบบ' });
      return;
    }

    setIsImporting(true);
    setAlertMsg(null);

    try {
      const res = await fetch('/api/etl/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: validRecordsToLoad }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'การโหลดข้อมูลลงคลังล้มเหลว');

      setAlertMsg({
        type: 'success',
        text: `✅ ${data.message} ตอนนี้ระบบพร้อมแสดงผลในแดชบอร์ดทั้ง 5 มิติแล้ว!`,
      });
      setParseResult(null);
      fetchWarehouseRecords();
    } catch (err: unknown) {
      setAlertMsg({ type: 'error', text: humanizeError(err, 'การโหลดข้อมูลลงคลังข้อมูลไม่สำเร็จ กรุณาตรวจสอบความถูกต้องของรายการ') });
    } finally {
      setIsImporting(false);
    }
  };

  // ─── Student Attendance Parse & Import ──────────────────────────────────────
  const handleParseAttendance = async () => {
    setIsAttParsing(true);
    setAlertMsg(null);

    const targetProject = warehouseProjects.find((p) => p.id === attProjectId);
    if (!targetProject || !isIsoDate(attCheckDate) || (targetProject.startDate && attCheckDate < targetProject.startDate) || (targetProject.endDate && attCheckDate > targetProject.endDate) || (attMode === 'paste' && !attBatchStatus)) {
      setAlertMsg({ type: 'error', text: 'กรุณาเลือกโครงการ วันที่ภายในช่วงจัดงาน และสถานะการเข้าร่วมก่อนตรวจสอบรายชื่อ' });
      setIsAttParsing(false);
      return;
    }
    const projectName = targetProject.name;
    const projectAcademicYear = targetProject?.academicYear || 2568;

    try {
      let res: Response;
      if (attMode === 'file') {
        const file = attFileInputRef.current?.files?.[0];
        if (!file) {
          throw new Error('กรุณาเลือกไฟล์รายชื่อเช็คชื่อ (.xlsx, .csv)');
        }
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', String(attProjectId));
        formData.append('projectName', projectName);
        formData.append('academicYear', String(projectAcademicYear));
        formData.append('checkDate', attCheckDate);
        formData.append('projectCode', targetProject.code);
        res = await fetch('/api/etl/attendance/parse', { method: 'POST', body: formData });
      } else {
        if (!attRawText.trim()) {
          throw new Error('กรุณาวางรหัสนิสิตในกล่องข้อความ');
        }
        res = await fetch('/api/etl/attendance/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rawText: attRawText,
            projectId: attProjectId,
            projectName,
            academicYear: projectAcademicYear,
            batchStatus: attBatchStatus,
            checkDate: attCheckDate,
            projectCode: targetProject.code,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAttParseResult(data);
      setAlertMsg({
        type: 'success',
        text: `สกัดรหัสนิสิตสำเร็จ: พบทั้งหมด ${data.totalRows} คน (ผ่านเกณฑ์ ${data.validCount} คน) พร้อมจัดกลุ่มตามรุ่นปีเรียบร้อยแล้ว`,
      });
    } catch (err: unknown) {
      setAlertMsg({ type: 'error', text: humanizeError(err, 'ไม่สามารถสกัดรายชื่อนิสิตได้ กรุณาตรวจรหัสนิสิตและรูปแบบข้อมูล') });
    } finally {
      setIsAttParsing(false);
    }
  };

  const handleSetRecordStatus = (tempId: string, newStatus: AttendanceStatus) => {
    if (!attParseResult) return;
    const updated = attParseResult.records.map((r) => {
      if (r.tempId === tempId) {
        return { ...r, status: newStatus };
      }
      return r;
    });

    const breakdown: Record<string, number> = {};
    updated.forEach((r) => {
      if (ATTENDED_STATUSES.includes(r.status)) {
        const key = `ปี ${r.studyYear} (รุ่น ${r.cohort})`;
        breakdown[key] = (breakdown[key] || 0) + 1;
      }
    });

    const statusBreakdown: Record<AttendanceStatus, number> = {
      attended: updated.filter((r) => r.status === 'attended').length,
      morning: updated.filter((r) => r.status === 'morning').length,
      afternoon: updated.filter((r) => r.status === 'afternoon').length,
      leave: updated.filter((r) => r.status === 'leave').length,
      absent: updated.filter((r) => r.status === 'absent').length,
    };

    setAttParseResult({
      ...attParseResult,
      records: updated,
      cohortBreakdown: breakdown,
      statusBreakdown,
    });
  };

  const handleCommitAttendance = async () => {
    if (!attParseResult || attParseResult.records.length === 0 || attParseResult.errorCount > 0) return;
    if (attSessionType === 'SINGLE_SESSION' && attParseResult.records.some((record) => record.status === 'morning' || record.status === 'afternoon')) {
      setAlertMsg({ type: 'error', text: 'มีผู้เข้าร่วมเฉพาะเช้าหรือบ่าย กรุณาเลือกแบ่งช่วงเช้า–บ่าย หรือแก้สถานะก่อนบันทึก' });
      return;
    }
    setIsAttImporting(true);
    setAlertMsg(null);

    const targetProject = warehouseProjects.find((p) => p.id === attProjectId);
    const projectName = targetProject ? targetProject.name : 'โครงการเป้าหมาย';

    try {
      const res = await fetch('/api/etl/attendance/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: attParseResult.records,
          projectId: attProjectId,
          projectName,
          checkDate: attCheckDate,
          sessionType: attSessionType,
          importMode: attImportMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAlertMsg({
        type: 'success',
        text: `✅ ${data.message} อัปเดตสถิตินิสิตในโครงการ "${projectName}" เป็น ${data.newParticipantTotal} คน เรียบร้อยแล้ว!`,
      });
      setAttParseResult(null);
      setAttSummary(data.summary);
      fetchWarehouseRecords();
    } catch (err: unknown) {
      setAlertMsg({ type: 'error', text: humanizeError(err, 'การบันทึกข้อมูลเช็คชื่อลงคลังไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') });
    } finally {
      setIsAttImporting(false);
    }
  };

  const resetSingleForm = () => {
    setFormName('');
    setFormCode('');
    setFormLecturer('');
    setFormType('');
    setFormStartDate('');
    setFormEndDate('');
    setFormAcademicYearChoice('auto');
    setFormHours('');
    setFormBudget('');
    setFormActual('');
    setFormTarget('');
    setFormParticipants('');
    setFormRespondents('');
    setFormSatisfaction('');
    setFormKuList([]);
    setFormSdgs([]);
    setFormPlos([]);
    setFormSoftSkill('');
    setFormStrategies([]);
    setFormRemarks('');
  };

  // ─── Single Form Submit ─────────────────────────────────────────────────────
  
  // ─── Daily KPI Manager Handlers ─────────────────────────────────────────────
  const fetchProjectKpis = async (projectId: number) => {
    setIsLoadingKpis(true);
    try {
      const res = await fetch(`/api/etl/kpi?activityKey=${projectId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (Array.isArray(data.rows) && data.rows.length > 0) {
        setManageKpiRows(data.rows.map((r: { evaluation_type?: "ALL" | "DAILY"; date?: string; respondent_count?: number; eligible_count?: number; avg_satisfaction_score?: number }, idx: number) => ({
          id: `kpi-fetched-${idx}`,
          scope: r.evaluation_type || 'DAILY',
          date: r.date || '',
          respondents: r.respondent_count ?? '',
          eligible: r.eligible_count ?? '',
          score: r.avg_satisfaction_score ?? '',
        })));
      } else {
        const targetProj = warehouseProjects.find((p) => p.id === projectId);
        setManageKpiRows([
          {
            id: 'kpi-new-1',
            scope: 'DAILY',
            date: targetProj?.startDate || '',
            respondents: targetProj?.respondents || '',
            eligible: targetProj?.participants || '',
            score: targetProj?.satisfaction || '',
          },
        ]);
      }
    } catch (err) {
      setAlertMsg({ type: 'error', text: humanizeError(err, 'ไม่สามารถโหลดข้อมูลผลประเมินของโครงการได้') });
    } finally {
      setIsLoadingKpis(false);
    }
  };

  const handleSaveDailyKpis = async () => {
    if (!manageKpiProjectId) {
      setAlertMsg({ type: 'error', text: 'กรุณาเลือกโครงการที่ต้องการบันทึกผลประเมิน' });
      return;
    }
    const targetProj = warehouseProjects.find((p) => p.id === manageKpiProjectId);
    if (!targetProj) return;

    const validRows = manageKpiRows.filter((r) => r.score !== '' || r.respondents !== '');
    if (validRows.length === 0) {
      setAlertMsg({ type: 'error', text: 'กรุณากรอกข้อมูลผลประเมินอย่างน้อย 1 รายการ หรือใส่วันที่และคะแนนให้ครบถ้วน' });
      return;
    }

    // Format records for POST /api/etl/kpi
    const records = validRows.map((r) => {
      if (validRows.length === 1 && (r.scope === 'ALL' || !r.date)) {
        return {
          evaluation_type: 'ALL',
          date: null,
          respondent_count: r.respondents === '' ? null : Number(r.respondents),
          eligible_count: r.eligible === '' ? (targetProj.participants || null) : Number(r.eligible),
          avg_satisfaction_score: r.score === '' ? null : Number(r.score),
        };
      }
      return {
        evaluation_type: 'DAILY',
        date: r.date || targetProj.startDate,
        respondent_count: r.respondents === '' ? null : Number(r.respondents),
        eligible_count: r.eligible === '' ? (targetProj.participants || null) : Number(r.eligible),
        avg_satisfaction_score: r.score === '' ? null : Number(r.score),
      };
    });

    setIsSavingKpis(true);
    setAlertMsg(null);
    try {
      const res = await fetch('/api/etl/kpi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityKey: manageKpiProjectId,
          records,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAlertMsg({
        type: 'success',
        text: `✅ บันทึกผลประเมิน KPI สำหรับโครงการ "${targetProj.name}" สำเร็จ (${records.length} รายการ)! แดชบอร์ดจะอัปเดตสถิติความพึงพอใจทันที`,
      });
      fetchWarehouseRecords();
    } catch (err) {
      setAlertMsg({ type: 'error', text: humanizeError(err, 'บันทึกผลประเมินรายวันไม่สำเร็จ') });
    } finally {
      setIsSavingKpis(false);
    }
  };

  const handleSingleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setAlertMsg({ type: 'error', text: 'กรุณาระบุชื่อโครงการ' });
      return;
    }

    if (!formType || !formStartDate || formKuList.length === 0) {
      setAlertMsg({ type: 'error', text: 'กรุณาเลือกหมวดหมู่กิจกรรม วันที่เริ่ม และอัตลักษณ์นิสิตอย่างน้อย 1 ข้อ' });
      return;
    }
    if (!isIsoDate(formStartDate) || (formEndDate && (!isIsoDate(formEndDate) || formEndDate < formStartDate))) {
      setAlertMsg({ type: 'error', text: 'วันที่สิ้นสุดต้องเป็นวันเดียวกับหรือหลังวันเริ่มโครงการ' });
      return;
    }

    setIsImporting(true);
    setAlertMsg(null);

    const dateCtx = deriveDateContext(formStartDate);
    const academicYear = formAcademicYearChoice === 'auto' ? dateCtx.academicYearBE : Number(formAcademicYearChoice);
    const semester = dateCtx.semester;
    const fiscalYear = dateCtx.fiscalYearBE;

    const singleRecord: CleansedRecord = {
      tempId: `single-${Date.now()}`,
      rowNumber: 1,
      code: formCode || '-',
      name: formName,
      lecturer: formLecturer,
      type: formType,
      budget: Number(formBudget),
      actual: Number(formActual),
      target: Number(formTarget),
      participants: Number(formParticipants),
      respondents: Number(formRespondents),
      respondentsKnown: String(formRespondents).trim() !== '',
      evalRate: Number(formParticipants) > 0 ? Math.round((Number(formRespondents) / Number(formParticipants)) * 1000) / 10 : 0,
      satisfaction: (() => {
        const satTrim = String(formSatisfaction).trim();
        if (satTrim === '-' || satTrim === '—' || satTrim === '' || satTrim.toLowerCase() === 'n/a' || satTrim === '0') {
          return 0;
        }
        const parsed = parseFloat(satTrim);
        return isNaN(parsed) ? 0 : Math.max(0, Math.min(5, Math.round(parsed * 100) / 100));
      })(),
      hours: Number(formHours),
      startDate: formStartDate,
      endDate: formEndDate || formStartDate,
      academicYear,
      semester,
      fiscalYear,
      sdg: formSdgs.length > 0,
      sdgList: formSdgs,
      ku: formKuList[0],
      kuList: formKuList,
      plo: formPlos,
      softSkills: [],
      softSkill: formSoftSkill || undefined,
      strategy3: formStrategies.includes(3),
      strategySubs: formStrategies,
      remarks: formRemarks,
      issues: [],
      status: 'valid',
    };

    try {
      const res = await fetch('/api/etl/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: [singleRecord] }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAlertMsg({
        type: 'success',
        text: `✅ บันทึกโครงการ "${formName}" เข้าสู่คลังข้อมูลเรียบร้อยแล้ว!`,
      });
      resetSingleForm();
      fetchWarehouseRecords();
    } catch (err: unknown) {
      setAlertMsg({ type: 'error', text: humanizeError(err, 'บันทึกโครงการไม่สำเร็จ กรุณาตรวจสอบข้อมูลที่กรอก') });
    } finally {
      setIsImporting(false);
    }
  };

  const toggleSdg = (num: number) => {
    setFormSdgs((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num].sort((a, b) => a - b)
    );
  };

  const toggleKu = (id: KUIdentity) => {
    setFormKuList((prev) => {
      const next = prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id];
      return next;
    });
  };

  const togglePlo = (num: PLONumber) => {
    setFormPlos((prev) =>
      prev.includes(num) ? prev.filter((p) => p !== num) : [...prev, num].sort((a, b) => a - b)
    );
  };

  const filteredProjects = warehouseProjects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.lecturer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.container}>
      {/* Header Card */}
      <div className={styles.headerCard}>
        <div className={styles.headerLeft}>
          <div className={styles.badgeHeader}>จัดการข้อมูลโครงการ</div>
          <h1 className={styles.title}>นำเข้าและจัดการข้อมูล</h1>
          <p className={styles.subtitle}>
            เพิ่มข้อมูลโครงการและรายชื่อนิสิต เพื่อนำไปสรุปผลในแดชบอร์ด
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnOutline} onClick={handleDownloadTemplate}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            ดาวน์โหลดเทมเพลตมาตรฐาน (.xlsx)
          </button>
        </div>
      </div>

      {/* Alert Notification */}
      {alertMsg && (
        <div className={alertMsg.type === 'success' ? styles.alertSuccess : styles.alertError}>
          <span>{alertMsg.text}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className={styles.tabNav}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'bulk' ? styles.active : ''}`}
          onClick={() => setActiveTab('bulk')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          นำเข้าโครงการด้วย Excel
        </button>

        <button
          className={`${styles.tabBtn} ${activeTab === 'attendance' ? styles.active : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          เช็กชื่อและรายชื่อนิสิต
        </button>

        <button
          className={`${styles.tabBtn} ${activeTab === 'form' ? styles.active : ''}`}
          onClick={() => setActiveTab('form')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          กรอกโครงการรายรายการ
        </button>

        <button
          className={`${styles.tabBtn} ${activeTab === 'records' ? styles.active : ''}`}
          onClick={() => setActiveTab('records')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          </svg>
          ทะเบียนคลังข้อมูล ({warehouseProjects.length})
        </button>
      </div>

      {/* ─── TAB 1: BULK EXCEL ETL IMPORT ────────────────────────────────────── */}
      {activeTab === 'bulk' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className={styles.templateBanner}>
            <div className={styles.templateText}>
              <h3>Smart Excel Template: เทมเพลตมาตรฐานลดข้อผิดพลาด</h3>
              <p>
                ใช้เทมเพลตนี้เพื่อจัดรูปแบบข้อมูลให้ถูกต้อง ระบบจะแสดงผลตรวจสอบให้ทบทวนก่อนนำเข้า
              </p>
            </div>
            <button className={styles.btnOutline} onClick={handleDownloadTemplate}>
              ดาวน์โหลด Template (.xlsx)
            </button>
          </div>

          {!parseResult && (
            <div className={styles.dropzone}>
              <div className={styles.dropzoneIcon}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div className={styles.dropzoneTitle}>
                {isUploading ? 'กำลังประมวลผลและล้างข้อมูล (Transforming Data)...' : 'ลากไฟล์ Excel (.xlsx) มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์'}
              </div>
              <div className={styles.dropzoneHint}>
                รองรับไฟล์ตารางสรุปโครงการ (.xlsx, .xls) ตามโครงสร้างคลังข้อมูลภาควิชา
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className={styles.fileInput}
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <button className={styles.btnPrimary} disabled={isUploading}>
                {isUploading ? 'กำลังอ่านข้อมูล...' : 'เลือกไฟล์จากเครื่อง'}
              </button>
            </div>
          )}

          {parseResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>รายการทั้งหมดในไฟล์</span>
                  <span className={styles.statValue}>{parseResult.totalRows}</span>
                </div>
                <div className={`${styles.statCard} ${styles.valid}`}>
                  <span className={styles.statLabel}>สมบูรณ์พร้อมโหลด (Valid)</span>
                  <span className={styles.statValue} style={{ color: 'var(--ku-green)' }}>
                    {parseResult.validCount}
                  </span>
                </div>
                <div className={`${styles.statCard} ${styles.warning}`}>
                  <span className={styles.statLabel}>แก้ไขให้อัตโนมัติ (Warnings)</span>
                  <span className={styles.statValue} style={{ color: 'var(--ku-gold)' }}>
                    {parseResult.warningCount}
                  </span>
                </div>
                <div className={`${styles.statCard} ${styles.error}`}>
                  <span className={styles.statLabel}>พบข้อผิดพลาด (Errors)</span>
                  <span className={styles.statValue} style={{ color: 'var(--accent-crimson)' }}>
                    {parseResult.errorCount}
                  </span>
                </div>
              </div>

              {parseResult.summaryIssues.length > 0 && (
                <div className={styles.tableCard}>
                  <div className={styles.tableTitle}>
                    บันทึกการแปลงและล้างข้อมูล (Data Cleansing Audit Log)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {parseResult.summaryIssues.map((issue, idx) => (
                      <div
                        key={idx}
                        style={{
                          fontSize: '13px',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          background: issue.type === 'error' ? '#FEF2F2' : '#FFFBEB',
                          color: issue.type === 'error' ? '#991B1B' : '#92400E',
                          border: `1px solid ${issue.type === 'error' ? '#FECACA' : '#FDE68A'}`,
                        }}
                      >
                        <strong>แถวที่ {issue.row} ({issue.field}):</strong> {issue.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.tableCard}>
                <div className={styles.tableHeaderRow}>
                  <div className={styles.tableTitle}>
                    ตารางตรวจสอบความถูกต้องก่อนบันทึกจริง (Staging Preview)
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      className={styles.btnSecondary}
                      onClick={() => setParseResult(null)}
                      disabled={isImporting}
                    >
                      ยกเลิก / อัปโหลดใหม่
                    </button>
                    <button
                      className={styles.btnPrimary}
                      onClick={handleCommitLoad}
                      disabled={isImporting || parseResult.records.filter((r) => r.status !== 'error').length === 0}
                    >
                      {isImporting ? 'กำลังบันทึกลง Data Warehouse...' : 'ยืนยันนำเข้าข้อมูลลง Data Warehouse'}
                    </button>
                  </div>
                </div>

                <div className={styles.tableContainer}>
                  <table className={styles.previewTable}>
                    <thead>
                      <tr>
                        <th>สถานะ</th>
                        <th>รหัสกิจกรรม</th>
                        <th>ชื่อโครงการ</th>
                        <th>ประเภทกิจกรรม</th>
                        <th>วันที่จัด</th>
                        <th>งบอนุมัติ</th>
                        <th>งบใช้จริง</th>
                        <th>ผู้เข้าร่วม</th>
                        <th>ความพึงพอใจ</th>
                        <th>อัตลักษณ์ / SDGs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parseResult.records.map((rec) => (
                        <tr key={rec.tempId}>
                          <td>
                            <span className={`${styles.badgeStatus} ${styles[rec.status]}`}>
                              {rec.status === 'valid'
                                ? '✓ สมบูรณ์'
                                : rec.status === 'warning'
                                ? '⚠️ มีการแปลงค่า'
                                : '✕ ข้อผิดพลาด'}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'monospace' }}>{rec.code}</td>
                          <td style={{ fontWeight: 600 }}>{rec.name}</td>
                          <td>{rec.type.replace('กิจกรรม', '')}</td>
                          <td>
                            <div>{rec.startDate}</div>
                            <div style={{ fontSize: '11px', color: '#1E61F0', fontWeight: 600 }}>
                              ปี {rec.academicYear} ({rec.semester === 't1' ? 'ภาคต้น' : rec.semester === 't2' ? 'ภาคปลาย' : 'ภาคฤดูร้อน'})
                            </div>
                          </td>
                          <td>฿{rec.budget.toLocaleString()}</td>
                          <td>฿{rec.actual.toLocaleString()}</td>
                          <td>{rec.participants} คน</td>
                          <td style={{ fontWeight: 700, color: rec.satisfaction >= 4.0 ? 'var(--ku-green)' : rec.satisfaction > 0 ? 'inherit' : 'var(--text-muted)' }}>
                            {rec.satisfaction > 0 ? `★ ${rec.satisfaction.toFixed(2)}` : <span style={{ color: '#94A3B8', fontWeight: 500 }}>-</span>}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <span style={{ padding: '2px 6px', background: '#E2E8F0', borderRadius: '4px', fontSize: '11px' }}>
                                KU: {rec.ku}
                              </span>
                              {rec.sdgList.length > 0 && (
                                <span style={{ padding: '2px 6px', background: '#EFF6FF', color: '#1E61F0', borderRadius: '4px', fontSize: '11px' }}>
                                  SDG {rec.sdgList.join(', ')}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: STUDENT ATTENDANCE ETL ───────────────────────────────────── */}
      {activeTab === 'attendance' && (
        <div aria-busy={isAttImporting || isAttParsing} style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
          {/* Target Project Selection */}
          <div className={styles.formCard}>
            <div className={styles.sectionHeading} style={{ marginBottom: '16px' }}>
              <div className={styles.sectionNumber}>1</div>
              <span>เลือกโครงการเป้าหมายที่ต้องการนำเข้าข้อมูลการเข้าร่วม</span>
            </div>
            <div className={styles.formGrid}>
              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label className={styles.formLabel} htmlFor="attendance-project">โครงการเป้าหมาย *</label>
                <select
                  id="attendance-project"
                  disabled={isAttImporting || isAttParsing}
                  className={styles.formSelect}
                  value={attProjectId}
                  onChange={(e) => {
                    const id = e.target.value === '' ? '' : Number(e.target.value);
                    setAttProjectId(id);
                    setAttCheckDate(warehouseProjects.find((p) => p.id === id)?.startDate ?? '');
                    setAttParseResult(null);
                    setAttSummary(null);
                    setAlertMsg(null);
                  }}
                >
                  <option value="">กรุณาเลือกโครงการ</option>
                  {warehouseProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.code || '-'}] {p.name} (ผู้เข้าร่วมปัจจุบัน: {p.participants} คน / เป้าหมาย {p.target} คน)
                    </option>
                  ))}
                </select>
                <span className={styles.formHint}>
                  เมื่อนำเข้ารายชื่อ ระบบจะแมปนักศึกษาลงตาราง fact_participant และอัปเดตยอดผู้เข้าร่วมโครงการให้อัตโนมัติ
                </span>

                {(() => {
                  const targetProj = warehouseProjects.find((p) => p.id === attProjectId);
                  if (!targetProj) return null;
                  const pYear = targetProj.academicYear || 2568;
                  const cohorts = getDynamicCohortList(pYear);
                  return (
                    <div style={{ marginTop: '12px', padding: '12px 16px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                          🎓 โครงการนี้สังกัดปีการศึกษา {pYear} ({targetProj?.semester === 't1' ? 'ภาคต้น' : targetProj?.semester === 't2' ? 'ภาคปลาย' : 'ภาคฤดูร้อน'})
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748B' }}>
                          วันที่จัด: {targetProj.startDate || '-'} ถึง {targetProj.endDate || targetProj.startDate || '-'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {cohorts.map((c) => (
                          <span
                            key={c.code}
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              borderLeft: `3px solid ${c.color}`,
                            }}
                          >
                            <strong>{c.yearLabel}</strong> = รหัส {c.code}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="attendance-date" className={styles.formLabel}>วันที่เช็คชื่อ *</label>
                <input id="attendance-date" type="date" className={styles.formInput} value={attCheckDate}
                  min={warehouseProjects.find((p) => p.id === attProjectId)?.startDate || undefined}
                  max={warehouseProjects.find((p) => p.id === attProjectId)?.endDate || undefined}
                  disabled={!attProjectId || isAttImporting || isAttParsing}
                  onChange={(e) => { setAttCheckDate(e.target.value); setAttParseResult(null); }} />
                <span className={styles.formHint}>งานหลายวันให้นำเข้าแยกแต่ละวัน คนเดิมที่มาหลายวันจะนับเป็นคนไม่ซ้ำ 1 คน</span>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="attendance-session" className={styles.formLabel}>ช่วงเวลาเช็คชื่อ</label>
                <select id="attendance-session" className={styles.formSelect} value={attSessionType}
                  disabled={isAttImporting || isAttParsing}
                  onChange={(e) => { setAttSessionType(e.target.value as SessionType); setAttParseResult(null); setAttBatchStatus(''); }}>
                  <option value="SPLIT_SESSION">แบ่งช่วงเช้า–บ่าย</option>
                  <option value="SINGLE_SESSION">ช่วงเดียว / ทั้งวัน</option>
                </select>
              </div>
              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="attendance-import-mode" className={styles.formLabel}>วิธีบันทึกรายชื่อของวันที่เลือก</label>
                <select id="attendance-import-mode" className={styles.formSelect} value={attImportMode}
                  disabled={isAttImporting || isAttParsing}
                  onChange={(e) => { setAttImportMode(e.target.value as AttendanceImportMode); setAttParseResult(null); }}>
                  <option value="merge">เพิ่ม / แก้รายคน — เก็บคนอื่นในวันเดิมไว้</option>
                  <option value="replace">แทนที่ทั้งวัน — ใช้รายชื่อชุดนี้แทนรายการทั้งหมดของวันนั้น</option>
                </select>
                <span className={styles.formHint}>
                  {attImportMode === 'replace' ? 'รายชื่อเดิมของวันที่เลือกที่ไม่อยู่ในไฟล์ใหม่จะถูกนำออก โดยไม่กระทบวันอื่น'
                    : 'รหัสที่ส่งซ้ำจะใช้สถานะล่าสุดที่ยืนยันบันทึก คนที่ไม่ได้ส่งมาจะคงเดิม'}
                </span>
              </div>
            </div>
          </div>

          {attSummary && attSummary.days.length > 0 && (
            <div className={styles.tableCard}>
              <div className={styles.tableTitle}>สรุปเช็คชื่อสะสมของโครงการ</div>
              <p style={{ padding: '0 20px', lineHeight: 1.7 }}>
                ผู้เข้าร่วมไม่ซ้ำ <strong>{attSummary.uniqueAttended}</strong> คน · เข้าร่วมรวม <strong>{attSummary.attendedPersonDays}</strong> คน-วัน · บันทึกแล้ว {attSummary.days.length} วัน
              </p>
              <div className={styles.tableContainer}>
                <table className={styles.previewTable}>
                  <thead><tr><th>วันที่</th><th>รายชื่อทั้งหมด</th><th>เข้าร่วม</th><th>ทั้งวัน</th><th>เฉพาะเช้า</th><th>เฉพาะบ่าย</th><th>ขาด / ลา</th></tr></thead>
                  <tbody>{attSummary.days.map((day) => (
                    <tr key={day.date}><td>{day.date}</td><td>{day.registered}</td><td>{day.attended}</td><td>{day.fullDay}</td><td>{day.morning}</td><td>{day.afternoon}</td><td>{day.absent}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          {/* Ingestion Mode Toggle */}
          <div className={styles.formCard}>
            <div className={styles.sectionHeading} style={{ marginBottom: '16px' }}>
              <div className={styles.sectionNumber}>2</div>
              <span>เลือกช่องทางการป้อนข้อมูลรายชื่อนิสิต</span>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <button
                type="button"
                className={attMode === 'paste' ? styles.btnPrimary : styles.btnOutline}
                onClick={() => { setAttMode('paste'); setAttParseResult(null); }}
                disabled={isAttImporting || isAttParsing}
              >
                📋 วางรหัสนิสิตด่วน (Quick Paste / Barcode Scan)
              </button>
              <button
                type="button"
                className={attMode === 'file' ? styles.btnPrimary : styles.btnOutline}
                onClick={() => { setAttMode('file'); setAttParseResult(null); }}
                disabled={isAttImporting || isAttParsing}
              >
                📁 อัปโหลดไฟล์ Excel / CSV เช็คชื่อ
              </button>
            </div>

            {attMode === 'paste' ? (
              <div className={styles.formGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <label className={styles.formLabel} style={{ marginBottom: 0 }}>
                    วางรหัสนิสิต (10 หลัก) — รหัสละ 1 บรรทัด (ไม่จำเป็นต้องระบุชื่อหรือพิมพ์สถานะ)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>สถานะเริ่มต้น:</span>
                    <select
                      className={styles.formSelect}
                      style={{ padding: '4px 10px', fontSize: '13px', width: 'auto', fontWeight: 600 }}
                      value={attBatchStatus}
                      disabled={isAttImporting || isAttParsing}
                      onChange={(e) => { setAttBatchStatus(e.target.value as AttendanceStatus); setAttParseResult(null); }}
                    >
                      <option value="">กรุณาเลือกสถานะ</option>
                      <option value="attended">✓ เข้าร่วมจริง (ทั้งวัน / ครบเวลา)</option>
                      <option value="morning" disabled={attSessionType === 'SINGLE_SESSION'}>☀️ เข้าเฉพาะช่วงเช้า (Morning Only)</option>
                      <option value="afternoon" disabled={attSessionType === 'SINGLE_SESSION'}>⛅ เข้าเฉพาะช่วงบ่าย (Afternoon Only)</option>
                      <option value="leave">📝 ลา / มีใบลา (On Leave)</option>
                      <option value="absent">✕ ขาด/ไม่มา (Absent)</option>
                    </select>
                  </div>
                </div>

                <textarea
                  rows={6}
                  className={styles.formTextarea}
                  value={attRawText}
                  disabled={isAttImporting || isAttParsing}
                  onChange={(e) => { setAttRawText(e.target.value); setAttParseResult(null); }}
                  placeholder="เช่น:&#10;6801000101&#10;6801000202 เช้า&#10;6701000303 บ่าย&#10;6601000404 ลา&#10;6501000505 ขาด"
                  style={{ fontFamily: 'monospace', fontSize: '13px' }}
                />
                <span className={styles.formHint} style={{ display: 'block', marginTop: '6px' }}>
                  💡 <strong>ความยืดหยุ่น:</strong> สามารถระบุช่วงเวลาต่อท้ายรหัสได้โดยตรง เช่น <code>6801000202 เช้า</code>, <code>6701000303 บ่าย</code>, <code>6601000404 ลา</code> หากไม่ระบุระบบจะอิงตาม &quot;สถานะเริ่มต้น&quot; (DW จัดเก็บเฉพาะรหัส 10 หลักตามมาตรฐาน PDPA)
                </span>
              </div>
            ) : (
              <div className={styles.dropzone} style={{ padding: '32px' }}>
                <div className={styles.dropzoneIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div className={styles.dropzoneTitle}>เลือกไฟล์ Excel รายชื่อนิสิต (.xlsx, .csv)</div>
                <div className={styles.dropzoneHint}>
                  ใช้ไฟล์ที่ดาวน์โหลดจาก Smart Template (แผ่นงาน &quot;เช็คชื่อนิสิตเข้าร่วม&quot;) หรือไฟล์รายชื่อทั่วไปที่มีคอลัมน์รหัสนิสิต
                </div>
                <input
                  ref={attFileInputRef}
                  disabled={isAttImporting || isAttParsing}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className={styles.fileInput}
                  onChange={() => setAttParseResult(null)}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={handleParseAttendance}
                disabled={isAttParsing || isAttImporting}
              >
                {isAttParsing ? 'กำลังประมวลผลรายชื่อ...' : 'ตรวจสอบและสกัดข้อมูลรุ่นปี (Extract Cohort)'}
              </button>
            </div>
          </div>

          {/* Attendance Parse Result Preview */}
          {attParseResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                ตรวจสอบก่อนบันทึกวันที่ <strong>{attCheckDate}</strong> · {attSessionType === 'SPLIT_SESSION' ? 'แบ่งช่วงเช้า–บ่าย' : 'ช่วงเดียว / ทั้งวัน'} · {attImportMode === 'replace' ? 'แทนที่รายชื่อทั้งวัน' : 'เพิ่ม / แก้รายคน'}
              </p>
              {attParseResult.summaryIssues.length > 0 && (
                <div className={styles.formCard} role="status">
                  <strong>{attParseResult.errorCount > 0 ? 'กรุณาแก้ข้อผิดพลาดในไฟล์แล้วตรวจสอบใหม่ก่อนบันทึก' : 'ข้อสังเกตจากการตรวจสอบ'}</strong>
                  <ul>{attParseResult.summaryIssues.map((issue, index) => <li key={index}>แถว {issue.row}: {issue.message}</li>)}</ul>
                </div>
              )}
              {/* Cohort Breakdown Cards */}
              <div className={styles.tableCard}>
                <div className={styles.tableTitle}>
                  สถิติการกระจายตัวตามชั้นปี (Cohort Distribution Breakdown)
                </div>
                <div className={styles.statsGrid}>
                  {Object.entries(attParseResult.cohortBreakdown).map(([cohortName, count]) => (
                    <div key={cohortName} className={styles.statCard}>
                      <span className={styles.statLabel}>{cohortName}</span>
                      <span className={styles.statValue} style={{ color: count > 0 ? '#1E61F0' : 'var(--text-muted)' }}>
                        {count} <span style={{ fontSize: '14px', fontWeight: 500 }}>คน</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attendance Table Preview */}
              <div className={styles.tableCard}>
                <div className={styles.tableHeaderRow}>
                  <div>
                    <div className={styles.tableTitle}>
                      รหัสนิสิตที่ผ่านการตรวจสอบ ({attParseResult.records.length} คน)
                    </div>
                    {/* Status Breakdown Pills */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#DCFCE7', color: '#166534', fontWeight: 600 }}>
                        ✓ ทั้งวัน: {attParseResult.statusBreakdown?.attended ?? attParseResult.records.filter(r => r.status === 'attended').length}
                      </span>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#E0F2FE', color: '#0369A1', fontWeight: 600 }}>
                        ☀️ เฉพาะเช้า: {attParseResult.statusBreakdown?.morning ?? attParseResult.records.filter(r => r.status === 'morning').length}
                      </span>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#FEF3C7', color: '#92400E', fontWeight: 600 }}>
                        ⛅ เฉพาะบ่าย: {attParseResult.statusBreakdown?.afternoon ?? attParseResult.records.filter(r => r.status === 'afternoon').length}
                      </span>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#F1F5F9', color: '#475569', fontWeight: 600 }}>
                        📝 ลา: {attParseResult.statusBreakdown?.leave ?? attParseResult.records.filter(r => r.status === 'leave').length}
                      </span>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#FEE2E2', color: '#991B1B', fontWeight: 600 }}>
                        ✕ ขาด: {attParseResult.statusBreakdown?.absent ?? attParseResult.records.filter(r => r.status === 'absent').length}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <button
                      className={styles.btnSecondary}
                      onClick={() => setAttParseResult(null)}
                      disabled={isAttImporting}
                    >
                      ยกเลิก
                    </button>
                    <button
                      className={styles.btnPrimary}
                      onClick={handleCommitAttendance}
                      disabled={isAttImporting || attParseResult.errorCount > 0 || attParseResult.records.length === 0}
                    >
                      {isAttImporting ? 'กำลังบันทึกลง Data Warehouse...' : 'ยืนยันบันทึกการเข้าร่วมนิสิตลง Data Warehouse'}
                    </button>
                  </div>
                </div>

                <div className={styles.tableContainer}>
                  <table className={styles.previewTable}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>รหัสนิสิต (10 หลัก)</th>
                        <th>รุ่นปี / ชั้นปี</th>
                        <th>สถานะและช่วงเวลาเข้าร่วม</th>
                        <th>โครงการเป้าหมาย</th>
                        <th>คะแนนประเมิน</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attParseResult.records.map((r, idx) => (
                        <tr key={r.tempId}>
                          <td>{idx + 1}</td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.studentId}</td>
                          <td>
                            <span style={{ padding: '2px 8px', background: '#EFF6FF', color: '#1E61F0', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                              ปี {r.studyYear} (รุ่น {r.cohort})
                            </span>
                          </td>
                          <td>
                            <select
                              value={r.status}
                              disabled={isAttImporting || isAttParsing}
                              onChange={(e) => handleSetRecordStatus(r.tempId, e.target.value as AttendanceStatus)}
                              style={{
                                cursor: 'pointer',
                                border: '1px solid',
                                borderColor:
                                  r.status === 'attended'
                                    ? '#86EFAC'
                                    : r.status === 'morning'
                                    ? '#7DD3FC'
                                    : r.status === 'afternoon'
                                    ? '#FCD34D'
                                    : r.status === 'leave'
                                    ? '#CBD5E1'
                                    : r.status === 'absent'
                                    ? '#FCA5A5'
                                    : '#E2E8F0',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                background:
                                  r.status === 'attended'
                                    ? '#DCFCE7'
                                    : r.status === 'morning'
                                    ? '#E0F2FE'
                                    : r.status === 'afternoon'
                                    ? '#FEF3C7'
                                    : r.status === 'leave'
                                    ? '#F1F5F9'
                                    : r.status === 'absent'
                                    ? '#FEE2E2'
                                    : '#F8FAFC',
                                color:
                                  r.status === 'attended'
                                    ? '#166534'
                                    : r.status === 'morning'
                                    ? '#0369A1'
                                    : r.status === 'afternoon'
                                    ? '#92400E'
                                    : r.status === 'leave'
                                    ? '#475569'
                                    : r.status === 'absent'
                                    ? '#991B1B'
                                    : '#64748B',
                                outline: 'none',
                              }}
                            >
                              <option value="attended">✓ เข้าร่วมจริง (ทั้งวัน)</option>
                              <option value="morning" disabled={attSessionType === 'SINGLE_SESSION'}>☀️ เข้าเฉพาะช่วงเช้า</option>
                              <option value="afternoon" disabled={attSessionType === 'SINGLE_SESSION'}>⛅ เข้าเฉพาะช่วงบ่าย</option>
                              <option value="leave">📝 ลา (มีใบลา)</option>
                              <option value="absent">✕ ขาด / ไม่มา</option>
                            </select>
                          </td>
                          <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {warehouseProjects.find((p) => p.id === attProjectId)?.name || r.projectCodeOrName}
                          </td>
                          <td>{r.satisfactionScore ? `★ ${r.satisfactionScore}` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: SINGLE PROJECT ENTRY FORM ────────────────────────────────── */}
      {activeTab === 'form' && (
        <form className={styles.formCard} onSubmit={handleSingleFormSubmit}>
<nav className={styles.formNavigation} aria-label="หมวดแบบฟอร์ม"><a href="#project-form-section-1">1. ข้อมูลโครงการ</a><a href="#project-form-section-2">2. วันเวลาและงบประมาณ</a><a href="#project-form-section-3">3. ผู้เข้าร่วมและผลประเมิน</a><a href="#project-form-section-4">4. ยุทธศาสตร์</a></nav>

          <div id="project-form-section-1" className={styles.formSection}>
            <div className={styles.sectionHeading}>
              <div className={styles.sectionNumber}>1</div>
              <span>ข้อมูลพื้นฐานของโครงการ</span>
            </div>
            <div className={styles.entryGrid}>
              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label className={styles.formLabel}>ชื่อโครงการ / กิจกรรม *</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="เช่น โครงการเสริมสร้างทักษะ AI สำหรับวิศวกรคอมพิวเตอร์"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>รหัสกิจกรรม (12 หลัก)</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="เช่น 268020030315 หรือใส่ -"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                />
                <span className={styles.formHint}>หากไม่มีรหัสกิจกรรม ให้เว้นว่างหรือใส่เครื่องหมาย -</span>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>อาจารย์ผู้รับผิดชอบ *</label>
                <input
                  type="text"
                  className={styles.formInput}
                  list="lecturers-datalist"
                  placeholder="พิมพ์ค้นหา หรือเลือกจากรายชื่ออาจารย์ประจำภาควิชา"
                  value={formLecturer}
                  onChange={(e) => setFormLecturer(e.target.value)}
                  required
                />
                <datalist id="lecturers-datalist">
                  {KNOWN_LECTURERS.map((lec) => (
                    <option key={lec} value={lec} />
                  ))}
                </datalist>
                <span className={styles.formHint}>สามารถเลือกจากรายชื่ออาจารย์ภาควิชา หรือพิมพ์ชื่อเพิ่มเองได้อิสระ</span>
              </div>

              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label className={styles.formLabel}>หมวดหมู่กิจกรรม *</label>
                <select
                  className={styles.formSelect}
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as ProjectType)}
                  required
                >
                  <option value="">กรุณาเลือกหมวดหมู่กิจกรรม</option>
                  <option value="กิจกรรมวิชาการที่ส่งเสริมคุณลักษณะบัณฑิตที่พึงประสงค์">
                    กิจกรรมวิชาการที่ส่งเสริมคุณลักษณะบัณฑิตที่พึงประสงค์
                  </option>
                  <option value="กิจกรรมบำเพ็ญประโยชน์">กิจกรรมบำเพ็ญประโยชน์</option>
                  <option value="กิจกรรมกีฬาหรือส่งเสริมสุขภาพ">กิจกรรมกีฬาหรือส่งเสริมสุขภาพ</option>
                  <option value="กิจกรรมเสริมสร้างศิลปะและวัฒนธรรม">กิจกรรมเสริมสร้างศิลปะและวัฒนธรรม</option>
                  <option value="กิจกรรมส่งเสริมการรักษาสิ่งแวดล้อม">กิจกรรมส่งเสริมการรักษาสิ่งแวดล้อม</option>
                  <option value="กิจกรรมเสริมสร้างคุณธรรมและจริยธรรม">กิจกรรมเสริมสร้างคุณธรรมและจริยธรรม</option>
                  <option value="พัฒนาหลักสูตร">พัฒนาหลักสูตร</option>
                </select>
              </div>
            </div>
          </div>

          <div id="project-form-section-2" className={styles.formSection}>
            <div className={styles.sectionHeading}>
              <div className={styles.sectionNumber}>2</div>
              <span>วันเวลาและงบประมาณ</span>
            </div>
            <div className={styles.dateFields}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>วันที่เริ่มจัดกิจกรรม *</label>
                <input
                  type="date"
                  className={styles.formInput}
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>วันที่สิ้นสุดกิจกรรม</label>
                <input
                  type="date"
                  className={styles.formInput}
                  value={formEndDate}
                  min={formStartDate || undefined}
                  onChange={(e) => setFormEndDate(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>จำนวนชั่วโมงกิจกรรม (ชั่วโมง)</label>
                <input
                  type="number"
                  step="0.5"
                  className={styles.formInput}
                  value={formHours}
                  onChange={(e) => setFormHours(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>

            </div>
            <div className={styles.entryGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>งบประมาณที่ได้รับอนุมัติ (บาท) *</label>
                <input
                  type="number"
                  className={styles.formInput}
                  value={formBudget}
                  onChange={(e) => setFormBudget(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>งบประมาณที่ใช้จริง (บาท) *</label>
                <input
                  type="number"
                  className={styles.formInput}
                  value={formActual}
                  onChange={(e) => setFormActual(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                />
              </div>

              {/* Date & Academic Year Intelligence Card */}
              {(() => {
                if (!formStartDate) return <p className={styles.fullWidthHint}>เลือกวันที่เริ่มกิจกรรมเพื่อคำนวณปีการศึกษา ภาคเรียน และปีงบประมาณ</p>;
                const dateCtx = deriveDateContext(formStartDate);
                const effectiveYear = formAcademicYearChoice === 'auto' ? dateCtx.academicYearBE : Number(formAcademicYearChoice);
                const cohorts = getDynamicCohortList(effectiveYear);

                return (
                  <div className={styles.intelCard}>
                    <div className={styles.intelHeader}>
                      <div className={styles.intelTitle}>
                        <span>ปีการศึกษาและช่วงเวลาของกิจกรรม</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>กำหนดปีการศึกษา:</span>
                        <select
                          className={styles.formSelect}
                          style={{ padding: '4px 10px', fontSize: '13px', width: 'auto' }}
                          value={formAcademicYearChoice}
                          onChange={(e) => setFormAcademicYearChoice(e.target.value === 'auto' ? 'auto' : Number(e.target.value))}
                        >
                          <option value="auto">คำนวณอัตโนมัติตามวันที่ (ปีการศึกษา {dateCtx.academicYearBE})</option>
                          <option value="2567">ปีการศึกษา 2567</option>
                          <option value="2568">ปีการศึกษา 2568</option>
                          <option value="2569">ปีการศึกษา 2569</option>
                          <option value="2570">ปีการศึกษา 2570</option>
                          <option value="2571">ปีการศึกษา 2571</option>
                        </select>
                      </div>
                    </div>

                    <div className={styles.intelGrid}>
                      <div className={styles.intelItem}>
                        <span className={styles.intelLabel}>ปีปฏิทิน (พ.ศ.)</span>
                        <div className={styles.intelValue}>
                          <span>{dateCtx.calendarYearBE}</span>
                          <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 400 }}>(ค.ศ. {dateCtx.calendarYearCE})</span>
                        </div>
                      </div>

                      <div className={styles.intelItem} style={{ borderLeft: '3px solid #1E61F0' }}>
                        <span className={styles.intelLabel}>ปีการศึกษา มก.</span>
                        <div className={styles.intelValue} style={{ color: '#1E61F0' }}>
                          <span>ปีการศึกษา {effectiveYear}</span>
                          <span className={styles.intelTag}>{dateCtx.semesterLabel}</span>
                        </div>
                      </div>

                      <div className={styles.intelItem}>
                        <span className={styles.intelLabel}>ปีงบประมาณ</span>
                        <div className={styles.intelValue}>
                          <span>ปีงบประมาณ {dateCtx.fiscalYearBE}</span>
                        </div>
                      </div>

                      <div className={styles.intelItem}>
                        <span className={styles.intelLabel}>นิสิตปี 1 ณ ขณะจัดงาน</span>
                        <div className={styles.intelValue} style={{ color: '#0D9488' }}>
                          <span>รุ่นปี {effectiveYear % 100}</span>
                          <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 400 }}>({effectiveYear})</span>
                        </div>
                      </div>
                    </div>

                    {dateCtx.isDifferentFromCalendarYear && (
                      <div className={styles.intelNotice}>
                        <span style={{ fontSize: '16px' }}>💡</span>
                        <div>
                          <strong>ข้อสังเกตหลักการนับปี:</strong> วันที่ {dateCtx.day}/{dateCtx.month}/{dateCtx.calendarYearBE} อยู่ในปีปฏิทิน <strong>{dateCtx.calendarYearBE}</strong> แต่จัดในช่วง{dateCtx.semesterLabel} จึงนับเป็น <strong>ปีการศึกษา {dateCtx.academicYearBE}</strong> (ไม่ใช่ปีการศึกษา {dateCtx.calendarYearBE}) โดยนิสิตรหัส {dateCtx.calendarYearBE % 100} จะเริ่มเข้าศึกษาในภาคต้น (มิ.ย. {dateCtx.calendarYearBE})
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                        โครงสร้างชั้นปีนิสิตที่จะบันทึกการเข้าร่วมในปีการศึกษา {effectiveYear}:
                      </span>
                      <div className={styles.cohortSequence}>
                        {cohorts.map((c) => (
                          <span
                            key={c.code}
                            className={styles.cohortChip}
                            style={{ borderLeft: `3px solid ${c.color}` }}
                          >
                            <strong>{c.yearLabel}</strong>: รุ่น {c.code}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div id="project-form-section-3" className={styles.formSection}>
            <div className={styles.sectionHeading}>
              <div className={styles.sectionNumber}>3</div>
              <span>สถิติผู้เข้าร่วมและผลการประเมิน</span>
            </div>
            <div className={styles.entryGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>เป้าหมายผู้เข้าร่วม (คน) *</label>
                <input
                  type="number"
                  className={styles.formInput}
                  value={formTarget}
                  onChange={(e) => setFormTarget(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>จำนวนผู้เข้าร่วมจริง (คน) *</label>
                <input
                  type="number"
                  className={styles.formInput}
                  value={formParticipants}
                  onChange={(e) => setFormParticipants(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                />
              </div>

              <div style={{ gridColumn: '1 / -1', marginTop: '12px', borderTop: '1px dashed #E2E8F0', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#0F172A' }}>
                      ผลประเมินความพึงพอใจและ KPI (แบบภาพรวมทั้งโครงการ หรือ รายวัน)
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                      หากมีผลประเมินครั้งเดียว ให้เลือก &quot;ภาพรวม (ALL)&quot; หากมีประเมินแยกวัน ให้กดปุ่ม &quot;+ เพิ่มวันประเมิน&quot; (กดบวกๆๆ)
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFormKpiList((prev) => [
                        ...prev,
                        {
                          id: `kpi-${Date.now()}-${prev.length + 1}`,
                          scope: 'DAILY',
                          date: formStartDate || '',
                          respondents: '',
                          eligible: formParticipants || '',
                          score: '',
                        },
                      ]);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#EFF6FF',
                      color: '#1E61F0',
                      border: '1px solid #BFDBFE',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    + เพิ่มวันประเมิน (Daily KPI)
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {formKpiList.map((item, idx) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '150px 150px 130px 130px 140px 40px',
                        gap: '10px',
                        alignItems: 'center',
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        padding: '10px 12px',
                        borderRadius: '8px',
                      }}
                    >
                      <div>
                        <label style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '3px' }}>
                          รูปแบบ {idx + 1}
                        </label>
                        <select
                          className={styles.formInput}
                          style={{ padding: '6px 8px', fontSize: '12px', height: '34px' }}
                          value={item.scope}
                          onChange={(e) => {
                            const newScope = e.target.value as 'ALL' | 'DAILY';
                            setFormKpiList((prev) =>
                              prev.map((k) => (k.id === item.id ? { ...k, scope: newScope, date: newScope === 'ALL' ? '' : (k.date || formStartDate) } : k))
                            );
                          }}
                        >
                          <option value="ALL">ภาพรวม (ALL)</option>
                          <option value="DAILY">รายวัน (DAILY)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '3px' }}>
                          วันที่ประเมิน
                        </label>
                        <input
                          type="date"
                          className={styles.formInput}
                          style={{ padding: '4px 8px', fontSize: '12px', height: '34px' }}
                          value={item.date}
                          min={formStartDate || undefined}
                          max={formEndDate || formStartDate || undefined}
                          disabled={item.scope === 'ALL'}
                          onChange={(e) => {
                            setFormKpiList((prev) =>
                              prev.map((k) => (k.id === item.id ? { ...k, date: e.target.value } : k))
                            );
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '3px' }}>
                          จำนวนผู้ตอบ (คน)
                        </label>
                        <input
                          type="number"
                          placeholder="เช่น 45"
                          className={styles.formInput}
                          style={{ padding: '4px 8px', fontSize: '12px', height: '34px' }}
                          value={item.respondents}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Number(e.target.value);
                            setFormKpiList((prev) =>
                              prev.map((k) => (k.id === item.id ? { ...k, respondents: val } : k))
                            );
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '3px' }}>
                          ผู้มีสิทธิ์ (คน)
                        </label>
                        <input
                          type="number"
                          placeholder="เช่น 50"
                          className={styles.formInput}
                          style={{ padding: '4px 8px', fontSize: '12px', height: '34px' }}
                          value={item.eligible}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Number(e.target.value);
                            setFormKpiList((prev) =>
                              prev.map((k) => (k.id === item.id ? { ...k, eligible: val } : k))
                            );
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '3px' }}>
                          คะแนน (1.00 - 5.00)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          max="5"
                          placeholder="เช่น 4.50"
                          className={styles.formInput}
                          style={{ padding: '4px 8px', fontSize: '12px', height: '34px' }}
                          value={item.score}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Number(e.target.value);
                            setFormKpiList((prev) =>
                              prev.map((k) => (k.id === item.id ? { ...k, score: val } : k))
                            );
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%', paddingBottom: '2px' }}>
                        {formKpiList.length > 1 && (
                          <button
                            type="button"
                            title="ลบวันประเมินนี้"
                            onClick={() => {
                              setFormKpiList((prev) => prev.filter((k) => k.id !== item.id));
                            }}
                            style={{
                              background: '#FEE2E2',
                              color: '#DC2626',
                              border: 'none',
                              borderRadius: '4px',
                              width: '32px',
                              height: '34px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 'bold',
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Live KPI Summary Pills */}
                {(() => {
                  const validRows = formKpiList.filter((k) => k.score !== '' || k.respondents !== '');
                  if (validRows.length === 0) return null;
                  let totalResp = 0;
                  let totalElig = 0;
                  let weightedSum = 0;
                  validRows.forEach((r) => {
                    const resp = Number(r.respondents) || 0;
                    const elig = Number(r.eligible) || Number(formParticipants) || 0;
                    const score = Number(r.score) || 0;
                    totalResp += resp;
                    totalElig += elig;
                    weightedSum += resp * score;
                  });
                  const avgScore = totalResp > 0 ? (weightedSum / totalResp).toFixed(2) : '-';
                  const rate = totalElig > 0 ? ((totalResp / totalElig) * 100).toFixed(1) + '%' : '-';
                  return (
                    <div style={{ display: 'flex', gap: '12px', marginTop: '10px', padding: '8px 12px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '6px', fontSize: '13px', color: '#166534', flexWrap: 'wrap' }}>
                      <span>📊 <strong>สรุปผลประเมินคำนวณสด:</strong></span>
                      <span>ผู้ตอบรวม: <strong>{totalResp} คน</strong></span>
                      <span>อัตราตอบแบบประเมิน: <strong>{rate}</strong></span>
                      <span>คะแนนเฉลี่ยถ่วงน้ำหนัก: <strong>{avgScore} / 5.00</strong></span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          <div id="project-form-section-4" className={styles.formSection}>
            <div className={styles.sectionHeading}>
              <div className={styles.sectionNumber}>4</div>
              <span>ความสอดคล้องเชิงยุทธศาสตร์</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {/* KU Identity Cards */}
              <div>
                <label className={styles.formLabel} style={{ marginBottom: '4px', display: 'block' }}>
                  อัตลักษณ์นิสิต (KU Identity) * — เลือกได้หลายข้อ
                </label>
                <div className={styles.kuCardGrid}>
                  {[
                    { id: 'I' as KUIdentity, letter: 'I', name: 'ซื่อสัตย์และรับผิดชอบ', desc: 'Integrity' },
                    { id: 'D' as KUIdentity, letter: 'D', name: 'มุ่งมั่นและพากเพียร', desc: 'Determination' },
                    { id: 'K' as KUIdentity, letter: 'K', name: 'สร้างสรรค์องค์ความรู้', desc: 'Knowledge Creation' },
                    { id: 'U' as KUIdentity, letter: 'U', name: 'ความเป็นหนึ่งเดียว', desc: 'Unity' },
                  ].map((item) => {
                    const isSelected = formKuList.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`${styles.kuCard} ${isSelected ? styles.kuSelected : ''}`}
                        onClick={() => toggleKu(item.id)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className={styles.kuAvatar}>{item.letter}</div>
                        <div className={styles.kuInfo}>
                          <span className={styles.kuName}>{item.name}</span>
                          <span className={styles.kuDesc}>{item.desc}</span>
                        </div>
                        <div className={styles.kuIndicator}>
                          {isSelected ? '✓' : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SDGs Selection Chips */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <label className={styles.formLabel} style={{ marginBottom: 0 }}>
                    เป้าหมายการพัฒนาที่ยั่งยืน (SDGs) — เลือกแล้ว {formSdgs.length} ข้อ
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      style={{ fontSize: '12px', background: 'transparent', border: 'none', color: '#1E61F0', cursor: 'pointer', fontWeight: 600 }}
                      onClick={() => setFormSdgs([4, 8, 9, 10, 17])}
                    >
                      เลือกกลุ่มยอดนิยม (SDG 4, 8, 9, 10, 17)
                    </button>
                    <span style={{ color: '#CBD5E1' }}>|</span>
                    <button
                      type="button"
                      style={{ fontSize: '12px', background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}
                      onClick={() => setFormSdgs([])}
                    >
                      ล้างที่เลือก
                    </button>
                  </div>
                </div>

                <div className={styles.sdgGrid}>
                  {ALL_SDGS.map((sdg) => {
                    const isSelected = formSdgs.includes(sdg.num);
                    return (
                      <button
                        key={sdg.num}
                        type="button"
                        className={`${styles.selectChip} ${styles.sdgCard} ${isSelected ? styles.chipSelected : ''}`}
                        onClick={() => toggleSdg(sdg.num)}
                        aria-pressed={isSelected}
                      >
                        <span className={styles.chipPrefix}>SDG {sdg.num}</span>
                        <span>{sdg.label}</span>
                        <span className={styles.sdgIndicator} aria-hidden="true">
                          {isSelected ? '✓' : '+'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PLOs and Soft Skills */}
              <div className={styles.strategicFields}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>ผลลัพธ์การเรียนรู้ระดับหลักสูตร (PLO 1-4)</label>
                  <div className={styles.ploGrid}>
                    {[1, 2, 3, 4].map((num) => {
                      const p = getPloDefinition(num, ploDefs);
                      const isSelected = formPlos.includes(num as PLONumber);
                      return (
                        <div
                          key={num}
                          className={`${styles.ploTile} ${isSelected ? styles.ploSelected : ''}`}
                          onClick={() => togglePlo(num as PLONumber)}
                          role="button"
                          tabIndex={0}
                          title={p.detail}
                        >
                          <div className={styles.ploIndicator}>
                            {isSelected ? '✓' : ''}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 700 }}>{p.title}: {p.shortDesc}</span>
                            <span style={{ fontSize: '12px', color: isSelected ? 'var(--color-primary)' : 'var(--text-muted)', lineHeight: '1.35', marginTop: '2px' }}>
                              {p.detail}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>ทักษะ Soft Skill หลัก</label>
                  <select
                    className={styles.formSelect}
                    value={formSoftSkill}
                    onChange={(e) => setFormSoftSkill(e.target.value as SoftSkillArea)}
                  >
                    <option value="">กรุณาเลือกทักษะหลัก (ถ้ามี)</option>
                    <option value="การคิดแก้ปัญหา">การคิดแก้ปัญหา</option>
                    <option value="การบริหารตัวเอง">การบริหารตัวเอง</option>
                    <option value="การทำงานเป็นทีม">การทำงานเป็นทีม</option>
                    <option value="ความคิดสร้างสรรค์">ความคิดสร้างสรรค์</option>
                    <option value="การสื่อสาร">การสื่อสาร</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <label className={styles.formLabel} style={{ marginBottom: 0 }}>
                      เป้าหมายยุทธศาสตร์คณะวิศวกรรมศาสตร์ (เลือกได้หลายยุทธศาสตร์)
                    </label>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>
                      เลือกแล้ว {formStrategies.length} ยุทธศาสตร์
                    </span>
                  </div>

                  <div className={styles.strategyGrid}>
                    {FACULTY_STRATEGIES.map((strat) => {
                      const isSelected = formStrategies.includes(strat.num);
                      return (
                        <div
                          key={strat.num}
                          className={`${styles.strategyCard} ${isSelected ? styles.strategySelected : ''}`}
                          onClick={() => {
                            if (isSelected) {
                              setFormStrategies(formStrategies.filter((s) => s !== strat.num));
                            } else {
                              setFormStrategies([...formStrategies, strat.num].sort((a, b) => a - b));
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          style={{ padding: '10px 14px' }}
                        >
                          <div className={styles.strategyIndicator}>
                            {isSelected ? '✓' : ''}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {strat.title}
                            </span>
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                              {strat.desc}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>หมายเหตุเพิ่มเติม</label>
                  <textarea
                    rows={2}
                    className={styles.formTextarea}
                    placeholder="รายละเอียดเพิ่มเติมของกิจกรรมหรือการจัดงาน..."
                    value={formRemarks}
                    onChange={(e) => setFormRemarks(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.formActionsRow}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => { resetSingleForm(); setAlertMsg(null); }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              ล้างข้อมูลในฟอร์ม
            </button>
            <button
              type="submit"
              className={styles.btnPrimary}
              style={{ padding: '12px 28px', fontSize: '15px' }}
              disabled={isImporting}
            >
              {isImporting ? (
                'กำลังบันทึกลงคลังข้อมูล...'
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  บันทึกโครงการเข้าสู่คลังข้อมูล (Save to Warehouse)
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ─── TAB 4: WAREHOUSE RECORDS ────────────────────────────────────────── */}
      {activeTab === 'records' && (
        <div className={styles.tableCard}>
          <div className={styles.tableHeaderRow}>
            <div className={styles.tableTitle}>
              ทะเบียนโครงการทั้งหมดในคลังข้อมูล ({filteredProjects.length} โครงการ)
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                placeholder="ค้นหาชื่อโครงการ, รหัส หรืออาจารย์..."
                className={styles.formInput}
                style={{ width: '280px' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className={styles.btnOutline} onClick={fetchWarehouseRecords}>
                รีเฟรชข้อมูล
              </button>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => exportDashboardToExcel(warehouseProjects, { academicYear: 'all', exportType: 'projects-only' })}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                title="ส่งออกทะเบียนโครงการทั้งหมดในคลังข้อมูลเป็น Excel"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Export Excel (.xlsx)
              </button>
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.previewTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>รหัสกิจกรรม</th>
                  <th>ชื่อโครงการ</th>
                  <th>อาจารย์ผู้รับผิดชอบ</th>
                  <th>ปีการศึกษา</th>
                  <th>งบอนุมัติ</th>
                  <th>งบใช้จริง</th>
                  <th>ผู้เข้าร่วม</th>
                  <th>ความพึงพอใจ</th>
                  <th>อัตลักษณ์ / SDGs</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingRecords ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '30px' }}>
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                ) : filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      ไม่พบข้อมูลโครงการตามคำค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((proj, idx) => (
                    <tr key={proj.id || idx}>
                      <td>{idx + 1}</td>
                      <td style={{ fontFamily: 'monospace' }}>{proj.code}</td>
                      <td style={{ fontWeight: 600 }}>{proj.name}</td>
                      <td>{proj.lecturer}</td>
                      <td>
                        {proj.academicYear || 2568} / {proj.semester || 't1'}
                      </td>
                      <td>฿{proj.budget.toLocaleString()}</td>
                      <td>฿{proj.actual.toLocaleString()}</td>
                      <td>{proj.participants} คน</td>
                      <td style={{ fontWeight: 700, color: proj.satisfaction >= 4.0 ? 'var(--ku-green)' : proj.satisfaction > 0 ? 'inherit' : 'var(--text-muted)' }}>
                        {proj.satisfaction > 0 ? `★ ${proj.satisfaction.toFixed(2)}` : <span style={{ color: '#94A3B8', fontWeight: 500 }}>-</span>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <span style={{ padding: '2px 6px', background: '#E2E8F0', borderRadius: '4px', fontSize: '11px' }}>
                            {proj.ku}
                          </span>
                          {proj.sdgList && proj.sdgList.length > 0 && (
                            <span style={{ padding: '2px 6px', background: '#EFF6FF', color: '#1E61F0', borderRadius: '4px', fontSize: '11px' }}>
                              SDG {proj.sdgList.join(', ')}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    
      {/* ─── TAB 5: DEDICATED DAILY KPI MANAGER ──────────────────────────────── */}
      {activeTab === 'kpi' && (
        <div className={styles.tableCard}>
          <div className={styles.tableHeaderRow}>
            <div>
              <div className={styles.tableTitle}>
                ระบบจัดการและบันทึกผลประเมินรายวัน (Daily KPI Management Portal)
              </div>
              <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                เลือกโครงการเป้าหมายเพื่อตรวจดูหรือเพิ่มผลการประเมินความพึงพอใจรายวัน (+ เพิ่มวันประเมินแบบไม่จำกัด)
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '16px 0' }}>
            <div className={styles.formGroup} style={{ maxWidth: '600px' }}>
              <label className={styles.formLabel}>เลือกโครงการที่ต้องการจัดการผลประเมิน *</label>
              <select
                className={styles.formInput}
                value={manageKpiProjectId}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : Number(e.target.value);
                  setManageKpiProjectId(val);
                  if (val) fetchProjectKpis(val);
                  else setManageKpiRows([]);
                }}
              >
                <option value="">-- กรุณาเลือกโครงการเป้าหมาย --</option>
                {warehouseProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id}. {p.code && p.code !== '-' ? `[${p.code}] ` : ''}{p.name} (ปี {p.academicYear})
                  </option>
                ))}
              </select>
            </div>

            {manageKpiProjectId && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {(() => {
                  const targetProj = warehouseProjects.find((p) => p.id === manageKpiProjectId);
                  if (!targetProj) return null;
                  return (
                    <div style={{ padding: '12px 16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '13px' }}>
                      <div><strong>รหัสโครงการ:</strong> {targetProj.code || '-'}</div>
                      <div><strong>วันที่จัดงาน:</strong> {targetProj.startDate} ถึง {targetProj.endDate || targetProj.startDate}</div>
                      <div><strong>ผู้เข้าร่วมกิจกรรม:</strong> {targetProj.participants} คน</div>
                      <div><strong>อาจารย์ผู้รับผิดชอบ:</strong> {targetProj.lecturer}</div>
                    </div>
                  );
                })()}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#0F172A' }}>
                    รายการผลการประเมินความพึงพอใจ ({manageKpiRows.length} รายการ)
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const targetProj = warehouseProjects.find((p) => p.id === manageKpiProjectId);
                      setManageKpiRows((prev) => [
                        ...prev,
                        {
                          id: `kpi-add-${Date.now()}-${prev.length + 1}`,
                          scope: 'DAILY',
                          date: targetProj?.startDate || '',
                          respondents: '',
                          eligible: targetProj?.participants || '',
                          score: '',
                        },
                      ]);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#EFF6FF',
                      color: '#1E61F0',
                      border: '1px solid #BFDBFE',
                      borderRadius: '6px',
                      padding: '8px 14px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    + เพิ่มวันประเมิน (Daily KPI)
                  </button>
                </div>

                {isLoadingKpis ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>กำลังโหลดข้อมูลผลประเมินจากคลัง...</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {manageKpiRows.map((row) => (
                      <div
                        key={row.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '150px 160px 140px 140px 140px 40px',
                          gap: '12px',
                          alignItems: 'center',
                          background: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          padding: '12px 14px',
                          borderRadius: '8px',
                        }}
                      >
                        <div>
                          <label style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '3px' }}>
                            ประเภทการประเมิน
                          </label>
                          <select
                            className={styles.formInput}
                            style={{ padding: '6px 8px', fontSize: '12px', height: '34px' }}
                            value={row.scope}
                            onChange={(e) => {
                              const newScope = e.target.value as 'ALL' | 'DAILY';
                              const targetProj = warehouseProjects.find((p) => p.id === manageKpiProjectId);
                              setManageKpiRows((prev) =>
                                prev.map((k) => (k.id === row.id ? { ...k, scope: newScope, date: newScope === 'ALL' ? '' : (k.date || targetProj?.startDate || '') } : k))
                              );
                            }}
                          >
                            <option value="DAILY">รายวัน (DAILY)</option>
                            <option value="ALL">ภาพรวม (ALL)</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '3px' }}>
                            วันที่ประเมิน
                          </label>
                          <input
                            type="date"
                            className={styles.formInput}
                            style={{ padding: '4px 8px', fontSize: '12px', height: '34px' }}
                            value={row.date}
                            disabled={row.scope === 'ALL'}
                            onChange={(e) => {
                              setManageKpiRows((prev) =>
                                prev.map((k) => (k.id === row.id ? { ...k, date: e.target.value } : k))
                              );
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '3px' }}>
                            ผู้ตอบแบบประเมิน (คน)
                          </label>
                          <input
                            type="number"
                            placeholder="เช่น 30"
                            className={styles.formInput}
                            style={{ padding: '4px 8px', fontSize: '12px', height: '34px' }}
                            value={row.respondents}
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : Number(e.target.value);
                              setManageKpiRows((prev) =>
                                prev.map((k) => (k.id === row.id ? { ...k, respondents: val } : k))
                              );
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '3px' }}>
                            ผู้มีสิทธิ์ประเมิน (คน)
                          </label>
                          <input
                            type="number"
                            placeholder="เช่น 35"
                            className={styles.formInput}
                            style={{ padding: '4px 8px', fontSize: '12px', height: '34px' }}
                            value={row.eligible}
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : Number(e.target.value);
                              setManageKpiRows((prev) =>
                                prev.map((k) => (k.id === row.id ? { ...k, eligible: val } : k))
                              );
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '3px' }}>
                            คะแนนเฉลี่ย (1.00-5.00)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="1"
                            max="5"
                            placeholder="เช่น 4.65"
                            className={styles.formInput}
                            style={{ padding: '4px 8px', fontSize: '12px', height: '34px' }}
                            value={row.score}
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : Number(e.target.value);
                              setManageKpiRows((prev) =>
                                prev.map((k) => (k.id === row.id ? { ...k, score: val } : k))
                              );
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%', paddingBottom: '2px' }}>
                          <button
                            type="button"
                            title="ลบแถวนี้"
                            onClick={() => {
                              setManageKpiRows((prev) => prev.filter((k) => k.id !== row.id));
                            }}
                            style={{
                              background: '#FEE2E2',
                              color: '#DC2626',
                              border: 'none',
                              borderRadius: '4px',
                              width: '32px',
                              height: '34px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 'bold',
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={handleSaveDailyKpis}
                    disabled={isSavingKpis || isLoadingKpis}
                    style={{ padding: '10px 24px', fontSize: '14px' }}
                  >
                    {isSavingKpis ? 'กำลังบันทึกลงคลังข้อมูล...' : 'บันทึกผลประเมินลงคลังข้อมูล (Save Daily KPIs)'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
