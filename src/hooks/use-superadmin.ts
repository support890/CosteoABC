import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export function useSuperAdmin() {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsSuperAdmin(false);
      setLoading(false);
      return;
    }

    supabase
      .from("profiles")
      .select("is_superadmin")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setIsSuperAdmin(data?.is_superadmin ?? false);
        setLoading(false);
      });
  }, [user]);

  return { isSuperAdmin, loading };
}
