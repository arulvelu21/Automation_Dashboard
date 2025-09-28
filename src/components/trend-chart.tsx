"use client";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export function TrendChart(props: { labels: string[]; pass: number[]; fail: number[] }) {
  const data = {
    labels: props.labels,
    datasets: [
      {
        label: "Pass",
        data: props.pass,
        borderColor: "#2f7fcc",
        backgroundColor: "rgba(47,127,204,0.15)",
        tension: 0.25,
        fill: true,
      },
      {
        label: "Fail",
        data: props.fail,
        borderColor: "#EE1C2E",
        backgroundColor: "rgba(238,28,46,0.15)",
        tension: 0.25,
        fill: true,
      },
    ],
  };
  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      tooltip: { intersect: false },
    },
    interaction: { mode: "index" as const, intersect: false },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0 } },
    },
  };
  return <Line data={data} options={options} />;
}
