import { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Props {
  children: React.ReactNode;
  requiredRole?: AppRole;
}

export function ProtectedRoute({ children, requiredRole }: Props) {
  const { user, role, loading } = useAuth();
  const location = useLocation();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    async function checkCompanyOnboarding() {
      if (!user || role !== "company") {
        setOnboardingChecked(true);
        return;
      }

      // If already on /company/onboarding, allow access directly
      if (location.pathname === "/company/onboarding") {
        setOnboardingChecked(true);
        setNeedsOnboarding(false);
        return;
      }

      try {
        const { data: comp } = await supabase
          .from("companies")
          .select("id, name, job_role, salary_package, contact_info")
          .eq("user_id", user.id)
          .maybeSingle();

        const contact = (comp?.contact_info as any) || {};
        const isComplete = Boolean(
          comp &&
          (contact.onboarding_completed === true || (comp.job_role && comp.salary_package))
        );

        if (!isComplete) {
          setNeedsOnboarding(true);
        } else {
          setNeedsOnboarding(false);
        }
      } catch (err) {
        console.warn("Onboarding verification check:", err);
      } finally {
        setOnboardingChecked(true);
      }
    }

    if (!loading && user) {
      checkCompanyOnboarding();
    }
  }, [user, role, loading, location.pathname]);

  if (loading || (role === "company" && !onboardingChecked)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && role !== requiredRole) {
    const dest = role === "admin" ? "/admin" : role === "company" ? "/company" : "/dashboard";
    return <Navigate to={dest} replace />;
  }

  if (role === "company" && needsOnboarding && location.pathname !== "/company/onboarding") {
    return <Navigate to="/company/onboarding" replace />;
  }

  return <>{children}</>;
}
