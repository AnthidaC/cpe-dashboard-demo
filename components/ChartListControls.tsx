'use client';

import { ChartControlGroup, ChartControlSelect } from './ChartControlGroup';
import styles from './ChartControlGroup.module.css';

export default function ChartListControls({
  direction,
  onDirectionChange,
  limit,
  onLimitChange,
  totalCount,
}: {
  direction: 'asc' | 'desc';
  onDirectionChange: (value: 'asc' | 'desc') => void;
  limit: number | 'all';
  onLimitChange: (value: number | 'all') => void;
  totalCount?: number;
}) {
  return (
    <div className={styles.listControlsGroup}>
      <ChartControlSelect<'asc' | 'desc'>
        label="ลำดับ:"
        value={direction}
        onChange={onDirectionChange}
        options={[
          { value: 'asc', label: 'น้อย → มาก' },
          { value: 'desc', label: 'มาก → น้อย' },
        ]}
      />
      <ChartControlGroup<number | 'all'>
        label="แสดงผล:"
        value={limit}
        onChange={onLimitChange}
        options={[
          { value: 5, label: '5 โครงการ' },
          { value: 10, label: '10 โครงการ' },
          {
            value: 'all',
            label: 'ทั้งหมด',
            badge: totalCount !== undefined ? String(totalCount) : undefined,
          },
        ]}
      />
    </div>
  );
}

