import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getAuthRedirects } from "@/lib/authRedirects";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (userId: string, userEmail?: string): Promise<AppRole | null> => {
    try {
      const normalizedEmail = (userEmail || "").trim().toLowerCase();

      // 1. Primary admin email auto-provisioning
      if (normalizedEmail === "gowdaroshan49@gmail.com") {
        await supabase.from("user_roles").upsert(
          { user_id: userId, role: "admin" as AppRole, email: normalizedEmail },
          { onConflict: "user_id,role" }
        );
        setRole("admin");
        return "admin";
      }

      // 2. Check existing assigned roles in user_roles
      const { data: roleRecords } = await supabase
        .from("user_roles")
        .select("role, email")
        .eq("user_id", userId);

      // Backfill email on user_role if it was missing
      if (roleRecords && roleRecords.some((r) => !r.email) && normalizedEmail) {
        await supabase
          .from("user_roles")
          .update({ email: normalizedEmail })
          .eq("user_id", userId)
          .is("email", null);
      }

      const existingRoles = (roleRecords ?? []).map((r) => r.role);

      if (existingRoles.includes("admin")) {
        setRole("admin");
        return "admin";
      }

      if (existingRoles.includes("company")) {
        // Sync pending company profile if stored during registration flow
        try {
          const rawPending = sessionStorage.getItem("pending_company_details");
          if (rawPending) {
            const pending = JSON.parse(rawPending);
            sessionStorage.removeItem("pending_company_details");
            await supabase.from("companies").upsert({
              user_id: userId,
              email: normalizedEmail,
              name: pending.name || "Visiting Company",
              website: pending.website || null,
              industry: pending.industry || null,
              description: pending.description || null,
              hr_name: pending.hrName || null,
              hr_phone: pending.phone || null,
              job_role: pending.jobRole || null,
              salary_package: pending.salaryPackage || null,
              max_backlogs: Number(pending.maxBacklogs) || 0,
            });
          }
        } catch (_) {}

        setRole("company");
        return "company";
      }

      // 3. Auto-detect Company Recruiter by checking email in company_invites or companies
      if (normalizedEmail) {
        const { data: invite } = await supabase
          .from("company_invites" as any)
          .select("id, company_name, accepted_at")
          .ilike("email", normalizedEmail)
          .maybeSingle();

        const { data: matchedComp } = await supabase
          .from("companies")
          .select("id, name")
          .or(`user_id.eq.${userId},email.ilike.${normalizedEmail}`)
          .maybeSingle();

        if (invite || matchedComp) {
          // Provision company role with email
          await supabase.from("user_roles").upsert(
            { user_id: userId, role: "company" as AppRole, email: normalizedEmail },
            { onConflict: "user_id,role" }
          );

          // Link company database row with user ID and email
          if (matchedComp) {
            await supabase
              .from("companies")
              .update({ user_id: userId, email: normalizedEmail })
              .eq("id", matchedComp.id);
          } else if (invite) {
            // Check if company exists by name
            const { data: compByName } = await supabase
              .from("companies")
              .select("id")
              .ilike("name", invite.company_name || "")
              .maybeSingle();

            if (compByName) {
              await supabase
                .from("companies")
                .update({ user_id: userId, email: normalizedEmail })
                .eq("id", compByName.id);
            } else {
              await supabase.from("companies").insert({
                name: invite.company_name || "Visiting Partner",
                user_id: userId,
                email: normalizedEmail,
              });
            }
          }

          // Mark invite accepted
          if (invite) {
            await supabase
              .from("company_invites" as any)
              .update({ accepted_at: new Date().toISOString() })
              .ilike("email", normalizedEmail);
          }

          // Sync pending company profile if stored
          try {
            const rawPending = sessionStorage.getItem("pending_company_details");
            if (rawPending) {
              const pending = JSON.parse(rawPending);
              sessionStorage.removeItem("pending_company_details");
              await supabase.from("companies").upsert({
                user_id: userId,
                name: pending.name || invite?.company_name || "Visiting Company",
                website: pending.website || null,
                industry: pending.industry || null,
                description: pending.description || null,
                hr_name: pending.hrName || null,
                hr_phone: pending.phone || null,
                job_role: pending.jobRole || null,
                salary_package: pending.salaryPackage || null,
                max_backlogs: Number(pending.maxBacklogs) || 0,
              });
            }
          } catch (_) {}

          setRole("company");
          return "company";
        }
      }

      // 4. Default to student
      const resolvedRole: AppRole = existingRoles[0] ?? "student";
      setRole(resolvedRole);
      return resolvedRole;
    } catch (err) {
      console.error("fetchRole exception:", err);
      const fallback: AppRole = userEmail === "gowdaroshan49@gmail.com" ? "admin" : "student";
      setRole(fallback);
      return fallback;
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const userRole = await fetchRole(session.user.id, session.user.email);
        const isRecoveryFlow =
          window.location.pathname === "/reset-password" ||
          window.location.hash.includes("type=recovery") ||
          new URLSearchParams(window.location.search).get("type") === "recovery" ||
          Boolean(new URLSearchParams(window.location.search).get("token_hash"));

        const isEmailProvider = (session.user.app_metadata?.provider ?? "email") === "email";

        // Student session guard: if browser was closed, log out only email/password sessions.
        // OAuth flows may start in a fresh tab/window and should not be force-signed-out.
        if (userRole === "student" && isEmailProvider && !isRecoveryFlow && !sessionStorage.getItem("student_session_active")) {
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setRole(null);
        } else if (userRole === "student") {
          sessionStorage.setItem("student_session_active", "true");
        }
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Update role and session silently in the background.
          // DO NOT toggle loading to true so existing page state, test forms & dialogs are NEVER destroyed on tab switch!
          fetchRole(session.user.id, session.user.email).catch((err) => {
            console.warn("Background fetchRole notice:", err);
          });
          sessionStorage.setItem("student_session_active", "true");
        } else {
          setRole(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: getAuthRedirects().signupVerify,
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    sessionStorage.removeItem("student_session_active");
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
