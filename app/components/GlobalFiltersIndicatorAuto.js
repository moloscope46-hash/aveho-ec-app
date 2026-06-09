"use client";
import { useGlobalFilters, GlobalFiltersIndicator } from "../../lib/useGlobalFilters";
export function GlobalFiltersIndicatorAuto() {
  const f = useGlobalFilters();
  return <GlobalFiltersIndicator filters={f} />;
}
