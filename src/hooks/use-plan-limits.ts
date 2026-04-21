import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "./use-tenant";

export interface PlanLimits {
  models: number | null; // null = unlimited
  users: number | null;
}

export interface PlanUsage {
  models: number;
  users: number;
}

const LIMITS: Record<string, PlanLimits> = {
  starter: { models: 3, users: 5 },
  pro: { models: null, users: null },
  enterprise: { models: null, users: null },
};

function getLimits(plan: string | undefined): PlanLimits {
  return LIMITS[plan ?? "starter"] ?? LIMITS.starter;
}

export function usePlanLimits() {
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const plan = tenant?.plan;

  const modelsQuery = useQuery<number>({
    queryKey: ["plan-limits-models", tenantId],
    queryFn: async () => {
      if (!tenantId) return 0;
      const { count, error } = await supabase
        .from("models")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!tenantId,
    staleTime: 0,
  });

  const usersQuery = useQuery<number>({
    queryKey: ["plan-limits-users", tenantId],
    queryFn: async () => {
      if (!tenantId) return 0;
      const { count, error } = await supabase
        .from("tenant_members")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!tenantId,
    staleTime: 0,
  });

  const limits = getLimits(plan);
  const usage: PlanUsage = {
    models: modelsQuery.data ?? 0,
    users: usersQuery.data ?? 0,
  };

  const canCreateModel =
    limits.models === null || usage.models < limits.models;
  const canCreateUser =
    limits.users === null || usage.users < limits.users;

  return {
    limits,
    usage,
    canCreateModel,
    canCreateUser,
    isLoading: modelsQuery.isLoading || usersQuery.isLoading,
    plan: plan ?? "starter",
  };
}
