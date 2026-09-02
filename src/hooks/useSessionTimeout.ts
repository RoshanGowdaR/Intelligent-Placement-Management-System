import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const ADMIN_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
const ADMIN_WARNING_MS = 5 * 60 * 1000; // 5 minutes before

// Save admin state to localStorage
function saveAdminState() {
  const url = window.location.pathname + window.location.search;
  localStorage.setItem("admin_last_route", url);
  localStorage.setItem("admin_last_activity", Date.now().toString());
}

export function getAdminResumeRoute(): string | null {
  return localStorage.getItem("admin_last_route");
}

export function clearAdminResumeRoute() {
  localStorage.removeItem("admin_last_route");
  localStorage.removeItem("admin_last_activity");
}

export function useAdminSessionTimeout() {
  const { role, signOut, user } = useAuth();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const warningRef = useRef<ReturnType<typeof setTimeout>>();

  const resetTimer = useCallback(() => {
    if (role !== "admin") return;
    
    // Save current state on every activity
    saveAdminState();

    if (warningRef.current) clearTimeout(warningRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    warningRef.current = setTimeout(() => {
      toast.warning("Session expires in 5 minutes. Your progress is saved.", { duration: 10000 });
    }, ADMIN_TIMEOUT_MS - ADMIN_WARNING_MS);

    timeoutRef.current = setTimeout(() => {
      saveAdminState();
      toast.info("Session timed out. Please sign in again to resume.");
      signOut();
    }, ADMIN_TIMEOUT_MS);
  }, [role, signOut]);

  useEffect(() => {
    if (role !== "admin" || !user) return;

    resetTimer();

    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach(e => window.addEventListener(e, resetTimer));

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      if (warningRef.current) clearTimeout(warningRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [role, user, resetTimer]);
}

export function useStudentSessionGuard() {
  const { role, user } = useAuth();

  useEffect(() => {
    if (role !== "student" || !user) return;

    // Set session storage flag
    sessionStorage.setItem("student_session_active", "true");
  }, [role, user]);
}
