import { useMemo } from "react";
import {
  useResources,
  useActivities,
  useCostObjects,
  useDrivers,
  useCostCenters,
  useActivityCenters,
  useCostObjectCenters,
} from "./use-supabase-data";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "./use-tenant";

/**
 * Allocation Engine for ABC Costing.
 *
 * Implements the cost propagation flow:
 *   Resources → (drivers) → Activities → (drivers) → Cost Objects
 *
 * Supports 4 driver modes per Guia_maestra.md:
 *   - Uniforme con valor total
 *   - Uniforme sin valor total
 *   - Extendido con valor total
 *   - Extendido sin valor total
 *
 * Formula (Especificacion_logica.md):
 *   Costo Neto = Costo Operativo + Costo Recibido - Costo Asignado
 */

interface DriverLine {
  id: string;
  driver_id: string;
  destination_id: string;
  value: number;
  percentage: number;
}

interface Driver {
  id: string;
  name: string;
  type: "uniform" | "extended";
  source_type: "resource" | "activity" | "resource_center" | "activity_center";
  source_id: string;
  destination_type: "activity" | "cost_object" | "resource" | "activity_center" | "cost_object_center";
  total_value: number | null;
}

export interface AllocationEntry {
  source_id: string;
  source_code: string;
  source_name: string;
  source_type: "resource" | "activity" | "resource_center" | "activity_center";
  source_amount: number;
  driver_id: string;
  driver_name: string;
  driver_type: "uniform" | "extended";
  destination_id: string;
  destination_code: string;
  destination_name: string;
  destination_type: "activity" | "cost_object" | "resource" | "activity_center" | "cost_object_center";
  percentage: number;
  allocated_amount: number;
}

export interface ActivityCostSummary {
  id: string;
  code: string;
  name: string;
  type: string;
  direct_amount: number; // amount from dictionary
  received_amount: number; // cost received from resource drivers
  total_cost: number; // direct + received
}

export interface CostObjectSummary {
  id: string;
  code: string;
  name: string;
  type: string;
  direct_amount: number;
  received_amount: number;
  total_cost: number;
}

