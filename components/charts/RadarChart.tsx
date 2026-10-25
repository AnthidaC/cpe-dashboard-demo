'use client';
// components/charts/RadarChart.tsx — Radar Chart (Large Crisp Fonts)

import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale, PointElement, LineElement,
  Filler, Tooltip, Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { baseLegend, fontFamily, chartDevicePixelRatio } from '@/lib/chartHelpers';
import { getChartStepSize } from '@/lib/chartScales';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, ChartDataLabels);
ChartJS.defaults.devicePixelRatio = chartDevicePixelRatio;

/** Plugin to ensure multi-line point labels at every vertex are strictly center-aligned */
const centerPointLabelsPlugin = {
  id: 'centerPointLabels',
  beforeDraw(chart: any) {
    const scale = chart.scales?.r;
    if (scale && scale._pointLabelItems) {
      scale._pointLabelItems.forEach((item: any) => {
        if (item && typeof item.left === 'number' && typeof item.right === 'number') {
          item.x = (item.left + item.right) / 2;
          item.textAlign = 'center';
        }
      });
    }
  },
};

interface RadarDataset {
  label: string;
  data: (number | null)[];
  borderColor: string;
  backgroundColor: string;
  pointBackgroundColor: string | string[];
  borderWidth?: number;
  pointRadius?: number;
  pointHoverRadius?: number;
  pointBorderColor?: string | string[];
  pointBorderWidth?: number;
}

interface RadarChartProps {
  labels: (string | string[])[];
  datasets: RadarDataset[];
  min?: number;
  max?: number;
  stepSize?: number;
  isPercentage?: boolean;
  tooltipTitleCallback?: (context: any[]) => string;
  tooltipLabelCallback?: (context: any) => string | string[];
}

export default function RadarChart({
  labels,
  datasets,
  min = 0,
  max,
  stepSize,
  isPercentage = false,
  tooltipTitleCallback,
  tooltipLabelCallback,
}: RadarChartProps) {
  const numericValues = datasets.flatMap(d => d.data.filter((v): v is number => typeof v === 'number'));
  const maxVal = numericValues.length > 0 ? Math.max(...numericValues) : 0;
  
  const suggestedMax = max ?? (
    isPercentage
      ? 100
      : maxVal <= 5 ? 6 : maxVal <= 8 ? 10 : Math.ceil(maxVal * 1.2)
  );

  const tickStep = getChartStepSize(numericValues, stepSize, min, suggestedMax);

  return (
    <Radar
      data={{ labels, datasets }}
      plugins={[centerPointLabelsPlugin]}
      options={{
        devicePixelRatio: chartDevicePixelRatio,
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 8, bottom: 8, left: 14, right: 14 },
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'center',
            labels: {
              ...baseLegend.labels,
              color: '#1E293B',
              font: { family: fontFamily, size: 12, weight: 600 },
              boxWidth: 12,
              boxHeight: 12,
              padding: 12,
            },
          },
          datalabels: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.94)',
            titleFont: { family: fontFamily, size: 13, weight: 600 },
            bodyFont: { family: fontFamily, size: 12, weight: 400 },
            padding: 10,
            boxPadding: 4,
            callbacks: {
              ...(tooltipTitleCallback ? { title: tooltipTitleCallback } : {}),
              ...(tooltipLabelCallback ? { label: tooltipLabelCallback } : {}),
            },
          },
        },
        scales: {
          r: {
            grid: {
              color: '#E2E8F0',
              lineWidth: 1,
            },
            angleLines: {
              display: true,
              color: '#E2E8F0',
              lineWidth: 1,
            },
            ticks: {
              display: true,
              color: '#64748B',
              font: { family: fontFamily, size: 10.5, weight: 600 },
              stepSize: tickStep,
              maxTicksLimit: 6,
              precision: isPercentage ? 0 : 0,
              showLabelBackdrop: true,
              backdropColor: 'rgba(255, 255, 255, 0.92)',
              backdropPadding: 4,
              callback: isPercentage ? (v) => `${v}%` : (v) => `${v}`,
            },
            pointLabels: {
              color: '#0F172A',
              font: { family: fontFamily, size: 12, weight: 600, lineHeight: 1.35 },
              padding: 8,
            },
            min,
            suggestedMax,
          },
        },
      }}
    />
  );
}
