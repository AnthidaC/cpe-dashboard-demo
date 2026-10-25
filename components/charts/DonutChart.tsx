'use client';
// components/charts/DonutChart.tsx — Donut Chart (Large Crisp Fonts & Prominent Legend)

import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend, Plugin,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { baseLegend, fontFamily, chartDevicePixelRatio } from '@/lib/chartHelpers';

interface DonutCenterTextOptions {
  centerLabel?: string;
  centerSubLabel?: string;
}

const centerTextPlugin: Plugin<'doughnut', DonutCenterTextOptions> = {
  id: 'donutCenterText',
  beforeDraw(chart, _args, options) {
    const centerLabel = options?.centerLabel;
    const centerSubLabel = options?.centerSubLabel;
    if (!centerLabel && !centerSubLabel) return;

    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    if (!meta || !meta.data || !meta.data[0]) return;
    const x = meta.data[0].x;
    const y = meta.data[0].y;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (centerLabel && centerSubLabel) {
      ctx.font = `700 16px ${fontFamily}`;
      ctx.fillStyle = '#0F172A';
      ctx.fillText(centerLabel, x, y - 9);

      ctx.font = `500 11px ${fontFamily}`;
      ctx.fillStyle = '#64748B';
      ctx.fillText(centerSubLabel, x, y + 11);
    } else if (centerLabel) {
      ctx.font = `700 16px ${fontFamily}`;
      ctx.fillStyle = '#0F172A';
      ctx.fillText(centerLabel, x, y);
    }
    ctx.restore();
  },
};

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels, centerTextPlugin);
ChartJS.defaults.devicePixelRatio = chartDevicePixelRatio;

interface DonutChartProps {
  labels: string[];
  data: number[];
  colors: string[];
  showLabels?: boolean;
  labelCallback?: (value: number, label?: string, index?: number) => string;
  showLegend?: boolean;
  legendPosition?: 'top' | 'bottom' | 'right' | 'left';
  tooltipLabelCallback?: (value: number, index: number) => string;
  centerLabel?: string;
  centerSubLabel?: string;
  cutout?: string | number;
}

export default function DonutChart({
  labels,
  data,
  colors,
  showLabels = false,
  labelCallback,
  showLegend = true,
  legendPosition = 'bottom',
  tooltipLabelCallback,
  centerLabel,
  centerSubLabel,
  cutout = '62%',
}: DonutChartProps) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minWidth: 0 }}>
      <Doughnut
        data={{
          labels,
          datasets: [{
            data,
            backgroundColor: colors,
            borderColor: '#FFFFFF',
            borderWidth: 2,
            hoverOffset: 8,
          }],
        }}
        options={{
          cutout,
          devicePixelRatio: chartDevicePixelRatio,
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            donutCenterText: {
              centerLabel,
              centerSubLabel,
            },
            tooltip: tooltipLabelCallback ? { callbacks: { label: (context: any) => tooltipLabelCallback(Number(context.parsed), context.dataIndex) } } : undefined,
            legend: showLegend
              ? {
                  display: true,
                  position: legendPosition,
                  labels: {
                    ...baseLegend.labels,
                    boxWidth: 12,
                    boxHeight: 12,
                    padding: 10,
                    font: { family: fontFamily, size: 12, weight: 500 },
                  },
                }
              : { display: false },
            datalabels: showLabels
              ? {
                  display: (context: any) => {
                    const val = Number(context.dataset.data[context.dataIndex]);
                    if (!Number.isFinite(val) || val <= 0) return false;
                    if (labelCallback) {
                      const text = labelCallback(val, labels[context.dataIndex], context.dataIndex);
                      return Boolean(text && text.trim().length > 0);
                    }
                    return true;
                  },
                  color: '#0F172A',
                  backgroundColor: 'rgba(255, 255, 255, 0.92)',
                  borderRadius: 3,
                  padding: { top: 1, bottom: 1, left: 4, right: 4 },
                  font: { size: 11, weight: 600, family: fontFamily },
                  formatter: (value: any, context: any) => {
                    if (labelCallback) return labelCallback(Number(value), labels[context.dataIndex], context.dataIndex);
                    return String(value);
                  },
                }
              : { display: false },
          },
        } as any}
      />
    </div>
  );
}
