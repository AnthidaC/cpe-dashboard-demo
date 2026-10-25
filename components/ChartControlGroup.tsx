'use client';
// components/ChartControlGroup.tsx — Standardized Chart Controls Component

import React from 'react';
import styles from './ChartControlGroup.module.css';

export interface ControlOption<T extends string | number> {
  value: T;
  label: string;
  badge?: string;
  variant?: 'default' | 'danger' | 'success' | 'blue';
}

export interface ChartControlGroupProps<T extends string | number> {
  label?: string;
  options: ControlOption<T>[];
  value: T;
  onChange: (val: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function ChartControlGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  className = '',
  size = 'sm',
}: ChartControlGroupProps<T>) {
  return (
    <div className={`${styles.controlWrapper} ${className}`}>
      {label && <span className={styles.label}>{label}</span>}
      <div role="group" aria-label={label} className={`${styles.track} ${size === 'md' ? styles.trackMd : ''}`}>
        {options.map((opt) => {
          const isActive = value === opt.value;
          let activeClass = styles.activeDefault;
          if (opt.variant === 'danger') activeClass = styles.activeDanger;
          if (opt.variant === 'success') activeClass = styles.activeSuccess;
          if (opt.variant === 'blue') activeClass = styles.activeBlue;

          return (
            <button
              key={String(opt.value)}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(opt.value)}
              className={`${styles.btn} ${isActive ? `${styles.active} ${activeClass}` : ''}`}
            >
              {opt.label}
              {opt.badge && <span className={styles.btnBadge} aria-hidden="true">{opt.badge}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface ChartControlSelectProps<T extends string | number> {
  label?: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (val: T) => void;
  className?: string;
}

export function ChartControlSelect<T extends string | number>({
  label,
  options,
  value,
  onChange,
  className = '',
}: ChartControlSelectProps<T>) {
  return (
    <div className={`${styles.controlWrapper} ${className}`}>
      {label && <span className={styles.label}>{label}</span>}
      <select
        aria-label={label}
        className={styles.select}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((opt) => (
          <option key={String(opt.value)} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
