import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface Tenant {
  id: string;
  name: string;
  plan: string;
}

interface TenantContextType {
  tenant: Tenant | null;
  userRole: string | null;
  loading: boolean;
  error: string | null;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  userRole: null,
  loading: true,
  error: null,
});

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setTenant(null);
      setUserRole(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchTenant() {
      try {
        const { data: membership, error: fetchError } = await supabase
          .from("tenant_members")
          .select("tenant_id, role, tenants(id, name, plan)")
          .eq("user_id", user!.id)
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (fetchError) {
          setError(fetchError.message);
          setLoading(false);
          return;
        }

        if (membership?.tenants) {
          setTenant(membership.tenants as unknown as Tenant);
          setUserRole(membership.role);
        } else {
          const companyName = user!.user_metadata?.company || "Mi Empresa";
          const { data: newTenant, error: rpcError } = await supabase.rpc(
            "bootstrap_tenant",
            { p_name: companyName },
          );

          if (cancelled) return;

          if (rpcError) {
            setError(rpcError.message);
            setLoading(false);
            return;
          }

          if (newTenant) {
            setTenant(newTenant as unknown as Tenant);
            setUserRole("admin");
          }
        }
      } catch (err) {
        if (!cancelled) setError("Error inesperado al cargar tenant");
      }
      if (!cancelled) setLoading(false);
    }

    fetchTenant();
    return () => { cancelled = true; };
  }, [user]);

  return (
    <TenantContext.Provider value={{ tenant, userRole, loading, error }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenantContext() {
  return useContext(TenantContext);
}
