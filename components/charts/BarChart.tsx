'use client';
// components/charts/BarChart.tsx — Advanced Multi-Axis & Mixed (Bar+Line) Chart Component (Large Crisp Fonts)

import { useRef } from 'react';
import { Chart, getElementAtEvent } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  Tooltip, Legend, LineController
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { baseLegend, baseTooltip, gridColor, tickColor, fontFamily, chartDevicePixelRatio } from '@/lib/chartHelpers';
import { getChartStepSize } from '@/lib/chartScales';
import { wrapThaiLabelForVerticalChart } from '@/lib/thaiLabelUtils';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  Tooltip, Legend, ChartDataLabels, LineController
);
ChartJS.defaults.devicePixelRatio = chartDevicePixelRatio;

export interface BarDataset {
  label: string;
  data: (number | null)[];
  type?: 'bar' | 'line';
  yAxisID?: 'y' | 'y1';
  backgroundColor: string | string[];
  borderColor?: string | string[];
  borderRadius?: number;
  borderWidth?: number;
  pointRadius?: number;
  pointBackgroundColor?: string;
  fill?: boolean;
}

interface BarChartProps {
  labels: string[];
  datasets: BarDataset[];
  maxBarThickness?: number;
  barPercentage?: number;
  categoryPercentage?: number;
  yMin?: number;
  yMax?: number;
  yStepSize?: number;
  yCallback?: (v: number) => string;
  y1Min?: number;
  y1Max?: number;
  y1Label?: string;
  y1Callback?: (v: number) => string;
  showDatalabels?: boolean;
  datalabelCallback?: (v: number, datasetIndex?: number, dataIndex?: number) => string;
  datalabelColor?: string | string[];
  showLegend?: boolean;
  onProjectClick?: (index: number, label: string) => void;
  stacked?: boolean;
  wrapCategoryLabels?: boolean;
}

function formatTickValue(v: number | string, customCb?: (num: number) => string): string {
  const num = typeof v === 'number' ? v : parseFloat(String(v));
  if (isNaN(num)) return String(v);
  const cleanNum = Math.round(num * 100) / 100;
  if (customCb) return customCb(cleanNum);
  return Number.isInteger(cleanNum) ? String(cleanNum) : cleanNum.toFixed(1);
}



