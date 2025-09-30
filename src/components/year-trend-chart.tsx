"use client";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend } from "chart.js";
import { Chart } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

export function YearTrendChart({ labels, hours, volumes }: { labels: string[]; hours: number[]; volumes: number[] }) {
  const data = {
    labels,
    datasets: [
      {
        type: 'bar' as const,
        label: 'Total Volumes',
        data: volumes,
        backgroundColor: 'rgba(47,127,204,0.25)',
        borderColor: '#2f7fcc',
        borderWidth: 1,
        yAxisID: 'y1',
      },
      {
        type: 'line' as const,
        label: 'Hours Saved',
        data: hours,
        borderColor: '#16a34a',
        backgroundColor: 'rgba(22,163,74,0.15)',
        tension: 0.25,
        fill: true,
        yAxisID: 'y',
      },
    ],
  };
  const options = {
    responsive: true,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: { legend: { position: 'top' as const } },
    scales: {
      y: { type: 'linear' as const, position: 'left' as const, title: { display: true, text: 'Hours' } },
      y1: { type: 'linear' as const, position: 'right' as const, grid: { drawOnChartArea: false }, title: { display: true, text: 'Volumes' } },
    },
  } as const;
  return <Chart type="bar" data={data} options={options} />;
}
