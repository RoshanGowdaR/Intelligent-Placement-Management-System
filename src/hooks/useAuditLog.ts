import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

let isAuditLogEnabled = true;

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
          // If table does not exist (404/PGRST204) or permission blocked, disable further attempts to keep console clean
          if (error.code === "42P01" || error.message?.includes("does not exist") || (error as any).status === 404) {
            isAuditLogEnabled = false;
          }
        }
      } catch {
        // Silently tolerate if audit_logs table is unavailable
        isAuditLogEnabled = false;
      }
    },
    [user]
  );

  return { log };
}
