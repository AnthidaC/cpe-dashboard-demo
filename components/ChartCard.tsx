'use client';
// components/ChartCard.tsx — Official ChartCard Component with Per-Card Filtering & View Toggle

import styles from './ChartCard.module.css';
import React, { useEffect, useRef, useState } from 'react';
import { ChartControlGroup } from './ChartControlGroup';

interface LegendItem {
  color: string;
  label: string;
}

interface ChartCardProps {
  title: string;
  subtitle?: string;
  badge?: string;
  height?: number | 'auto';
  autoHeight?: boolean;
  fillHeight?: boolean;
  legend?: LegendItem[];
  tableContent?: React.ReactNode;
  coverage?: { available: number; total: number };
  topN?: number | 'all';
  onTopNChange?: (value: number | 'all') => void;
  controls?: React.ReactNode;
  controlsBelowTitle?: boolean;
  children: React.ReactNode;
  className?: string;
}

export default function ChartCard({
  title,
  subtitle,
  badge,
  height,
  autoHeight = false,
  fillHeight = false,
  legend,
  tableContent,
  coverage,
  topN,
  onTopNChange,
  controls,
  controlsBelowTitle = false,
  children,
  className,
}: ChartCardProps) {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const viewportRef = useRef<HTMLDivElement>(null);

  const hasFilterControls = Boolean(controls || (topN !== undefined && onTopNChange));
  const isScrollableChart = typeof height === 'number' && height > 480;
  const resolvedHeight = Math.round(typeof height === 'number' ? height : 320);

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = 0;
    }
  }, [resolvedHeight, viewMode]);

  // Determine actual container height style: use exact integer height & maxHeight so <canvas>
  // always shrinks back cleanly after switching from 'ทั้งหมด' to 5/10 projects and never blurs.
  // When fillHeight is enabled on a non-scrolling companion card, allow it to stretch with its grid row.
  const containerStyle: React.CSSProperties = autoHeight || height === 'auto'
    ? { height: 'auto', minHeight: 250, flex: '1 0 auto' }
    : fillHeight && !isScrollableChart
    ? { minHeight: resolvedHeight, height: '100%', flex: '1 1 auto' }
    : { height: resolvedHeight, minHeight: resolvedHeight, maxHeight: resolvedHeight, flex: '0 0 auto' };

  return (
    <div className={`${styles.card} ${className ?? ''}`}>
      <div className={`${styles.header} ${controlsBelowTitle || hasFilterControls ? styles.headerStacked : ''}`}>
        <div className={styles.headerTop}>
          <div className={styles.titleSection}>
            <div className={styles.titleRow}>
              <div className={styles.title}>{title}</div>
              {badge && <span className={styles.badge}>{badge}</span>}
              {!subtitle && coverage && (
                <span className={styles.coverageBadge}>
                  มีข้อมูล {coverage.available} จาก {coverage.total} โครงการ
                </span>
              )}
            </div>
            {subtitle && (
              <div className={styles.subtitleRow}>
                <div className={styles.subtitle}>{subtitle}</div>
                {coverage && (
                  <span className={styles.coverageBadge}>
                    มีข้อมูล {coverage.available} จาก {coverage.total} โครงการ
                  </span>
                )}
              </div>
            )}
          </div>

          {/* View Mode Toggle anchored cleanly at top-right */}
          {tableContent && (
            <div className={styles.viewToggleWrap}>
              <ChartControlGroup
                options={[
                  { value: 'chart', label: 'กราฟ' },
                  { value: 'table', label: 'ตารางข้อมูล' },
                ]}
                value={viewMode}
                onChange={setViewMode}
              />
            </div>
          )}
        </div>

        {hasFilterControls && (
          <div className={styles.controlsSection}>
            {/* Tailored Sub-chart Controls */}
            {controls}

            {/* Per-Card Top N Filter Toggle (Only if controls is not passed) */}
            {!controls && topN !== undefined && onTopNChange && (
              <ChartControlGroup
                options={[
                  { value: 5, label: 'Top 5' },
                  { value: 10, label: 'Top 10' },
                  { value: 'all', label: 'ทั้งหมด' },
                ]}
                value={topN}
                onChange={onTopNChange}
              />
            )}
          </div>
        )}
      </div>

      {viewMode === 'chart' ? (
        <div
          ref={viewportRef}
          className={styles.canvasViewport}
          style={
            isScrollableChart
              ? { maxHeight: 480, overflowY: 'auto' }
              : coverage?.available === 0 || autoHeight || height === 'auto'
              ? { overflow: 'hidden' }
              : { minHeight: resolvedHeight, flex: '1 1 0px', position: 'relative', overflow: 'hidden' }
          }
        >
          <div
            className={styles.canvasWrap}
            style={
              coverage?.available === 0
                ? { minHeight: 140, flex: 1, display: 'grid', placeItems: 'center' }
                : isScrollableChart || autoHeight || height === 'auto'
                ? containerStyle
                : { position: 'absolute', inset: 0, width: '100%', height: '100%' }
            }
          >
            {coverage?.available === 0 ? <p role="status" className={styles.subtitle}>ยังไม่มีข้อมูลสำหรับตัวชี้วัดนี้</p> : children}
          </div>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          {tableContent}
        </div>
      )}

      {viewMode === 'chart' && legend && (
        <div className={styles.legend}>
          {legend.map((item) => (
            <div key={item.label} className={styles.legendItem}>
              <div className={styles.legendDot} style={{ background: item.color }} />
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
