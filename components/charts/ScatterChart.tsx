'use client';
// components/charts/ScatterChart.tsx — Mixed Bar + Scatter Chart with Collision-Aware Datalabels

import { useRef } from 'react';
import { Chart, getElementAtEvent } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LinearScale, PointElement, Tooltip, Legend,
  BarElement, BarController, ScatterController
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { baseLegend, baseTooltip, gridColor, tickColor, fontFamily, chartDevicePixelRatio } from '@/lib/chartHelpers';

ChartJS.register(
  LinearScale, PointElement, Tooltip, Legend,
  BarElement, BarController, ScatterController,
  ChartDataLabels
);
ChartJS.defaults.devicePixelRatio = chartDevicePixelRatio;

export interface ScatterPoint {
  x: number;
  y: number;
  name?: string;
  shortName?: string;
  actualY?: number;
  isOutlier?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  projectObj?: any;
}

export interface ScatterDataset {
  label: string;
  data: ScatterPoint[];
  backgroundColor: string;
  borderColor: string;
  pointRadius?: number | number[];
  pointHoverRadius?: number | number[];
  borderWidth?: number;
  pointStyle?: string | string[];
}

interface ScatterChartProps {
  datasets: ScatterDataset[];
  barData?: number[];
  xMin?: number;
  xMax?: number;
  xStepSize?: number;
  yMin?: number;
  yMax?: number;
  yStepSize?: number;
  xLabel?: string;
  yLabel?: string;
  xTickCallback?: (v: number | string) => string;
  yTickCallback?: (v: number | string) => string;
  tooltipLabelCallback?: (ctx: { dataset: { label: string }; raw: ScatterPoint }) => string | string[];
  showLegend?: boolean;
  showDatalabels?: boolean;
  datalabelFormatter?: (point: ScatterPoint, index: number) => string;
  quadrantX?: number;
  quadrantY?: number;
  quadrantXLabel?: string;
  quadrantYLabel?: string;
  onProjectClick?: (datasetIndex: number, index: number) => void;
}

interface SmartPlacement {
  align: 'top' | 'bottom' | 'left' | 'right';
  offset: number;
  display: boolean | 'auto';
}