export default function BarChart({
  labels,
  datasets,
  maxBarThickness,
  barPercentage,
  categoryPercentage,
  yMin,
  yMax,
  yStepSize,
  yCallback,
  y1Min,
  y1Max,
  y1Label,
  y1Callback,
  showDatalabels = false,
  datalabelCallback,
  datalabelColor = '#0F172A',
  showLegend,
  onProjectClick,
  stacked = false,
  wrapCategoryLabels = false,
}: BarChartProps) {
  const chartRef = useRef<ChartJS>(null);
  const hasY1 = datasets.some((d) => d.yAxisID === 'y1');
  const shouldShowLegend = showLegend !== undefined ? showLegend : datasets.length > 1;

  const resolvedMaxBarThickness = maxBarThickness ?? (
    labels.length <= 4 ? 96 :
    labels.length <= 6 ? 68 :
    labels.length <= 10 ? 50 : 38
  );
  const resolvedCategoryPercentage = categoryPercentage ?? (labels.length <= 4 ? 0.65 : 0.8);
  const resolvedBarPercentage = barPercentage ?? (labels.length <= 4 ? 0.75 : 0.85);

  const ds = datasets.map((d) => ({
    type: d.type ?? 'bar',
    yAxisID: d.yAxisID ?? 'y',
    label: d.label,
    data: d.data,
    backgroundColor: d.backgroundColor,
    borderColor: d.borderColor ?? d.backgroundColor,
    borderRadius: d.borderRadius ?? 6,
    borderWidth: d.borderWidth ?? (d.type === 'line' ? 3.5 : 0),
    maxBarThickness: resolvedMaxBarThickness,
    barPercentage: resolvedBarPercentage,
    categoryPercentage: resolvedCategoryPercentage,
    pointRadius: d.pointRadius ?? 7,
    pointBackgroundColor: d.pointBackgroundColor ?? d.borderColor,
    fill: d.fill ?? false,
    datalabels: d.type === 'line' ? { display: false } : undefined,
  }));

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!chartRef.current || !onProjectClick) return;
    const elements = getElementAtEvent(chartRef.current, event);
    if (elements.length > 0) {
      const index = elements[0].index;
      onProjectClick(index, labels[index]);
    }
  };

  const isDense = labels.length > 12;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minWidth: 0, overflow: 'hidden', cursor: onProjectClick ? 'pointer' : 'default' }}>
      <Chart
        ref={chartRef as never}
        type="bar"
        data={{ labels, datasets: ds as never }}
        onClick={handleClick}
        plugins={[{
          id: 'missingBarValues',
          afterDatasetsDraw(chart) {
            const {ctx, scales: {x, y}} = chart;
            ctx.save(); ctx.fillStyle = '#565656';
            ctx.font = `500 11px ${fontFamily}`; ctx.textAlign = 'center';
            datasets.forEach(dataset => dataset.data.forEach((value, index) => {
              if (value === null) ctx.fillText('ไม่มีข้อมูล', x.getPixelForValue(index), y.getPixelForValue(0) - 10);
            }));
            ctx.restore();
          },
        }]}
        options={{
          devicePixelRatio: chartDevicePixelRatio,
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: { top: shouldShowLegend ? 38 : 34, left: 10, right: 15, bottom: isDense ? 30 : wrapCategoryLabels ? 20 : 5 },
          },
          plugins: {
            tooltip: {
              ...baseTooltip,
              titleFont: { ...baseTooltip.titleFont, weight: 600 },
              bodyFont: { ...baseTooltip.bodyFont, weight: 400 },
              callbacks: {
                title: (items) => {
                  if (!items.length) return '';
                  const idx = items[0].dataIndex;
                  return labels[idx] ?? items[0].label;
                },
              },
            },
            legend: shouldShowLegend
              ? {
                  display: true,
                  position: 'top',
                  labels: {
                    ...baseLegend.labels,
                    color: '#1E293B',
                    font: { family: fontFamily, size: 13, weight: 500 },
                    padding: 14,
                    boxWidth: 12,
                    boxHeight: 12,
                  },
                }
              : { display: false },
            datalabels: showDatalabels
              ? {
                  display: ctx => {
                    const val = ctx.dataset.data[ctx.dataIndex];
                    return val !== null && (!stacked || Number(val) > 0);
                  },
                  color: stacked ? '#FFFFFF' : datalabelColor,
                  font: { size: 12, weight: 600, family: fontFamily },
                  anchor: stacked ? 'center' : 'end',
                  align: stacked ? 'center' : 'top',
                  formatter: (v: number, ctx: { datasetIndex: number; dataIndex: number }) =>
                    datalabelCallback ? datalabelCallback(v, ctx.datasetIndex, ctx.dataIndex) : String(v),
                  clip: false,
                }
              : { display: false },
          },
          scales: {
            x: {
              stacked: stacked,
              grid: { display: false },
              ticks: {
                color: '#1E293B',
                font: { family: fontFamily, size: isDense ? 10.5 : 11, weight: 400 },
                maxRotation: isDense ? 45 : 0,
                minRotation: isDense ? 35 : 0,
                autoSkip: false,
                callback: function (val) {
                  const label = this.getLabelForValue(val as number);
                  if (typeof label === 'string') {
                    if (wrapCategoryLabels) return wrapThaiLabelForVerticalChart(label, labels.length);
                    const parenIdx = label.indexOf(' (');
                    if (parenIdx > 0 && label.length > 20) {
                      return [label.slice(0, parenIdx), label.slice(parenIdx + 1)];
                    }
                    return label.length > 25 ? label.slice(0, 23) + '…' : label;
                  }
                  return label;
                },
              },
            },
            y: {
              stacked: stacked,
              position: 'left',
              grid: { color: gridColor },
              beginAtZero: true,
              ticks: {
                color: tickColor,
                font: { family: fontFamily, size: 11, weight: 'normal' },
                callback: (v) => formatTickValue(v, yCallback),
                stepSize: getChartStepSize(datasets.filter(d => d.yAxisID !== 'y1').flatMap(d => d.data), yStepSize, yMin, yMax),
                maxTicksLimit: 8,
              },
              ...(yMin !== undefined ? { min: yMin } : {}),
              ...(yMax !== undefined ? { suggestedMax: yMax } : {}),
            },
            ...(hasY1
              ? {
                  y1: {
                    stacked: stacked,
                    position: 'right',
                    grid: { display: false },
                    title: y1Label ? { display: true, text: y1Label, font: { family: fontFamily, size: 11, weight: 'normal' } } : {},
                    ticks: {
                      color: '#0F766E',
                      font: { family: fontFamily, size: 11, weight: 'normal' },
                      callback: (v) => formatTickValue(v, y1Callback),
                    },
                    ...(y1Min !== undefined ? { min: y1Min } : {}),
                    ...(y1Max !== undefined ? { suggestedMax: y1Max } : {}),
                  },
                }
              : {}),
          },
        }}
      />
    </div>
  );
}
