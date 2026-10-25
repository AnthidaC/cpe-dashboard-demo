'use client';
// components/charts/HBarChart.tsx — Horizontal Bar Chart Component (Large Crisp Fonts)

import { useEffect, useRef, useState } from 'react';
import { Bar, getElementAtEvent } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Tooltip, Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { baseLegend, baseTooltip, gridColor, tickColor, fontFamily, chartDevicePixelRatio } from '@/lib/chartHelpers';
import { getChartStepSize } from '@/lib/chartScales';
import { horizontalChartLayout } from '@/lib/chartLayout';
import { generateCleanProjectAlias, thaiVisualLength } from '@/lib/thaiLabelUtils';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, ChartDataLabels);
ChartJS.defaults.devicePixelRatio = chartDevicePixelRatio;

interface HBarChartProps {
  labels: string[];
  datasets: {
    label: string;
    data: (number | null)[];
    xAxisID?: 'x' | 'x1';
    backgroundColor: string | string[];
    borderColor?: string | string[];
    borderRadius?: number;
    borderWidth?: number;
  }[];
  xMin?: number;
  xMax?: number;
  xStepSize?: number;
  xCallback?: (v: number) => string;
  x1Min?: number;
  x1Max?: number;
  x1Label?: string;
  x1Callback?: (v: number) => string;
  showDatalabels?: boolean;
  datalabelCallback?: (v: number, datasetIndex: number, dataIndex: number) => string;
  tooltipLabelCallback?: (v: number, datasetIndex: number, dataIndex: number) => string | string[];
  datalabelDisplay?: (datasetIndex: number, dataIndex: number) => boolean;
  referenceLines?: { value: number; label: string; color: string }[];
  showLegend?: boolean;
  onProjectClick?: (index: number, label: string) => void;
  yPosition?: 'left' | 'right';
  yDisplay?: boolean;
  xReverse?: boolean;
  yTicksDisplay?: boolean;
  labelWidth?: number;
  wrapFullLabels?: boolean;
  stacked?: boolean;
  customPadding?: {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
  };
}

function formatTickValue(v: number | string, customCb?: (num: number) => string): string {
  const num = typeof v === 'number' ? v : parseFloat(String(v));
  if (isNaN(num)) return String(v);
  const cleanNum = Math.round(num * 100) / 100;
  if (customCb) return customCb(cleanNum);
  return Number.isInteger(cleanNum) ? String(cleanNum) : cleanNum.toFixed(1);
}

export { generateCleanProjectAlias };

