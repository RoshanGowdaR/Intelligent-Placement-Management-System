import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { APP_WEB_URL } from "@/lib/authRedirects";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasNavigatedRef = useRef(false);

  const routeToSignedInArea = async () => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;

    // Allow auth context time to initialize session before protected routes check.
    await new Promise((r) => setTimeout(r, 600));

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      hasNavigatedRef.current = false;
      setErrorMessage("This reset link is invalid or expired. Please request a new one.");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const destination = roleData?.role === "admin" ? "/admin" : "/dashboard";
    navigate(`${destination}?force_password_reset=1`, { replace: true });
  };

  useEffect(() => {
    // If user lands on Lovable domain, force canonical Vercel domain while keeping token/hash.
    if (window.location.origin !== APP_WEB_URL) {
      const target = `${APP_WEB_URL}/reset-password${window.location.search}${window.location.hash}`;
      window.location.replace(target);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        routeToSignedInArea();
      }
    });

    const initializeRecovery = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      const hasRecoveryInHash = window.location.hash.includes("type=recovery");

      // PKCE-style recovery links
      if (tokenHash && type === "recovery") {
        const { error } = await supabase.auth.verifyOtp({
          type: "recovery",
          token_hash: tokenHash,
        });

        if (error) {
          setErrorMessage("This reset link is invalid or expired. Please request a new one.");
          return;
        }

        await routeToSignedInArea();
        return;
      }

      // Hash-based recovery links: wait for session to be established.
      if (hasRecoveryInHash) {
        await new Promise((r) => setTimeout(r, 1200));
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          await routeToSignedInArea();
          return;
        }
      }

      setErrorMessage("Invalid reset link. Please request a new password reset email.");
    };

    initializeRecovery();

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (errorMessage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Reset link issue</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
            <Button className="mt-2" onClick={() => navigate("/forgot-password", { replace: true })}>
              Request a new reset link
            </Button>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <CardTitle className="text-xl">Signing you in…</CardTitle>
          <CardDescription>Please wait while we secure your account.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
