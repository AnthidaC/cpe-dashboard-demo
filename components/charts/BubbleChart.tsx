'use client';
// components/charts/BubbleChart.tsx — Overhauled Executive Bubble Chart Component with Collision-Aware Datalabels

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

interface SmartPlacement {
  align: 'top' | 'bottom' | 'left' | 'right';
  offset: number;
  display: boolean | 'auto';
}

function calculateSmartPlacements(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chart: any,
  formatter?: (pt: BubbleDataPoint, idx: number) => string,
  alignCallback?: (point: BubbleDataPoint) => 'top' | 'bottom' | 'left' | 'right'
): Map<string, SmartPlacement> {
  const placements = new Map<string, SmartPlacement>();
  const scales = chart?.scales;
  const chartArea = chart?.chartArea;
  if (!scales?.x || !scales?.y || !chartArea) {
    return placements;
  }

  interface PointPixel {
    key: string;
    px: number;
    py: number;
    r: number;
    text: string;
    textLen: number;
    raw: BubbleDataPoint;
  }

  const points: PointPixel[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chart.data?.datasets?.forEach((ds: any, dsIdx: number) => {
    const data = ds.data as BubbleDataPoint[];
    if (!Array.isArray(data)) return;

    data.forEach((pt, dIdx) => {
      if (typeof pt.x !== 'number' || typeof pt.y !== 'number') return;
      const px = scales.x.getPixelForValue(pt.x);
      const py = scales.y.getPixelForValue(pt.y);
      if (isNaN(px) || isNaN(py)) return;

      const text = formatter
        ? formatter(pt, dIdx)
        : (pt.shortName ?? pt.name ?? '');
      const r = typeof pt.r === 'number' ? pt.r : 10;

      points.push({
        key: `${dsIdx}_${dIdx}`,
        px,
        py,
        r,
        text,
        textLen: text.length,
        raw: pt,
      });
    });
  });

  interface Box {
    x1: number;
    x2: number;
    y1: number;
    y2: number;
  }
  const placedBoxes: Box[] = [];

  // Sort: higher Y on canvas first (bottom of chart), to place labels naturally
  const sortedPoints = [...points].sort((a, b) => b.py - a.py);

  for (const pt of sortedPoints) {
    if (alignCallback) {
      const customAlign = alignCallback(pt.raw);
      if (customAlign) {
        placements.set(pt.key, {
          align: customAlign,
          offset: pt.r + 5,
          display: 'auto',
        });
        continue;
      }
    }

    const boxWidth = Math.max(34, Math.min(130, pt.textLen * 7.2 + 12));
    const boxHeight = 20;
    const baseOffset = pt.r + 5;

    const candidates: Array<{
      align: 'top' | 'bottom' | 'left' | 'right';
      offset: number;
      box: Box;
    }> = [
      {
        align: 'top',
        offset: baseOffset,
        box: {
          x1: pt.px - boxWidth / 2,
          x2: pt.px + boxWidth / 2,
          y1: pt.py - baseOffset - boxHeight,
          y2: pt.py - baseOffset,
        },
      },
      {
        align: 'bottom',
        offset: baseOffset,
        box: {
          x1: pt.px - boxWidth / 2,
          x2: pt.px + boxWidth / 2,
          y1: pt.py + baseOffset,
          y2: pt.py + baseOffset + boxHeight,
        },
      },
      {
        align: 'right',
        offset: baseOffset,
        box: {
          x1: pt.px + baseOffset,
          x2: pt.px + baseOffset + boxWidth,
          y1: pt.py - boxHeight / 2,
          y2: pt.py + boxHeight / 2,
        },
      },
      {
        align: 'left',
        offset: baseOffset,
        box: {
          x1: pt.px - baseOffset - boxWidth,
          x2: pt.px - baseOffset,
          y1: pt.py - boxHeight / 2,
          y2: pt.py + boxHeight / 2,
        },
      },
    ];

    let bestCandidate = candidates[0];
    let minPenalty = Infinity;

    for (const cand of candidates) {
      let penalty = 0;

      // 1. Boundary clipping
      if (cand.box.x1 < chartArea.left + 4) penalty += 50000;
      if (cand.box.x2 > chartArea.right - 4) penalty += 50000;
      if (cand.box.y1 < chartArea.top + 4) penalty += 50000;
      if (cand.box.y2 > chartArea.bottom - 4) penalty += 50000;

      // 2. Collision with all other bubbles
      for (const other of points) {
        if (other.key === pt.key) continue;
        const clampedX = Math.max(cand.box.x1, Math.min(cand.box.x2, other.px));
        const clampedY = Math.max(cand.box.y1, Math.min(cand.box.y2, other.py));
        const dist = Math.hypot(other.px - clampedX, other.py - clampedY);

        if (dist <= other.r + 2) {
          // Label directly covers or touches another bubble
          penalty += 100000;
        } else if (dist < other.r + 18) {
          penalty += (other.r + 18 - dist) * 1500;
        }
      }

      // 3. Collision with already placed labels
      for (const placed of placedBoxes) {
        const overlapX = Math.max(0, Math.min(cand.box.x2, placed.x2) - Math.max(cand.box.x1, placed.x1));
        const overlapY = Math.max(0, Math.min(cand.box.y2, placed.y2) - Math.max(cand.box.y1, placed.y1));
        if (overlapX > 0 && overlapY > 0) {
          penalty += 35000;
        }
      }

      // 4. Direction tie-breaker preference
      const dirPref = cand.align === 'top' ? 0 : cand.align === 'right' ? 5 : cand.align === 'bottom' ? 10 : 15;
      penalty += dirPref;

      if (penalty < minPenalty) {
        minPenalty = penalty;
        bestCandidate = cand;
      }
    }

    const shouldDisplay: boolean | 'auto' = minPenalty >= 100000 ? false : 'auto';

    placements.set(pt.key, {
      align: bestCandidate.align,
      offset: bestCandidate.offset,
      display: shouldDisplay,
    });

    if (shouldDisplay !== false) {
      placedBoxes.push(bestCandidate.box);
    }
  }

  return placements;
}

function getSmartPlacement(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  formatter?: (pt: BubbleDataPoint, idx: number) => string,
  alignCallback?: (point: BubbleDataPoint) => 'top' | 'bottom' | 'left' | 'right'
): SmartPlacement {
  const chart = ctx.chart;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartAny = chart as any;
  const cacheKey = `${chart.width}_${chart.height}_${chart.data?.datasets?.length ?? 0}`;

  if (!chartAny._smartPlacementCache || chartAny._smartPlacementCacheKey !== cacheKey) {
    chartAny._smartPlacementCache = calculateSmartPlacements(chart, formatter, alignCallback);
    chartAny._smartPlacementCacheKey = cacheKey;
  }

  const key = `${ctx.datasetIndex}_${ctx.dataIndex}`;
  return (
    chartAny._smartPlacementCache?.get(key) ?? {
      align: 'top',
      offset: (ctx.dataset?.data?.[ctx.dataIndex]?.r ?? 10) + 5,
      display: 'auto',
    }
  );
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
        plugins={[
          {
            id: 'invalidateSmartBubblePlacementCache',
            beforeUpdate(chart) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              delete (chart as any)._smartPlacementCache;
            },
          },
          quadrantPlugin,
        ]}
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
                  return `${projName}: งบ ฿${raw.x.toLocaleString()} บาท | ผู้เข้าร่วม ${raw.participants ?? raw.y} คน${satStr}`;
                },
              },
            },
            datalabels: showDatalabels
              ? {
                  display: (ctx) => {
                    if (!showDatalabels) return false;
                    return getSmartPlacement(ctx, datalabelFormatter, alignCallback).display;
                  },
                  color: '#1E293B',
                  backgroundColor: 'rgba(255, 255, 255, 0.94)',
                  borderColor: '#CBD5E1',
                  borderWidth: 1,
                  borderRadius: 4,
                  padding: { top: 2, bottom: 2, left: 5, right: 5 },
                  font: { size: 11, weight: 500, family: fontFamily },
                  anchor: 'center',
                  align: (ctx) => getSmartPlacement(ctx, datalabelFormatter, alignCallback).align,
                  offset: (ctx) => getSmartPlacement(ctx, datalabelFormatter, alignCallback).offset,
                  clip: false,
                  formatter: (v: BubbleDataPoint, ctx: { dataIndex: number }) => {
                    if (datalabelFormatter) return datalabelFormatter(v, ctx.dataIndex);
                    return v.shortName ?? (v.name ? (v.name.length > 12 ? v.name.slice(0, 11) + '…' : v.name) : '');
                  },
                }
              : { display: false },
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
