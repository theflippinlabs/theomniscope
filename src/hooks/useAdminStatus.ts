import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Checks admin status server-side via edge function.
 * Never exposes the admin code to the frontend.
 */
export function useAdminStatus(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const deviceId = localStorage.getItem("oracle_device_id");
    if (!deviceId) return;

    supabase.functions
      .invoke("check-admin", { body: { deviceId } })
      .then(({ data }) => {
        if (data?.isAdmin === true) setIsAdmin(true);
      })
      .catch(() => {
        /* silent – not admin */
      });
  }, []);

  return isAdmin;
}
