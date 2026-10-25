'use client';
// components/charts/PolarChart.tsx — Polar Area Chart (Large Crisp Fonts)

import { PolarArea } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale, ArcElement, Tooltip, Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { baseLegend, fontFamily, chartDevicePixelRatio } from '@/lib/chartHelpers';

ChartJS.register(RadialLinearScale, ArcElement, Tooltip, Legend, ChartDataLabels);
ChartJS.defaults.devicePixelRatio = chartDevicePixelRatio;

interface PolarChartProps {
  labels: string[];
  data: number[];
  colors: string[];
  borderColors: string[];
  datalabelCallback?: (v: number) => string;
}

export default function PolarChart({ labels, data, colors, borderColors, datalabelCallback }: PolarChartProps) {
  return (
    <PolarArea
      data={{
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: borderColors,
          borderWidth: 2,
        }],
      }}
      options={{
        devicePixelRatio: chartDevicePixelRatio,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { ...baseLegend.labels, color: '#1E293B', font: { family: fontFamily, size: 13, weight: 500 } } },
          datalabels: {
            display: !!datalabelCallback,
            formatter: (val: number) => (datalabelCallback ? datalabelCallback(val) : String(val)),
            font: { family: fontFamily, size: 12, weight: 600 },
            color: '#1E293B',
            backgroundColor: 'rgba(255, 255, 255, 0.88)',
            borderRadius: 4,
            padding: { top: 2, bottom: 2, left: 5, right: 5 },
          },
        },
        scales: {
          r: {
            grid: { color: '#E2E8F0' },
            pointLabels: {
              font: { family: fontFamily, size: 12, weight: 400 },
              color: '#334155',
            },
            ticks: { display: false },
            beginAtZero: true,
          },
        },
      }}
    />
  );
}