export default function HBarChart({
  labels,
  datasets,
  xMin,
  xMax,
  xStepSize,
  xCallback,
  x1Min,
  x1Max,
  x1Label,
  x1Callback,
  showDatalabels = false,
  datalabelCallback,
  tooltipLabelCallback,
  datalabelDisplay,
  referenceLines = [],
  showLegend = false,
  onProjectClick,
  yPosition = 'left',
  yDisplay = true,
  xReverse = false,
  yTicksDisplay = true,
  labelWidth,
  wrapFullLabels = false,
  stacked = false,
  customPadding,
}: HBarChartProps) {
  const chartRef = useRef<ChartJS<'bar'>>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(640);
  const hasLabels = labels.length > 0;
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height);
      setContainerWidth(w);
      if (chartRef.current && w > 0 && h > 0) {
        chartRef.current.resize(w, h);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasLabels]);

  useEffect(() => {
    const element = containerRef.current;
    const chart = chartRef.current;
    if (!element || !chart) return;
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      chart.resize(Math.round(rect.width), Math.round(rect.height));
    }
  }, [labels.length]);
  const effectiveLabelWidth = labelWidth ?? (() => {
    if (!hasLabels) return 175;
    const maxVis = Math.max(0, ...labels.map(l => thaiVisualLength(wrapFullLabels ? l : generateCleanProjectAlias(l))));
    return Math.max(120, Math.min(185, Math.round(maxVis * 7.7 + 16)));
  })();
  const { compact: compactLabels, labelWidth: axisLabelWidth } = horizontalChartLayout(containerWidth, effectiveLabelWidth, yDisplay && yTicksDisplay && yPosition === 'left');
  const compactStateRef = useRef({ compactLabels, labels });
  compactStateRef.current = { compactLabels, labels };
  const referenceLinesRef = useRef(referenceLines);
  referenceLinesRef.current = referenceLines;
  const valueLabelWidth = showDatalabels ? Math.min(115, Math.max(58, ...datasets.flatMap((dataset, datasetIndex) =>
    dataset.data.map((value, index) => value === null || (datalabelDisplay && !datalabelDisplay(datasetIndex, index)) ? 0
      : (datalabelCallback ? datalabelCallback(value, datasetIndex, index) : String(value)).length * 7.2 + 16)))) : 14;
  if (labels.length === 0) return <div role="status" style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--text-muted, #565656)', fontSize: 14, lineHeight: 1.65 }}>ไม่มีข้อมูลสำหรับกราฟนี้</div>;
  const hasX1 = datasets.some((d) => d.xAxisID === 'x1');

  const isGroupedMultiSeries = datasets.length > 1 && !stacked;
  const adaptiveBarThickness = compactLabels
    ? (labels.length <= 5 && !isGroupedMultiSeries ? 14 : 11)
    : isGroupedMultiSeries
    ? 15
    : labels.length <= 4
    ? 26
    : labels.length <= 6
    ? 22
    : 17;

  const ds = datasets.map((d) => ({
    ...d,
    xAxisID: d.xAxisID ?? 'x',
    borderRadius: d.borderRadius ?? 5,
    borderWidth: d.borderWidth ?? 0,
    maxBarThickness: adaptiveBarThickness,
    categoryPercentage: labels.length <= 5 ? 0.76 : 0.72,
    barPercentage: labels.length <= 5 ? 0.82 : 0.78,
  }));

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!chartRef.current || !onProjectClick) return;
    const elements = getElementAtEvent(chartRef.current, event);
    if (elements.length > 0) {
      const index = elements[0].index;
      onProjectClick(index, labels[index]);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', minWidth: 0, overflow: 'hidden', cursor: onProjectClick ? 'pointer' : 'default' }}>
      <Bar
        role="img"
        aria-label={`${datasets.map(dataset => dataset.label).join(' และ ')}: ${labels.join(', ')}`}
        ref={chartRef}
        data={{ labels, datasets: ds }}
        onClick={handleClick}
        plugins={[{
          id: 'horizontalReferenceLines',
          afterDraw(chart) {
            const {ctx, chartArea: {top, bottom, left, right}, scales: {x}} = chart;
            ctx.save();
            referenceLinesRef.current.forEach(line => {
              const position = x.getPixelForValue(line.value);
              if (position < left || position > right) return;
              ctx.strokeStyle = line.color;
              ctx.lineWidth = 1.5;
              ctx.setLineDash([4, 4]);
              ctx.beginPath(); ctx.moveTo(position, top); ctx.lineTo(position, bottom); ctx.stroke();
              ctx.setLineDash([]);
              ctx.fillStyle = line.color;
              ctx.font = `500 11px ${fontFamily}`;
              ctx.textAlign = 'center';
              ctx.fillText(line.label, position, top - 8);
            });
            ctx.font = `400 12px ${fontFamily}`;
            ctx.fillStyle = '#475569'; ctx.textAlign = 'left';
            chart.data.datasets.forEach(dataset => dataset.data.forEach((value, index) => {
              if (value === null) ctx.fillText('ไม่มีข้อมูล', x.getPixelForValue(0) + 6, chart.scales.y.getPixelForValue(index) + 4);
            }));
            ctx.restore();
          },
        }, {
          id: 'compactProjectNames',
          afterDatasetsDraw(chart) {
            const compactState = compactStateRef.current;
            if (!compactState.compactLabels) return;
            const { ctx, chartArea, scales: { y } } = chart;
            ctx.save();
            ctx.font = `400 12px ${fontFamily}`;
            ctx.fillStyle = '#1E293B';
            ctx.textAlign = 'left';
            compactState.labels.forEach((label, index) => {
              let text = generateCleanProjectAlias(label);
              while (text.length > 1 && ctx.measureText(text).width > chartArea.width) text = text.slice(0, -2);
              if (text !== generateCleanProjectAlias(label)) text += '…';
              ctx.fillText(text, chartArea.left, y.getPixelForValue(index) - 12, chartArea.width);
            });
            ctx.restore();
          },
        }]}
        options={{
          devicePixelRatio: chartDevicePixelRatio,
          responsive: true,
          animation: false,
          maintainAspectRatio: false,
          indexAxis: 'y',
           layout: {
            padding: {
              left: Math.min(customPadding?.left ?? (xReverse ? valueLabelWidth : 12), containerWidth * 0.22),
              right: Math.min(customPadding?.right ?? (xReverse ? 12 : valueLabelWidth + 8), containerWidth * 0.28),
              top: customPadding?.top ?? (showLegend ? 28 : (hasX1 ? 30 : (referenceLines.length > 0 ? 24 : 12))),
              bottom: customPadding?.bottom ?? 6,
            },
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
                ...(tooltipLabelCallback ? {
                  label: (ctx) => tooltipLabelCallback(ctx.parsed.x ?? 0, ctx.datasetIndex, ctx.dataIndex),
                } : {}),
              },
            },
            legend: showLegend
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
                  display: ctx => ctx.dataset.data[ctx.dataIndex] !== null && (!datalabelDisplay || datalabelDisplay(ctx.datasetIndex, ctx.dataIndex)),
                  color: '#1E293B',
                  font: { size: 12, weight: 600, family: fontFamily },
                  anchor: 'end',
                  align: xReverse ? 'left' : 'right',
                  offset: 4,
                  clip: false,
                  formatter: (v: number, ctx: { datasetIndex: number; dataIndex: number }) =>
                    datalabelCallback ? datalabelCallback(v, ctx.datasetIndex, ctx.dataIndex) : String(v),
                }
              : { display: false },
          },
          scales: {
            x: {
              stacked: stacked,
              position: 'bottom',
              grid: { color: gridColor },
              ticks: {
                color: tickColor,
                font: { family: fontFamily, size: 12, weight: 400 },
                callback: (v) => formatTickValue(v, xCallback),
                stepSize: getChartStepSize(datasets.filter(d => d.xAxisID !== 'x1').flatMap(d => d.data), xStepSize, xMin, xMax),
                maxTicksLimit: containerWidth < 460 ? 4 : 6,
              },
              ...(xMin !== undefined ? { min: xMin } : {}),
              ...(xMax !== undefined ? { suggestedMax: xMax } : {}),
              reverse: xReverse,
            },
            ...(hasX1
              ? {
                  x1: {
                    stacked: stacked,
                    position: 'top',
                    grid: { display: false },
                    title: x1Label ? { display: true, text: x1Label, font: { family: fontFamily, size: 12, weight: 500 } } : {},
                    ticks: {
                      color: '#0F766E',
                      font: { family: fontFamily, size: 12, weight: 400 },
                      callback: (v) => formatTickValue(v, x1Callback),
                    },
                    ...(x1Min !== undefined ? { min: x1Min } : {}),
                    ...(x1Max !== undefined ? { suggestedMax: x1Max } : {}),
                  },
                }
              : {}),
            y: {
              stacked: stacked,
              display: yDisplay,
              position: yPosition,
              afterFit: (axis) => {
                if (yDisplay && yPosition === 'left') {
                  axis.width = axisLabelWidth;
                }
              },
              grid: { display: true, color: '#F8FAFC' },
              border: {
                display: true,
                color: '#E2E8F0',
                width: 1,
              },
              ticks: {
                display: yTicksDisplay && !compactLabels,
                autoSkip: false,
                color: '#0F172A',
                font: { family: fontFamily, size: 13, weight: 400, lineHeight: 1.45 },
                padding: yPosition === 'right' ? -170 : 8,
                callback: function (val) {
                  const rawLabel = this.getLabelForValue(val as number);
                  if (typeof rawLabel === 'string') {
                    if (wrapFullLabels) return rawLabel;
                    return generateCleanProjectAlias(rawLabel);
                  }
                  return rawLabel;
                },
              },
            },
          },
        }}
      />
    </div>
  );
}
