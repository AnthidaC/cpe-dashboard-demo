'use client';
// components/charts/LineChart.tsx

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement,
  LineElement, Filler, Tooltip, Legend,
} from 'chart.js';
import type { TooltipItem } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { baseLegend, gridColor, tickColor, fontFamily, chartDevicePixelRatio } from '@/lib/chartHelpers';

ChartJS.register(
  CategoryScale, LinearScale, PointElement,
  LineElement, Filler, Tooltip, Legend, ChartDataLabels,
);

if (typeof window !== 'undefined') {
  (window as unknown as { Chart: typeof ChartJS }).Chart = ChartJS;
}

interface LineDataset {
  label: string;
  data: (number | null)[];
  borderColor: string;
  backgroundColor: string;
  borderDash?: number[];
  tension?: number;
  fill?: boolean;
  pointRadius?: number;
  pointBackgroundColor?: string;
  clip?: number | false;
}

interface LineChartProps {
  labels: string[];
  datasets: LineDataset[];
  yMin?: number;
  yMax?: number;
  yCallback?: (v: number | string) => string;
  showDatalabels?: boolean;
  datalabelCallback?: (v: number) => string;
  legendPosition?: 'top' | 'bottom';
  tooltipTitleCallback?: (index: number) => string;
}

export default function LineChart({
  labels,
  datasets,
  yMin,
  yMax,
  yCallback,
  showDatalabels = false,
  datalabelCallback,
  legendPosition = 'bottom',
  tooltipTitleCallback,
}: LineChartProps) {
  const ds = datasets.map((d) => ({
    ...d,
    cubicInterpolationMode: 'monotone' as const,
    tension: d.tension !== undefined ? d.tension : 0.3,
    fill: d.fill ?? true,
    pointRadius: d.pointRadius ?? 5,
    clip: false as const,
  }));

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minWidth: 0 }}>
      <Line
        data={{ labels, datasets: ds }}
        options={{
          devicePixelRatio: chartDevicePixelRatio, responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: { top: 28, right: 20, left: 10, bottom: 8 },
          },
          plugins: {
            legend: {
              position: legendPosition,
              labels: { ...baseLegend.labels, boxWidth: 12, padding: 14 },
            },
            ...(tooltipTitleCallback
              ? {
                  tooltip: {
                    callbacks: {
                      title: (items: TooltipItem<'line'>[]) => {
                        const idx = items[0]?.dataIndex;
                        return idx !== undefined && tooltipTitleCallback(idx)
                          ? tooltipTitleCallback(idx)
                          : (items[0]?.label ?? '');
                      },
                    },
                  },
                }
              : {}),
            datalabels: showDatalabels
              ? {
                  display: (ctx) => {
                    const currentVal = ctx.dataset.data[ctx.dataIndex];
                    if (currentVal === undefined || currentVal === null) return false;
                    // Deduplicate identical values at the same data point so labels don't smear over each other
                    const chart = ctx.chart;
                    for (let i = 0; i < ctx.datasetIndex; i++) {
                      const meta = chart.getDatasetMeta(i);
                      if (!meta.hidden) {
                        const prevVal = chart.data.datasets[i]?.data?.[ctx.dataIndex];
                        if (prevVal !== undefined && prevVal !== null && Math.abs(Number(currentVal) - Number(prevVal)) < 0.1) {
                          return false;
                        }
                      }
                    }
                    return true;
                  },
                  color: '#0F172A', backgroundColor: 'rgba(255, 255, 255, 0.88)', borderRadius: 3, padding: { top: 1, bottom: 1, left: 4, right: 4 },
                  font: { size: 11, weight: 600, family: fontFamily },
                  anchor: 'center',
                  align: (ctx) => {
                    // If another visible series sits just above this point, put this label below to avoid overlap
                    const chart = ctx.chart;
                    const v = Number(ctx.dataset.data[ctx.dataIndex]);
                    const yScale = chart.scales.y;
                    const range = yScale ? (yScale.max - yScale.min) || 1 : 1;
                    const nearMin = yScale ? (v - yScale.min) / range < 0.12 : false;
                    if (nearMin) return 'top';
                    for (let i = 0; i < chart.data.datasets.length; i++) {
                      if (i === ctx.datasetIndex || chart.getDatasetMeta(i).hidden) continue;
                      const other = Number(chart.data.datasets[i]?.data?.[ctx.dataIndex]);
                      if (!isNaN(other) && other > v && (other - v) / range < 0.12) return 'bottom';
                    }
                    return 'top';
                  },
                  offset: 7,
                  clip: false,
                  formatter: datalabelCallback ?? ((v: number) => String(v)),
                }
              : { display: false },
          },
          scales: {
            x: {
              offset: true, grid: { color: gridColor },
              ticks: { color: tickColor, font: { family: fontFamily, size: 12, weight: 400 } },
            },
            y: {
              grid: { color: gridColor },
              ticks: {
                color: tickColor,
                font: { family: fontFamily, size: 12, weight: 400 },
                ...(yCallback ? { callback: yCallback } : {}),
              },
              ...(yMin !== undefined ? { min: yMin } : {}),
              ...(yMax !== undefined ? { suggestedMax: yMax } : {}),
            },
          },
        }}
      />
    </div>
  );
}
