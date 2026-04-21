import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export interface TrialStatus {
  hasTrial: boolean;
  isExpired: boolean;
  daysLeft: number;
  trialEndsAt: Date | null;
}

export function useTrial(): TrialStatus {
  const { user } = useAuth();
  const [trialEndsAt, setTrialEndsAt] = useState<Date | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setTrialEndsAt(null);
      setLoaded(true);
      return;
    }

    // Read from profiles table — always fresh, updated by extend_trial RPC
    supabase
      .from("profiles")
      .select("trial_ends_at")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setTrialEndsAt(data?.trial_ends_at ? new Date(data.trial_ends_at) : null);
        setLoaded(true);
      });
  }, [user]);

  if (!loaded || !trialEndsAt) {
    return { hasTrial: false, isExpired: false, daysLeft: 0, trialEndsAt: null };
  }

  const diffMs = trialEndsAt.getTime() - Date.now();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return {
    hasTrial: true,
    isExpired: daysLeft <= 0,
    daysLeft: Math.max(0, daysLeft),
    trialEndsAt,
  };
}
