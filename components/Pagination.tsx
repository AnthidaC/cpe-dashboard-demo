'use client';

import { useState } from 'react';
import styles from './Pagination.module.css';

export function usePagination<T extends { id: number }>(items: T[], initialSize = 10) {
  const [pageSize, setPageSize] = useState(initialSize);
  const [selection, setSelection] = useState({ key: '', page: 1 });
  const key = `${pageSize}:${items.map(item => item.id).join(',')}`;
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = selection.key === key ? Math.min(selection.page, pages) : 1;
  const start = (page - 1) * pageSize;
  return {
    visible: items.slice(start, start + pageSize), start,
    pagination: <Pagination page={page} pages={pages} count={items.length} pageSize={pageSize}
      onPageChange={next => setSelection({ key, page: next })} onPageSizeChange={setPageSize} />,
  };
}

export default function Pagination({ page, pages, count, pageSize, onPageChange, onPageSizeChange }: {
  page: number; pages: number; count: number; pageSize: number;
  onPageChange: (page: number) => void; onPageSizeChange: (size: number) => void;
}) {
  return <nav className={styles.pagination} aria-label="แบ่งหน้ารายการ">
    <span aria-live="polite">{count ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, count)}` : '0'} จาก {count} รายการ</span>
    <div className={styles.actions}>
      <label>ต่อหน้า <select value={pageSize} onChange={event => onPageSizeChange(Number(event.target.value))}>
        {[10, 20].map(size => <option key={size} value={size}>{size}</option>)}
      </select></label>
      <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>ก่อนหน้า</button>
      <span>{page} / {pages}</span>
      <button type="button" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>ถัดไป</button>
    </div>
  </nav>;
}
