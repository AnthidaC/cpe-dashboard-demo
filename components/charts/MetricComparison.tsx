'use client';

import { useRef } from 'react';
import { Bar, getElementAtEvent } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { alpha, baseTooltip, fontFamily, tickColor } from '@/lib/chartHelpers';
import { getLinearChartScale } from '@/lib/chartScales';
import styles from './MetricComparison.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, ChartDataLabels);

interface ComparisonMetric {
  label: string;
  values: (number | null)[];
  color: string;
  valueColors?: string[];
  max?: number;
  format: (value: number) => string;
}

const chartTop = 16;
const axisHeight = 36;

function MetricBars({ labels, metric, reversed, onRowClick }: {
  labels: string[];
  metric: ComparisonMetric;
  reversed: boolean;
  onRowClick?: (index: number) => void;
}) {
  const ref = useRef<ChartJS<'bar'>>(null);
  const validValues = metric.values.filter((value): value is number => value !== null && Number.isFinite(value));
  const largest = Math.max(0, ...validValues);
  const scale = getLinearChartScale([0, largest], {
    minSpan: 1, lowerBound: 0, fallback: { min: 0, max: 1, step: 0.2 },
  });
  const max = metric.max !== undefined ? Math.max(metric.max, largest) : scale.max;
  const values = labels.map((_, index) => {
    const value = metric.values[index];
    return value !== null && value !== undefined && Number.isFinite(value) ? value : null;
  });
  const formatTick = (value: number) => {
    const prefix = metric.format(1).startsWith('฿') ? '฿' : '';
    const suffix = metric.format(1).includes('%') ? '%' : '';
    return prefix + new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value) + suffix;
  };

  return <Bar
    ref={ref}
    role="img"
    aria-label={`${metric.label}: ${labels.map((label, i) => `${label} ${values[i] === null ? 'ไม่มีข้อมูล' : metric.format(values[i] as number)}`).join(', ')}`}
    data={{ labels, datasets: [{
      label: metric.label, data: values,
      backgroundColor: metric.valueColors ? metric.valueColors.map(color => alpha(color, 0.8)) : alpha(metric.color, 0.8), borderColor: metric.valueColors ?? metric.color,
      borderWidth: 1, borderRadius: 4, maxBarThickness: 28,
      categoryPercentage: 0.75, barPercentage: 0.8,
    }] }}
    onClick={event => {
      if (!ref.current || !onRowClick) return;
      const hit = getElementAtEvent(ref.current, event)[0];
      if (hit) onRowClick(hit.index);
    }}
    plugins={[{
      id: 'missingMetricLabels',
      afterDatasetsDraw(chart) {
        const {ctx, scales: {x, y}} = chart;
        ctx.save();
        ctx.font = `500 11px ${fontFamily}`;
        ctx.fillStyle = tickColor;
        ctx.textAlign = reversed ? 'right' : 'left';
        ctx.textBaseline = 'middle';
        values.forEach((value, index) => {
          if (value === null) ctx.fillText('ไม่มีข้อมูล', x.getPixelForValue(0) + (reversed ? -6 : 6), y.getPixelForValue(index));
        });
        ctx.restore();
      },
    }]}
    options={{
      responsive: true, maintainAspectRatio: false, indexAxis: 'y',
      layout: { padding: { top: chartTop, bottom: 0, left: reversed ? 66 : 0, right: reversed ? 0 : 66 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...baseTooltip,
          titleFont: { ...baseTooltip.titleFont, weight: 600 },
          bodyFont: { ...baseTooltip.bodyFont, weight: 400 },
          callbacks: { label: ctx => `${metric.label}: ${metric.format(Number(ctx.raw))}` },
        },
        datalabels: {
          display: ctx => ctx.dataset.data[ctx.dataIndex] !== null,
          anchor: reversed ? 'start' : 'end', align: reversed ? 'left' : 'right', offset: 5,
          color: '#1A1F23', font: { family: fontFamily, size: 11, weight: 600 },
          formatter: (value: number | null) => value === null ? '' : metric.format(value),
          clip: false,
        },
      },
      scales: {
        x: {
          min: 0, max, reverse: reversed,
          afterFit: axis => { axis.height = axisHeight; },
          grid: { color: '#E2E8F0' }, border: { color: '#CBD5E1' },
          ticks: {
            color: tickColor, font: {family: fontFamily, size: 11},
            maxTicksLimit: 4, minRotation: 0, maxRotation: 0,
            callback: value => formatTick(Number(value)),
          },
        },
        y: {
          offset: true,
          afterFit: axis => { axis.width = 0; },
          ticks: { display: false }, border: { display: false },
          grid: { color: '#F1F5F9', drawTicks: false },
        },
      },
    }}
  />;
}

/** Mirrored bar charts with shared category rows and independent zero-based axes. */
export default function MetricComparison({ labels, metrics, onRowClick, sharedScale = false }: {
  labels: string[];
  metrics: ComparisonMetric[];
  onRowClick?: (index: number) => void;
  sharedScale?: boolean;
}) {
  if (labels.length === 0 || metrics.length === 0) return <p className={styles.note}>ไม่มีข้อมูลตามตัวกรองที่เลือก</p>;
  const paired = metrics.length > 1;
  const commonMax = sharedScale ? getLinearChartScale(
    [0, ...metrics.flatMap(metric => metric.values.filter((value): value is number => value !== null && Number.isFinite(value)))],
    { minSpan: 1, lowerBound: 0, fallback: { min: 0, max: 1, step: 0.2 } },
  ).max : undefined;
  const plottedMetrics = metrics.map(metric => commonMax !== undefined ? { ...metric, max: commonMax } : metric);
  const height = Math.max(240, labels.length * 56 + chartTop + axisHeight);
  const heading = (metric: ComparisonMetric) => <div className={styles.metricTitle}>
    {!metric.valueColors && <i style={{ background: metric.color }} />}{metric.label}
  </div>;
  const names = <div className={styles.names} style={{ paddingTop: chartTop, paddingBottom: axisHeight }}>
    {labels.map((label, index) => <div className={styles.nameRow} key={`${label}-${index}`} title={label}>
      {onRowClick
        ? <button type="button" onClick={() => onRowClick(index)}>{label}</button>
        : <span>{label}</span>}
    </div>)}
  </div>;

  return <>
    <div className={styles.scroll}>
      <div className={`${styles.grid} ${paired ? styles.paired : styles.single}`}>
        {paired && heading(metrics[0])}
        <div className={styles.categoryTitle}>หมวดข้อมูล</div>
        {heading(metrics[paired ? 1 : 0])}
        {paired && <div className={styles.plot} style={{ height }}>
          <MetricBars labels={labels} metric={plottedMetrics[0]} reversed onRowClick={onRowClick} />
        </div>}
        {names}
        <div className={styles.plot} style={{ height }}>
          <MetricBars labels={labels} metric={plottedMetrics[paired ? 1 : 0]} reversed={false} onRowClick={onRowClick} />
        </div>
      </div>
    </div>
  </>;
}