export function useAllocation() {
  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  const resources = useResources();
  const activities = useActivities();
  const costObjects = useCostObjects();
  const drivers = useDrivers();
  const costCenters = useCostCenters();
  const activityCenters = useActivityCenters();
  const costObjectCenters = useCostObjectCenters();

  // Fetch ALL driver_lines for this tenant's drivers in one query
  const allDriverIds = drivers.items.map((d) => d.id);

  const driverLinesQuery = useQuery<DriverLine[]>({
    queryKey: ["all_driver_lines", tenantId, allDriverIds.join(",")],
    queryFn: async () => {
      if (allDriverIds.length === 0) return [];
      const { data, error } = await supabase
        .from("driver_lines")
        .select("*")
        .in("driver_id", allDriverIds);
      if (error) throw error;
      return (data ?? []) as DriverLine[];
    },
    enabled: !!tenantId && allDriverIds.length > 0,
  });

  const allLines = driverLinesQuery.data ?? [];
  const isLoading =
    resources.isLoading ||
    activities.isLoading ||
    costObjects.isLoading ||
    drivers.isLoading ||
    driverLinesQuery.isLoading ||
    costCenters.isLoading ||
    activityCenters.isLoading ||
    costObjectCenters.isLoading;

  // Build lookup maps
  const resourceMap = useMemo(
    () => new Map(resources.items.map((r) => [r.id, r])),
    [resources.items],
  );
  const activityMap = useMemo(
    () => new Map(activities.items.map((a) => [a.id, a])),
    [activities.items],
  );
  const costObjectMap = useMemo(
    () => new Map(costObjects.items.map((c) => [c.id, c])),
    [costObjects.items],
  );
  const costCenterMap = useMemo(
    () =>
      new Map(
        costCenters.items.map((c) => {
          const amount = resources.items
            .filter((r) => r.center_id === c.id)
            .reduce((s, r) => s + r.amount, 0);
          return [c.id, { ...c, amount }];
        }),
      ),
    [costCenters.items, resources.items],
  );
  const activityCenterMap = useMemo(
    () =>
      new Map(
        activityCenters.items.map((c) => {
          const amount = activities.items
            .filter((a) => a.center_id === c.id)
            .reduce((s, a) => s + a.amount, 0);
          return [c.id, { ...c, amount }];
        }),
      ),
    [activityCenters.items, activities.items],
  );

  // Calculate allocations
  const result = useMemo(() => {
    const allocations: AllocationEntry[] = [];
    const resourceReceived: Record<string, number> = {};
    const activityReceived: Record<string, number> = {};
    const costObjectReceived: Record<string, number> = {};
    const activityCenterReceived: Record<string, number> = {};
    const costObjectCenterReceived: Record<string, number> = {};
    const resourceCenterReceived: Record<string, number> = {};

    // Stage 0: Resource → Resource (indirect resource transfers)
    for (const driver of drivers.items) {
      if (
        (driver.source_type !== "resource" &&
          driver.source_type !== "resource_center") ||
        driver.destination_type !== "resource"
      )
        continue;
      const lines = allLines.filter((l) => l.driver_id === driver.id);
      if (lines.length === 0) continue;

      let sourceAmount = 0;
      let rCode = "";
      let rName = "";

      if (driver.source_type === "resource") {
        const r = resourceMap.get(driver.source_id);
        if (!r) continue;
        sourceAmount = r.amount + (resourceReceived[r.id] || 0);
        rCode = r.code;
        rName = r.name;
      } else {
        const cc = costCenterMap.get(driver.source_id);
        if (!cc) continue;
        sourceAmount = resourceCenterReceived[driver.source_id] || 0;
        rCode = cc.code;
        rName = cc.name;
      }

      for (const line of lines) {
        const allocatedAmount = (sourceAmount * line.percentage) / 100;
        const destR = resourceMap.get(line.destination_id);
        resourceReceived[line.destination_id] =
          (resourceReceived[line.destination_id] || 0) + allocatedAmount;

        allocations.push({
          source_id: driver.source_id,
          source_code: rCode,
          source_name: rName,
          source_type: driver.source_type,
          source_amount: sourceAmount,
          driver_id: driver.id,
          driver_name: driver.name,
          driver_type: driver.type,
          destination_id: line.destination_id,
          destination_code: destR?.code ?? "",
          destination_name: destR?.name ?? "",
          destination_type: "resource",
          percentage: line.percentage,
          allocated_amount: allocatedAmount,
        });
      }
    }

    // Stage 1: Process drivers in order — resource sources first, then activity sources
    // This ensures activityReceived and activityCenterReceived are populated
    // before activity/activity_center sources use them.
    const stage1Drivers = drivers.items
      .filter((d) => d.destination_type !== "resource")
      .sort((a, b) => {
        const order = (st: string) =>
          st === "resource" || st === "resource_center" ? 0 : 1;
        return order(a.source_type) - order(b.source_type);
      });
    for (const driver of stage1Drivers) {
      const lines = allLines.filter((l) => l.driver_id === driver.id);
      if (lines.length === 0) continue;

      // Get source amount (including received for resources)
      let sourceAmount = 0;
      let sourceCode = "";
      let sourceName = "";
      if (driver.source_type === "resource") {
        const r = resourceMap.get(driver.source_id);
        if (r) {
          sourceAmount = r.amount + (resourceReceived[r.id] || 0);
          sourceCode = r.code;
          sourceName = r.name;
        }
      } else if (driver.source_type === "activity") {
        const a = activityMap.get(driver.source_id);
        if (a) {
          sourceAmount = a.amount;
          sourceCode = a.code;
          sourceName = a.name;
        }
      } else if (driver.source_type === "resource_center") {
        const cc = costCenterMap.get(driver.source_id);
        if (cc) {
          sourceAmount = resourceCenterReceived[driver.source_id] || 0;
          sourceCode = cc.code;
          sourceName = cc.name;
        }
      } else if (driver.source_type === "activity_center") {
        const ac = activityCenterMap.get(driver.source_id);
        if (ac) {
          sourceAmount = activityCenterReceived[driver.source_id] || 0;
          sourceCode = ac.code;
          sourceName = ac.name;
        }
      }

      for (const line of lines) {
        const allocatedAmount = (sourceAmount * line.percentage) / 100;

        // Resolve destination name
        let destCode = "";
        let destName = "";
        if (driver.destination_type === "activity") {
          const a = activityMap.get(line.destination_id);
          if (a) {
            destCode = a.code;
            destName = a.name;
          }
          activityReceived[line.destination_id] =
            (activityReceived[line.destination_id] || 0) + allocatedAmount;
        } else if (driver.destination_type === "activity_center") {
          const ac = activityCenters.items.find((c) => c.id === line.destination_id);
          if (ac) {
            destCode = ac.code;
            destName = ac.name;
          }
          activityCenterReceived[line.destination_id] =
            (activityCenterReceived[line.destination_id] || 0) + allocatedAmount;
        } else if (driver.destination_type === "cost_object_center") {
          const coc = costObjectCenters.items.find((c) => c.id === line.destination_id);
          if (coc) {
            destCode = coc.code;
            destName = coc.name;
          }
          costObjectCenterReceived[line.destination_id] =
            (costObjectCenterReceived[line.destination_id] || 0) + allocatedAmount;
        } else if (driver.destination_type === "resource") {
          const r = resourceMap.get(line.destination_id);
          if (r) {
            destCode = r.code;
            destName = r.name;
          }
          resourceReceived[line.destination_id] =
            (resourceReceived[line.destination_id] || 0) + allocatedAmount;
        } else {
          const co = costObjectMap.get(line.destination_id);
          if (co) {
            destCode = co.code;
            destName = co.name;
          }
          costObjectReceived[line.destination_id] =
            (costObjectReceived[line.destination_id] || 0) + allocatedAmount;
        }

        allocations.push({
          source_id: driver.source_id,
          source_code: sourceCode,
          source_name: sourceName,
          source_type: driver.source_type,
          source_amount: sourceAmount,
          driver_id: driver.id,
          driver_name: driver.name,
          driver_type: driver.type,
          destination_id: line.destination_id,
          destination_code: destCode,
          destination_name: destName,
          destination_type: driver.destination_type,
          percentage: line.percentage,
          allocated_amount: allocatedAmount,
        });
      }
    }

    // Now for activities that are sources of drivers to cost_objects,
    // add received amounts to their source_amount for second-stage allocation
    // Re-calculate stage 2 with updated activity totals
    const activityTotals: Record<string, number> = {};
    for (const a of activities.items) {
      activityTotals[a.id] = a.amount + (activityReceived[a.id] || 0);
    }

    // Recalculate stage 2 allocations using activity totals (direct + received)
    const stage2Allocations: AllocationEntry[] = [];
    const stage2CostObjectReceived: Record<string, number> = {};
    // Remove Stage 1 contributions for activity→cost_object_center drivers
    // (Stage 2 will recalculate them with correct amounts)
    for (const driver of drivers.items) {
      if (
        (driver.source_type === "activity" || driver.source_type === "activity_center") &&
        driver.destination_type === "cost_object_center"
      ) {
        const lines = allLines.filter((l) => l.driver_id === driver.id);
        for (const line of lines) {
          costObjectCenterReceived[line.destination_id] = 0;
        }
      }
    }

    for (const driver of drivers.items) {
      if (
        (driver.source_type !== "activity" &&
          driver.source_type !== "activity_center") ||
        (driver.destination_type !== "cost_object" && 
          driver.destination_type !== "cost_object_center")
      )
        continue;

      const lines = allLines.filter((l) => l.driver_id === driver.id);
      if (lines.length === 0) continue;

      let aCode = "";
      let aName = "";
      let totalActivityCost = 0;

      if (driver.source_type === "activity") {
        const a = activityMap.get(driver.source_id);
        if (!a) continue;
        aCode = a.code;
        aName = a.name;
        totalActivityCost = activityTotals[driver.source_id] || 0;
      } else {
        const ac = activityCenterMap.get(driver.source_id);
        if (!ac) continue;
        aCode = ac.code;
        aName = ac.name;
        totalActivityCost = activityCenterReceived[driver.source_id] || 0;
      }

      for (const line of lines) {
        const allocatedAmount = (totalActivityCost * line.percentage) / 100;
        let destCode = "";
        let destName = "";

        if (driver.destination_type === "cost_object_center") {
          const coc = costObjectCenters.items.find((c) => c.id === line.destination_id);
          if (coc) {
            destCode = coc.code;
            destName = coc.name;
          }
          costObjectCenterReceived[line.destination_id] =
            (costObjectCenterReceived[line.destination_id] || 0) + allocatedAmount;
        } else {
          const co = costObjectMap.get(line.destination_id);
          if (co) {
            destCode = co.code;
            destName = co.name;
          }
          stage2CostObjectReceived[line.destination_id] =
            (stage2CostObjectReceived[line.destination_id] || 0) +
            allocatedAmount;
        }

        // Update the allocation entry if it exists, or add new one
        const existingIdx = allocations.findIndex(
          (al) =>
            al.driver_id === driver.id &&
            al.destination_id === line.destination_id,
        );
        const entry: AllocationEntry = {
          source_id: driver.source_id,
          source_code: aCode,
          source_name: aName,
          source_type: driver.source_type,
          source_amount: totalActivityCost,
          driver_id: driver.id,
          driver_name: driver.name,
          driver_type: driver.type,
          destination_id: line.destination_id,
          destination_code: destCode,
          destination_name: destName,
          destination_type: driver.destination_type,
          percentage: line.percentage,
          allocated_amount: allocatedAmount,
        };
        if (existingIdx >= 0) {
          allocations[existingIdx] = entry;
        } else {
          stage2Allocations.push(entry);
        }
      }
    }

    // Merge stage2 into allocations
    const finalAllocations = [
      ...allocations.filter(
        (a) =>
          !(
            (a.source_type === "activity" ||
              a.source_type === "activity_center") &&
            (a.destination_type === "cost_object" || a.destination_type === "cost_object_center")
          ),
      ),
      ...stage2Allocations,
      ...allocations.filter(
        (a) =>
          (a.source_type === "activity" ||
            a.source_type === "activity_center") &&
          (a.destination_type === "cost_object" || a.destination_type === "cost_object_center") &&
          !stage2Allocations.some(
            (s) =>
              s.driver_id === a.driver_id &&
              s.destination_id === a.destination_id,
          ),
      ),
    ];

    // Merge cost object received from both stages
    const mergedCostObjectReceived: Record<string, number> = {};
    for (const [id, amount] of Object.entries(costObjectReceived)) {
      mergedCostObjectReceived[id] =
        (mergedCostObjectReceived[id] || 0) + amount;
    }
    for (const [id, amount] of Object.entries(stage2CostObjectReceived)) {
      mergedCostObjectReceived[id] =
        (mergedCostObjectReceived[id] || 0) + amount;
    }

    // Build summaries
    const activitySummaries: ActivityCostSummary[] = activities.items.map(
      (a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        type: a.type,
        direct_amount: a.amount,
        received_amount: activityReceived[a.id] || 0,
        total_cost: a.amount + (activityReceived[a.id] || 0),
      }),
    );

    const costObjectSummaries: CostObjectSummary[] = costObjects.items.map(
      (co) => ({
        id: co.id,
        code: co.code,
        name: co.name,
        type: co.type,
        direct_amount: co.amount,
        received_amount: mergedCostObjectReceived[co.id] || 0,
        total_cost: co.amount + (mergedCostObjectReceived[co.id] || 0),
      }),
    );

    const totalResourceCost = resources.items.reduce((s, r) => s + r.amount, 0);
    const totalAllocated = finalAllocations.reduce(
      (s, a) => s + a.allocated_amount,
      0,
    );

    return {
      allocations: finalAllocations,
      activitySummaries,
      costObjectSummaries,
      activityReceived,
      costObjectReceived: mergedCostObjectReceived,
      resourceReceived,
      resourceCenterReceived,
      activityCenterReceived,
      costObjectCenterReceived,
      totalResourceCost,
      totalAllocated,
    };
  }, [
    drivers.items,
    allLines,
    resources.items,
    activities.items,
    costObjects.items,
    resourceMap,
    activityMap,
    costObjectMap,
    costCenterMap,
    activityCenterMap,
    activityCenters.items,
    costObjectCenters.items,
  ]);

  return {
    ...result,
    isLoading,
    resources: resources.items,
    activities: activities.items,
    costObjects: costObjects.items,
    drivers: drivers.items,
  };
}
