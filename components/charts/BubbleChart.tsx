'use client';
// components/charts/BubbleChart.tsx — Overhauled Executive Bubble Chart Component

import { useRef } from 'react';
import { Bubble, getElementAtEvent } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LinearScale, PointElement, Tooltip, Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { baseLegend, gridColor, tickColor, fontFamily, chartDevicePixelRatio } from '@/lib/chartHelpers';

ChartJS.register(LinearScale, PointElement, Tooltip, Legend, ChartDataLabels);
ChartJS.defaults.devicePixelRatio = chartDevicePixelRatio;

export interface BubbleDataPoint {
  x: number;
  y: number;
  r: number;
  name?: string;
  shortName?: string;
  satisfaction?: number;
  costPerHead?: number;
  participants?: number;
  budget?: number;
}

export interface BubbleDataset {
  label: string;
  data: BubbleDataPoint[];
  backgroundColor: string;
  borderColor: string;
  borderWidth?: number;
}

interface BubbleChartProps {
  datasets: BubbleDataset[];
  xLabel?: string;
  yLabel?: string;
  xMin?: number;
  xMax?: number;
  xStepSize?: number;
  yMin?: number;
  yMax?: number;
  yStepSize?: number;
  quadrantX?: number;
  quadrantY?: number;
  quadrantLabels?: {
    topLeft?: string;
    topRight?: string;
    bottomLeft?: string;
    bottomRight?: string;
  };
  xCallback?: (v: number) => string;
  yCallback?: (v: number) => string;
  tooltipCallback?: (ctx: { dataset: { label: string }; raw: BubbleDataPoint }) => string;
  showLegend?: boolean;
  onProjectClick?: (datasetIndex: number, index: number) => void;
  showDatalabels?: boolean;
  datalabelFormatter?: (point: BubbleDataPoint, index: number) => string;
  alignCallback?: (point: BubbleDataPoint) => 'top' | 'bottom' | 'left' | 'right';
}

