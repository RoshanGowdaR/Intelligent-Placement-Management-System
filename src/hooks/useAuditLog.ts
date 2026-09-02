import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useAuditLog() {
  const { user } = useAuth();

  const log = useCallback(
    async (action: string, entityType: string, entityId?: string, details?: Record<string, unknown>) => {
      if (!user) return;
      await supabase.from("audit_logs").insert([{
        user_id: user.id,
        action,
        entity_type: entityType,
        entity_id: entityId ?? null,
        details: (details ?? {}) as any,
      }]);
    },
    [user]
  );

  return { log };
}