function calculateSmartPlacements(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chart: any,
  formatter?: (pt: ScatterPoint, idx: number) => string
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
    radius: number;
    text: string;
    textLen: number;
  }

  const points: PointPixel[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chart.data?.datasets?.forEach((ds: any, dsIdx: number) => {
    if (ds.type === 'bar') return;
    const data = ds.data as ScatterPoint[];
    if (!Array.isArray(data)) return;

    data.forEach((pt, dIdx) => {
      if (typeof pt.x !== 'number' || typeof pt.y !== 'number') return;
      const px = scales.x.getPixelForValue(pt.x);
      const py = scales.y.getPixelForValue(pt.y);
      if (isNaN(px) || isNaN(py)) return;

      const text = formatter
        ? formatter(pt, dIdx)
        : (pt.shortName ?? pt.name ?? '');
      const radius = (Array.isArray(ds.pointRadius) ? ds.pointRadius[dIdx] : ds.pointRadius) ?? 8;

      points.push({
        key: `${dsIdx}_${dIdx}`,
        px,
        py,
        radius: typeof radius === 'number' ? radius : 8,
        text,
        textLen: text.length,
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
    const boxWidth = Math.max(34, Math.min(130, pt.textLen * 7.2 + 12));
    const boxHeight = 20;
    const baseOffset = pt.radius + 5; // ~13px

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

      // 2. Collision with all other dots
      for (const other of points) {
        if (other.key === pt.key) continue;
        const clampedX = Math.max(cand.box.x1, Math.min(cand.box.x2, other.px));
        const clampedY = Math.max(cand.box.y1, Math.min(cand.box.y2, other.py));
        const dist = Math.hypot(other.px - clampedX, other.py - clampedY);

        if (dist <= other.radius + 3) {
          // Label directly covers or touches another dot
          penalty += 100000;
        } else if (dist < 22) {
          penalty += (22 - dist) * 1500;
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
  formatter?: (pt: ScatterPoint, idx: number) => string
): SmartPlacement {
  const chart = ctx.chart;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartAny = chart as any;
  const cacheKey = `${chart.width}_${chart.height}_${chart.data?.datasets?.length ?? 0}`;

  if (!chartAny._smartPlacementCache || chartAny._smartPlacementCacheKey !== cacheKey) {
    chartAny._smartPlacementCache = calculateSmartPlacements(chart, formatter);
    chartAny._smartPlacementCacheKey = cacheKey;
  }

  const key = `${ctx.datasetIndex}_${ctx.dataIndex}`;
  return (
    chartAny._smartPlacementCache?.get(key) ?? {
      align: ctx.dataIndex % 2 === 0 ? 'top' : 'bottom',
      offset: 13,
      display: 'auto',
    }
  );
}

export default function ScatterChart({
  datasets,
  barData,
  xMin,
  xMax,
  xStepSize,
  yMin,
  yMax,
  yStepSize,
  xLabel,
  yLabel,
  xTickCallback,
  yTickCallback,
  tooltipLabelCallback,
  showLegend = true,
  showDatalabels = false,
  datalabelFormatter,
  quadrantX,
  quadrantY,
  quadrantXLabel,
  quadrantYLabel,
  onProjectClick,
}: ScatterChartProps) {
  const chartRef = useRef<ChartJS<'scatter'>>(null);
  const refProps = useRef({ quadrantX, quadrantY, quadrantXLabel, quadrantYLabel });
  refProps.current = { quadrantX, quadrantY, quadrantXLabel, quadrantYLabel };

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!chartRef.current || !onProjectClick) return;
    const elements = getElementAtEvent(chartRef.current, event);
    if (elements.length > 0) {
      const { datasetIndex, index } = elements[0];
      if (barData && datasetIndex === 0) return; // Ignore click on 'average' bar
      const adjustedDatasetIndex = barData ? datasetIndex - 1 : datasetIndex;
      onProjectClick(adjustedDatasetIndex, index);
    }
  };

  const ds = [
    ...(barData
      ? [
          {
            type: 'bar' as const,
            label: 'ค่าเฉลี่ยกลุ่ม',
            data: barData.map((val, idx) => ({ x: idx + 1, y: +val.toFixed(2) })),
            backgroundColor: 'rgba(226, 232, 240, 0.45)',
            borderColor: '#94A3B8',
            borderWidth: 1.5,
            barThickness: 50,
            order: 2,
            datalabels: { display: false },
          },
        ]
      : []),
    ...datasets.map((d) => ({
      type: 'scatter' as const,
      ...d,
      pointRadius: d.pointRadius ?? 8,
      pointHoverRadius: d.pointHoverRadius ?? 11,
      borderWidth: d.borderWidth ?? 2,
      order: 1,
      clip: false as const,
    })),
  ];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minWidth: 0, overflow: 'hidden', cursor: onProjectClick ? 'pointer' : 'default' }}>
      <Chart
        ref={chartRef}
        type="scatter"
        onClick={handleClick}
        plugins={[
          {
            id: 'invalidateSmartPlacementCache',
            beforeUpdate(chart) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              delete (chart as any)._smartPlacementCache;
            },
          },
          {
            id: 'scatterReferenceCrosshairs',
            beforeDatasetsDraw(chart) {
              const { quadrantX: qx, quadrantY: qy, quadrantXLabel: qxLabel, quadrantYLabel: qyLabel } = refProps.current;
              if (qx === undefined && qy === undefined) return;
              const { ctx, chartArea: { left, top, right, bottom }, scales: { x, y } } = chart;
              ctx.save();
              ctx.setLineDash([4, 4]);
              ctx.lineWidth = 1.25;
              ctx.strokeStyle = '#94A3B8';
              ctx.fillStyle = '#475569';
              ctx.font = `500 11px ${fontFamily}`;

              if (qx !== undefined) {
                const xPos = x.getPixelForValue(qx);
                if (xPos >= left && xPos <= right) {
                  ctx.beginPath();
                  ctx.moveTo(xPos, top);
                  ctx.lineTo(xPos, bottom);
                  ctx.stroke();
                  if (qxLabel) {
                    ctx.textAlign = xPos > right - 90 ? 'right' : 'left';
                    ctx.fillText(qxLabel, xPos + (xPos > right - 90 ? -6 : 6), bottom - 8);
                  }
                }
              }

              if (qy !== undefined) {
                const yPos = y.getPixelForValue(qy);
                if (yPos >= top && yPos <= bottom) {
                  ctx.beginPath();
                  ctx.moveTo(left, yPos);
                  ctx.lineTo(right, yPos);
                  ctx.stroke();
                  if (qyLabel) {
                    ctx.textAlign = 'right';
                    ctx.fillText(qyLabel, right - 6, yPos < top + 20 ? yPos + 14 : yPos - 6);
                  }
                }
              }
              ctx.restore();
            },
          },
        ]}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data={{ datasets: ds as any }}
        options={{
          devicePixelRatio: chartDevicePixelRatio,
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: { top: 24, right: 28, bottom: 8, left: 10 },
          },
          plugins: {
            legend: showLegend
              ? {
                  position: 'top',
                  labels: {
                    ...baseLegend.labels,
                    font: { family: fontFamily, size: 12, weight: 500 },
                    padding: 12,
                  },
                }
              : { display: false },
            tooltip: {
              ...baseTooltip,
              titleFont: { ...baseTooltip.titleFont, weight: 600 },
              bodyFont: { ...baseTooltip.bodyFont, weight: 400 },
              ...(tooltipLabelCallback
                ? { callbacks: { label: (ctx) => tooltipLabelCallback(ctx as never) } }
                : {}),
            },
            datalabels: showDatalabels
              ? {
                  display: (ctx) => {
                    if (!showDatalabels) return false;
                    return getSmartPlacement(ctx, datalabelFormatter).display;
                  },
                  color: '#1E293B',
                  backgroundColor: 'rgba(255, 255, 255, 0.94)',
                  borderColor: '#CBD5E1',
                  borderWidth: 1,
                  borderRadius: 4,
                  padding: { top: 2, bottom: 2, left: 5, right: 5 },
                  font: { family: fontFamily, size: 11, weight: 500 },
                  anchor: 'center',
                  align: (ctx) => getSmartPlacement(ctx, datalabelFormatter).align,
                  offset: (ctx) => getSmartPlacement(ctx, datalabelFormatter).offset,
                  clip: false,
                  formatter: (v: ScatterPoint, ctx: { dataIndex: number }) => {
                    if (datalabelFormatter) return datalabelFormatter(v, ctx.dataIndex);
                    return v.shortName ?? v.name ?? '';
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
                maxTicksLimit: 6,
                ...(xStepSize !== undefined ? { stepSize: xStepSize } : {}),
                ...(xTickCallback ? { callback: xTickCallback } : {}),
              },
              ...(xMin !== undefined ? { min: xMin } : {}),
              ...(xMax !== undefined ? { max: xMax } : {}),
              ...(xLabel ? { title: { display: true, text: xLabel, font: { family: fontFamily, size: 12, weight: 500 }, color: '#1E293B' } } : {}),
            },
            y: {
              grid: { color: gridColor },
              ticks: {
                color: tickColor,
                font: { family: fontFamily, size: 12, weight: 400 },
                maxTicksLimit: 6,
                ...(yStepSize !== undefined ? { stepSize: yStepSize } : {}),
                ...(yTickCallback ? { callback: yTickCallback } : {}),
              },
              ...(yMin !== undefined ? { min: yMin } : {}),
              ...(yMax !== undefined ? { max: yMax } : {}),
              ...(yLabel ? { title: { display: true, text: yLabel, font: { family: fontFamily, size: 12, weight: 500 }, color: '#1E293B' } } : {}),
            },
          },
        }}
      />
    </div>
  );
}
