// app/layout.tsx

import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import styles from './layout.module.css';
import { FilterProvider } from '@/lib/FilterContext';

export const metadata: Metadata = {
  title: 'Academic Project Dashboard | ภาควิชาวิศวกรรมคอมพิวเตอร์',
  description:
    'แดชบอร์ดวิเคราะห์โครงการกิจกรรมภาควิชา — ประสิทธิภาพ, ผู้เข้าร่วม, คุณภาพ, ยุทธศาสตร์, ความสัมพันธ์เชิงลึก',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body>
        <FilterProvider>
          <div className={styles.shell}>
            <Sidebar />
            <div className={styles.main}>
              {children}
            </div>
          </div>
        </FilterProvider>
      </body>
    </html>
  );
}
