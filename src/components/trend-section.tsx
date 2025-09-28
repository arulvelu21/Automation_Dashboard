import { TrendChart } from "./trend-chart";

export async function TrendSection() {
  // TODO: Replace with real query grouped by day/week from Postgres
  const labels = Array.from({ length: 12 }).map((_, i) => `W${i + 1}`);
  const pass = labels.map((_, i) => 20 + ((i * 3) % 10));
  const fail = labels.map((_, i) => 2 + ((i * 5) % 6));
  return (
    <div className="card">
      <div className="card-header">Pass/Fail Trend</div>
      <div className="card-content">
        <div className="h-64">
          <TrendChart labels={labels} pass={pass} fail={fail} />
        </div>
      </div>
    </div>
  );
}