export default function BubbleChart({
  datasets,
  xLabel,
  yLabel,
  xMin,
  xMax,
  xStepSize,
  yMin,
  yMax,
  yStepSize,
  quadrantX,
  quadrantY,
  quadrantLabels,
  xCallback,
  yCallback,
  tooltipCallback,
  showLegend = true,
  onProjectClick,
  showDatalabels = true,
  datalabelFormatter,
  alignCallback,
}: BubbleChartProps) {
  const chartRef = useRef<ChartJS<'bubble'>>(null);

  const ds = datasets.map((d) => ({
    ...d,
    borderWidth: d.borderWidth ?? 2,
    hoverBorderWidth: 3,
    clip: false as const,
  }));

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!chartRef.current || !onProjectClick) return;
    const elements = getElementAtEvent(chartRef.current, event);
    if (elements.length > 0) {
      const { datasetIndex, index } = elements[0];
      onProjectClick(datasetIndex, index);
    }
  };

  const quadrantPlugin = {
    id: 'quadrantPlugin',
    beforeDraw(chart: ChartJS) {
      if (quadrantX === undefined && quadrantY === undefined) return;
      const { ctx, chartArea: { left, top, right, bottom }, scales: { x, y } } = chart;
      ctx.save();

      if (quadrantX !== undefined && quadrantY !== undefined) {
        const xPixel = x.getPixelForValue(quadrantX);
        const yPixel = y.getPixelForValue(quadrantY);

        // 1. Subtle soft background tints for 4 quadrants
        if (xPixel >= left && xPixel <= right && yPixel >= top && yPixel <= bottom) {
          // Top-Left (High Cost-Benefit)
          ctx.fillStyle = 'rgba(16, 185, 129, 0.04)';
          ctx.fillRect(left, top, xPixel - left, yPixel - top);

          // Top-Right (High Investment Quality)
          ctx.fillStyle = 'rgba(30, 97, 240, 0.04)';
          ctx.fillRect(xPixel, top, right - xPixel, yPixel - top);

          // Bottom-Left (Moderate)
          ctx.fillStyle = 'rgba(245, 158, 11, 0.03)';
          ctx.fillRect(left, yPixel, xPixel - left, bottom - yPixel);

          // Bottom-Right (Review)
          ctx.fillStyle = 'rgba(239, 68, 68, 0.03)';
          ctx.fillRect(xPixel, yPixel, right - xPixel, bottom - yPixel);
        }

        // 2. Dashed crosshair lines
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#CBD5E1';

        if (xPixel >= left && xPixel <= right) {
          ctx.beginPath();
          ctx.moveTo(xPixel, top);
          ctx.lineTo(xPixel, bottom);
          ctx.stroke();
        }

        if (yPixel >= top && yPixel <= bottom) {
          ctx.beginPath();
          ctx.moveTo(left, yPixel);
          ctx.lineTo(right, yPixel);
          ctx.stroke();
        }

        // 3. Crisp Quadrant Badges
        if (quadrantLabels) {
          ctx.font = `500 11px ${fontFamily}`;

          const drawBadge = (text: string, xPos: number, yPos: number, align: 'left' | 'right', color: string) => {
            ctx.save();
            ctx.textAlign = align;
            ctx.textBaseline = 'middle';
            const metrics = ctx.measureText(text);
            const w = metrics.width + 16;
            const h = 22;
            const rx = align === 'left' ? xPos : xPos - w;
            const ry = yPos - h / 2;

            ctx.fillStyle = 'rgba(255, 255, 255, 0.90)';
            ctx.strokeStyle = 'rgba(203, 213, 225, 0.8)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(rx, ry, w, h, 4);
            } else {
              ctx.rect(rx, ry, w, h);
            }
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = color;
            ctx.fillText(text, align === 'left' ? xPos + 8 : xPos - 8, yPos);
            ctx.restore();
          };

          if (quadrantLabels.topLeft) {
            const sym = quadrantLabels.topLeft.startsWith('★') ? '' : '★ ';
            drawBadge(`${sym}${quadrantLabels.topLeft}`, left + 8, top + 15, 'left', '#047857');
          }
          if (quadrantLabels.topRight) {
            const sym = quadrantLabels.topRight.startsWith('◆') ? '' : '◆ ';
            drawBadge(`${sym}${quadrantLabels.topRight}`, right - 8, top + 15, 'right', '#1D4ED8');
          }
          if (quadrantLabels.bottomLeft) {
            const sym = quadrantLabels.bottomLeft.startsWith('▲') ? '' : '▲ ';
            drawBadge(`${sym}${quadrantLabels.bottomLeft}`, left + 8, bottom - 15, 'left', '#B45309');
          }
          if (quadrantLabels.bottomRight) {
            const sym = quadrantLabels.bottomRight.startsWith('●') ? '' : '● ';
            drawBadge(`${sym}${quadrantLabels.bottomRight}`, right - 8, bottom - 15, 'right', '#B91C1C');
          }
        }
      }

      ctx.restore();
    },
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minWidth: 0, overflow: 'hidden', cursor: onProjectClick ? 'pointer' : 'default' }}>
      <Bubble
        ref={chartRef}
        data={{ datasets: ds }}
        onClick={handleClick}
        plugins={[quadrantPlugin]}
        options={{
          devicePixelRatio: chartDevicePixelRatio,
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: { top: 35, right: 35, bottom: 15, left: 15 },
          },
          plugins: {
            legend: showLegend ? { labels: { ...baseLegend.labels } } : { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  if (tooltipCallback) return tooltipCallback(ctx as never);
                  const raw = ctx.raw as BubbleDataPoint;
                  const projName = raw.name ?? ctx.dataset.label;
                  const satStr = raw.satisfaction ? ` | ความพึงพอใจ ${raw.satisfaction.toFixed(2)}` : '';
                  return `${projName}: งบ ฿${raw.x.toLocaleString()} บาท | ผู้เข้าร่วม ${raw.y} คน${satStr}`;
                },
              },
            },
            datalabels: {
              display: showDatalabels,
              color: '#1E293B',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderColor: '#CBD5E1',
              borderWidth: 1,
              borderRadius: 4,
              padding: { top: 2, bottom: 2, left: 5, right: 5 },
              font: { size: 11, weight: 400, family: fontFamily },
              align: (ctx) => {
                const raw = ctx.dataset.data[ctx.dataIndex] as BubbleDataPoint;
                if (alignCallback) return alignCallback(raw);
                return 'top';
              },
              anchor: 'center',
              offset: (ctx) => {
                const raw = ctx.dataset.data[ctx.dataIndex] as BubbleDataPoint;
                return (raw?.r || 10) + 4;
              },
              clip: false,
              formatter: (v: BubbleDataPoint, ctx: { dataIndex: number }) => {
                if (datalabelFormatter) return datalabelFormatter(v, ctx.dataIndex);
                return v.name ? (v.name.length > 12 ? v.name.slice(0, 11) + '…' : v.name) : '';
              },
            },
          },
          scales: {
            x: {
              grid: { color: gridColor },
              ticks: {
                color: tickColor,
                font: { family: fontFamily, size: 12, weight: 400 },
                callback: xCallback ? (v) => xCallback(Number(v)) : undefined,
                ...(xStepSize !== undefined ? { stepSize: xStepSize } : {}),
              },
              ...(xMin !== undefined ? { min: xMin } : {}),
              ...(xMax !== undefined ? { max: xMax } : {}),
              title: xLabel ? { display: true, text: xLabel, color: '#1E293B', font: { family: fontFamily, size: 12, weight: 500 } } : { display: false },
            },
            y: {
              grid: { color: gridColor },
              ticks: {
                color: tickColor,
                font: { family: fontFamily, size: 12, weight: 400 },
                callback: yCallback ? (v) => yCallback(Number(v)) : undefined,
                ...(yStepSize !== undefined ? { stepSize: yStepSize } : {}),
              },
              ...(yMin !== undefined ? { min: yMin } : {}),
              ...(yMax !== undefined ? { max: yMax } : {}),
              title: yLabel ? { display: true, text: yLabel, color: '#1E293B', font: { family: fontFamily, size: 12, weight: 500 } } : { display: false },
            },
          },
        }}
      />
    </div>
  );
}
