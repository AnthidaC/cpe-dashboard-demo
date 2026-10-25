// components/DbStatusBadge.tsx — Mock Demo Status Indicator for GitHub Pages
'use client';

import { useState } from 'react';
import styles from './DbStatusBadge.module.css';

export default function DbStatusBadge() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={styles.wrapper}>
      <button
        className={styles.badge}
        data-state="live"
        onClick={() => setExpanded((prev) => !prev)}
        title="ระบบกำลังทำงานในโหมด Mock Data สาธิต (Client-side Demo)"
      >
        <span className={styles.dot} />
        <span>Mock Demo (20 โครงการ)</span>
      </button>

      {expanded && (
        <div className={styles.popover}>
          <div className={styles.popoverHeader}>
            <strong>สถานะระบบจำลอง</strong>
            <button
              className={styles.closeBtn}
              onClick={() => setExpanded(false)}
              aria-label="ปิด"
            >
              ×
            </button>
          </div>
          <div className={styles.popoverBody}>
            <div className={styles.row}>
              <span>โหมดการทำงาน:</span>
              <span className={styles.valLive}>Static Mock (GitHub Pages)</span>
            </div>
            <div className={styles.row}>
              <span>จำนวนโครงการจำลอง:</span>
              <span>20 โครงการ</span>
            </div>
            <div className={styles.row}>
              <span>จำนวนนิสิตจำลอง:</span>
              <span>250 คน</span>
            </div>
            <div className={styles.row}>
              <span>ความปลอดภัยข้อมูล:</span>
              <span style={{ color: '#16a34a', fontWeight: 600 }}>Zero Data Leakage (PDPA)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
