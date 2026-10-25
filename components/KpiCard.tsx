// components/KpiCard.tsx — Professional Executive KPI Card Component

import styles from './KpiCard.module.css';

export type KpiColor = 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'navy' | 'gold' | 'teal' | 'crimson' | 'slate';

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: string;
  trendDir?: 'up' | 'down';
  color?: KpiColor;
  tooltip?: string;
}

export default function KpiCard({
  label,
  value,
  sub,
  trend,
  trendDir = 'up',
  color = 'blue',
  tooltip,
}: KpiCardProps) {
  return (
    <div className={`${styles.card} ${styles[color]}`} title={tooltip}>
      <div className={styles.statusDot} />
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value}</div>
      {sub   && <div className={styles.sub}>{sub}</div>}
      {trend && (
        <div className={`${styles.trend} ${trendDir === 'up' ? styles.trendUp : styles.trendDown}`}>
          {trend}
        </div>
      )}
    </div>
  );
}
