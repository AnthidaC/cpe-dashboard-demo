'use client';

export default function LoadError({ onRetry }: { onRetry: () => void }) {
  return <div role="alert" style={{ padding: 24, lineHeight: 1.7 }}>
    <p>โหลดข้อมูลไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง</p>
    <button onClick={onRetry}>ลองใหม่</button>
  </div>;
}
