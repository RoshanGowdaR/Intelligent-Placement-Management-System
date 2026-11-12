import { supabase } from "@/integrations/supabase/client";

/**
 * Safely fetches the latest company record linked to a recruiter's user_id
 * (falling back to invited/HR email), avoiding PostgREST PGRST116 errors
 * when multiple rows exist.
 */
export async function fetchCompanyForUser<T = any>(
  userId: string,
  userEmail?: string | null,
  columns = "*"
): Promise<T | null> {
  const { data: byUserId } = await supabase
    .from("companies")
    .select(columns)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (byUserId && byUserId.length > 0) {
    return byUserId[0] as T;
  }

  const cleanEmail = (userEmail || "").trim().toLowerCase();
  if (cleanEmail) {
    const { data: byEmail } = await supabase
      .from("companies")
      .select(columns)
      .ilike("email", cleanEmail)
      .order("created_at", { ascending: false })
      .limit(1);

    if (byEmail && byEmail.length > 0) {
      return byEmail[0] as T;
    }
  }

  return null;
}
