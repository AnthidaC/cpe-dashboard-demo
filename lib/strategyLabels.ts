/** Plain-language labels for the three education substrategies in strategySubs. */
export const educationStrategyLabels: Record<number, string> = {
  1: 'พัฒนาหลักสูตร',
  2: 'พัฒนาการเรียนรู้ผ่านระบบออนไลน์',
  3: 'สร้างบรรยากาศส่งเสริมการเรียนรู้',
};

export function educationStrategyLabel(number: number): string {
  return `${number}. ${educationStrategyLabels[number] ?? 'ไม่ระบุชื่อกลยุทธ์'}`;
}
