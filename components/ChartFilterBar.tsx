'use client';
// components/ChartFilterBar.tsx — Smart Dataset Scalability & Dynamic Filter Component

import styles from './ChartFilterBar.module.css';
import { ChartControlGroup, ChartControlSelect } from './ChartControlGroup';

interface ChartFilterBarProps {
  topN?: number | 'all';
  onTopNChange?: (n: number | 'all') => void;
  selectedCategory?: string;
  onCategoryChange?: (cat: string) => void;
  categoryOptions?: { value: string; label: string }[];
  sortBy?: string;
  onSortByChange?: (sort: string) => void;
  totalCount: number;
  filteredCount: number;
}

export default function ChartFilterBar({
  topN,
  onTopNChange,
  selectedCategory = 'all',
  onCategoryChange,
  categoryOptions,
  sortBy,
  onSortByChange,
  totalCount,
  filteredCount,
}: ChartFilterBarProps) {
  return (
    <div className={styles.filterBar}>
      <div className={styles.leftGroup}>
        {topN !== undefined && onTopNChange && (
          <ChartControlGroup
            label="แสดงผล:"
            options={[
              { value: 5, label: 'Top 5' },
              { value: 10, label: 'Top 10' },
              { value: 'all', label: 'ทั้งหมด' },
            ]}
            value={topN}
            onChange={onTopNChange}
          />
        )}

        {onCategoryChange && (
          <ChartControlSelect
            label={categoryOptions ? 'ผู้รับผิดชอบ:' : 'ประเภทกิจกรรม:'}
            options={categoryOptions ?? [
              { value: 'all', label: 'ทุกประเภทกิจกรรม' },
              { value: 'วิชาการ', label: 'วิชาการ' },
              { value: 'บริการ', label: 'บริการ' },
              { value: 'นันทนาการ', label: 'นันทนาการ' },
              { value: 'บำเพ็ญประโยชน์', label: 'บำเพ็ญประโยชน์' },
              { value: 'พัฒนาศักยภาพ', label: 'พัฒนาศักยภาพ' },
            ]}
            value={selectedCategory}
            onChange={onCategoryChange}
          />
        )}

        {onSortByChange && (
          <ChartControlSelect
            label="เรียงตาม:"
            options={[
              { value: 'budget', label: 'งบประมาณใช้จริง' },
              { value: 'participants', label: 'จำนวนผู้เข้าร่วม' },
              { value: 'satisfaction', label: 'ความพึงพอใจ' },
              { value: 'cost', label: 'ต้นทุนต่อหัว' },
            ]}
            value={sortBy ?? 'budget'}
            onChange={onSortByChange}
          />
        )}
      </div>

      <div className={styles.rightGroup}>
        <span className={styles.countBadge}>
          แสดง {filteredCount} จาก {totalCount} รายการ
        </span>
      </div>
    </div>
  );
}
