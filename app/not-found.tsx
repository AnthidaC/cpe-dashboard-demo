// app/not-found.tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'Sarabun, sans-serif' }}>
      <h2>ไม่พบหน้าที่ต้องการ (404 Not Found)</h2>
      <p style={{ marginTop: '10px', color: '#64748B' }}>หน้าที่คุณกำลังค้นหาไม่มีอยู่หรือถูกย้ายแล้ว</p>
      <Link
        href="/overview"
        style={{
          display: 'inline-block',
          marginTop: '20px',
          padding: '10px 20px',
          background: '#059669',
          color: '#FFFFFF',
          borderRadius: '6px',
          textDecoration: 'none',
          fontWeight: 700,
        }}
      >
        กลับสู่หน้าหลัก
      </Link>
    </div>
  );
}
