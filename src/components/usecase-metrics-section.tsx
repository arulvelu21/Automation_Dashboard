import { getUseCases } from "@/lib/data";
import UseCaseMetricsGrid from "./usecase-metrics-grid";

export async function UseCaseMetricsSection() {
  const useCases = await getUseCases({ limit: 200 });
  const items = useCases.map((u) => ({ id: u.id, name: u.name }));
  return <UseCaseMetricsGrid allUseCases={items} />;
}
