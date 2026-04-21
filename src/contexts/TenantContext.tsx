import { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface Tenant {
  id: string;
  name: string;
  plan: string;
  is_active: boolean;
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
  const { user, signOut } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // track whether this user bootstrapped their own tenant (admins) so we
  // don't sign them out when the realtime channel fires on their own creates
  const isTenantOwner = useRef(false);

  useEffect(() => {
    if (!user) {
      setTenant(null);
      setUserRole(null);
      setLoading(false);
      isTenantOwner.current = false;
      return;
    }

    let cancelled = false;

    async function fetchTenant() {
      try {
        const { data: membership, error: fetchError } = await supabase
          .from("tenant_members")
          .select("tenant_id, role, tenants(id, name, plan, is_active)")
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
          isTenantOwner.current = membership.role === "admin";
        } else if (user!.user_metadata?.is_invited) {
          // Invited user with no membership — they were removed. Sign out immediately.
          if (!cancelled) await signOut();
          return;
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
            isTenantOwner.current = true;
          }
        }
      } catch (err) {
        if (!cancelled) setError("Error inesperado al cargar tenant");
      }
      if (!cancelled) setLoading(false);
    }

    fetchTenant();

    // Realtime: watch for this user's membership being deleted and sign them out immediately
    const channel = supabase
      .channel(`tenant_member_watch_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "tenant_members",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Only sign out invited users — admins own the tenant, their row
          // should never be deleted by someone else
          if (!isTenantOwner.current) {
            signOut();
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, signOut]);

  return (
    <TenantContext.Provider value={{ tenant, userRole, loading, error }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenantContext() {
  return useContext(TenantContext);
}
