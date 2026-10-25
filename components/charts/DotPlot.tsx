'use client';

import { Scatter } from 'react-chartjs-2';
import { Chart as ChartJS, LinearScale, PointElement, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { baseLegend, fontFamily, tickColor } from '@/lib/chartHelpers';
import { getLinearChartScale } from '@/lib/chartScales';

ChartJS.register(LinearScale, PointElement, Tooltip, Legend, ChartDataLabels);

interface DotSeries { label: string; values: (number | null)[]; color: string }

export default function DotPlot({ labels, series, format, max, connect = false }: {
  labels: string[];
  series: DotSeries[];
  format: (value: number) => string;
  max?: number;
  connect?: boolean;
}) {
  const values = series.flatMap(item => item.values.filter((value): value is number => value !== null && Number.isFinite(value)));
  const scale = getLinearChartScale([0, ...values], {minSpan: 1, lowerBound: 0, fallback: {min: 0, max: 1, step: 0.2}});
  const data = series.map((item, datasetIndex) => ({
    label: item.label,
    data: item.values.flatMap((value, index) => value !== null && Number.isFinite(value) ? [{x: value, y: index}] : []),
    backgroundColor: item.color, borderColor: '#FFFFFF', borderWidth: 2,
    pointStyle: datasetIndex === 0 ? 'circle' as const : 'rectRot' as const,
    pointRadius: 8, pointHoverRadius: 10, clip: false as const,
  }));
  return <Scatter
    role="img"
    aria-label={series.map(item => `${item.label}: ${item.values.map(value => value === null ? 'ไม่มีข้อมูล' : format(value)).join(', ')}`).join('; ')}
    data={{datasets: data}}
    plugins={[{
      id: 'dotConnectors',
      beforeDatasetsDraw(chart) {
        if (!connect || series.length !== 2) return;
        const {ctx, scales: {x, y}} = chart;
        ctx.save(); ctx.strokeStyle = '#CBD5E1'; ctx.lineWidth = 3;
        labels.forEach((_, index) => {
          const first = series[0].values[index], second = series[1].values[index];
          if (first === null || first === undefined || second === null || second === undefined) return;
          ctx.beginPath(); ctx.moveTo(x.getPixelForValue(first), y.getPixelForValue(index));
          ctx.lineTo(x.getPixelForValue(second), y.getPixelForValue(index)); ctx.stroke();
        });
        ctx.restore();
      },
      afterDatasetsDraw(chart) {
        const {ctx, chartArea, scales: {y}} = chart;
        ctx.save(); ctx.fillStyle = '#565656'; ctx.font = `500 11px ${fontFamily}`;
        series.forEach((item, datasetIndex) => labels.forEach((_, index) => {
          if (item.values[index] === null) ctx.fillText(`${item.label}: ไม่มีข้อมูล`, chartArea.left + 6, y.getPixelForValue(index) + (datasetIndex === 0 ? -22 : 30));
        }));
        ctx.restore();
      },
    }]}
    options={{
      responsive: true, maintainAspectRatio: false,
      layout: {padding: {top: 30, bottom: 25, right: 65, left: labels.some(Boolean) ? 10 : 30}},
      plugins: {
        legend: {display: series.length > 1, position: 'top', labels: {...baseLegend.labels}},
        tooltip: {callbacks: {title: items => labels[Number((items[0]?.raw as {y: number})?.y)] || '', label: item => `${item.dataset.label}: ${format((item.raw as {x: number}).x)}`}},
        datalabels: {
          anchor: 'center', align: context => context.datasetIndex === 0 ? 'top' : 'bottom', offset: 13,
          color: '#000000', font: {family: fontFamily, size: 12, weight: 600},
          formatter: (point: {x: number}) => format(point.x), clip: false,
        },
      },
      scales: {
        x: {min: 0, max: max ?? scale.max, grid: {color: '#E2E8F0'}, ticks: {color: tickColor, font: {family: fontFamily, size: 11}, maxTicksLimit: 6}},
        y: {
          min: -0.5, max: Math.max(0.5, labels.length - 0.5), reverse: true,
          afterBuildTicks: axis => {axis.ticks = labels.map((_, index) => ({value: index}));},
          grid: {color: '#F1F5F9'}, border: {display: false},
          ticks: {color: '#000000', font: {family: fontFamily, size: 11}, callback: value => {
            const label = labels[Number(value)] ?? '';
            return label.length > 25 ? [label.slice(0, 25), label.slice(25)] : label;
          }},
        },
      },
    }}
  />;
}
