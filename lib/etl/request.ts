import { EtlValidationError } from './attendance';
import * as XLSX from 'xlsx';

export async function readFormData(request: Pick<Request, 'formData'>): Promise<FormData> {
  try { return await request.formData(); }
  catch { throw new EtlValidationError('รูปแบบไฟล์ที่อัปโหลดไม่ถูกต้อง'); }
}

/** Validate the request shape before accessing fields or invoking transformations. */
export async function readJsonObject(request: Pick<Request, 'json'>): Promise<Record<string, unknown>> {
  const body: unknown = await request.json();
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new EtlValidationError('กรุณาส่งข้อมูลเป็น JSON object');
  }
  return body as Record<string, unknown>;
}

export function validateRawRows(value: unknown): asserts value is Record<string, unknown>[] {
  if (!Array.isArray(value) || value.some(row => !row || typeof row !== 'object' || Array.isArray(row))) {
    throw new EtlValidationError('รูปแบบแถวข้อมูลไม่ถูกต้อง');
  }
}

export async function readWorkbook(formData: FormData): Promise<{ workbook: XLSX.WorkBook; name: string }> {
  const file = formData.get('file');
  if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
    throw new EtlValidationError('กรุณาอัปโหลดไฟล์ Excel หรือ CSV');
  }
  if (file.size === 0 || file.size > 10 * 1024 * 1024) throw new EtlValidationError('ไฟล์ต้องไม่ว่างและมีขนาดไม่เกิน 10 MB');
  try {
    return { workbook: XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true }), name: file.name };
  } catch {
    throw new EtlValidationError('ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบไฟล์ Excel หรือ CSV');
  }
}
