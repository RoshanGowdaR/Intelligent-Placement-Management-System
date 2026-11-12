import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

let isAuditLogEnabled = (() => {
  try {
    return sessionStorage.getItem("ipms_audit_logs_disabled") !== "1";
  } catch {
    return true;
  }
})();

export function useAuditLog() {
  const { user } = useAuth();

  const log = useCallback(
    async (action: string, entityType: string, entityId?: string, details?: Record<string, unknown>) => {
      if (!user || !isAuditLogEnabled) return;
      try {
        const { error } = await supabase.from("audit_logs").insert([{
          user_id: user.id,
          action,
          entity_type: entityType,
          entity_id: entityId ?? null,
          details: (details ?? {}) as any,
        }]);

        if (error) {
          // If table does not exist (PGRST205 / 42P01 / 404), disable further attempts for this session
          const msg = error.message || "";
          if (
            error.code === "PGRST205" ||
            error.code === "42P01" ||
            msg.includes("Could not find") ||
            msg.includes("does not exist") ||
            (error as any).status === 404
          ) {
            isAuditLogEnabled = false;
            try { sessionStorage.setItem("ipms_audit_logs_disabled", "1"); } catch {}
          }
        }
      } catch {
        isAuditLogEnabled = false;
        try { sessionStorage.setItem("ipms_audit_logs_disabled", "1"); } catch {}
      }
    },
    [user]
  );

  return { log };
}
