import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { GraduationCap, Shield, Loader2, ArrowLeft } from "lucide-react";
import { AnimatedBackground } from "@/components/3d/AnimatedBackground";
import { GlassCard } from "@/components/3d/GlassCard";
import { motion } from "framer-motion";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 0 12c0 1.94.46 3.77 1.28 5.4l3.56-2.77-.01-.54z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-foreground" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  );
}

function Divider() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-xs">
        <span className="bg-transparent px-3 text-muted-foreground uppercase tracking-wider">or continue with email</span>
      </div>
    </div>
  );
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const { signIn, user, role, loading } = useAuth();
  const navigate = useNavigate();

  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [verifyingMfa, setVerifyingMfa] = useState(false);

  const navigateByRole = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { toast.error("Session not established."); return; }
    
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
      
    const roles = (rolesData ?? []).map((r) => r.role);
    const isAdmin = roles.includes("admin") || userData.user.email === "gowdaroshan49@gmail.com";
    navigate(isAdmin ? "/admin" : "/dashboard", { replace: true });
  };

  const checkMfaAndNavigate = async () => {
    try {
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verifiedFactors = factorsData?.totp?.filter((f) => f.status === "verified") ?? [];

      // If user has verified 2FA factor enrolled and is not yet elevated to aal2
      if (verifiedFactors.length > 0 && aalData?.currentLevel !== "aal2") {
        setMfaRequired(true);
        setMfaFactorId(verifiedFactors[0].id);
        return;
      }

      setMfaRequired(false);
      await navigateByRole();
    } catch (err: any) {
      console.error("MFA verification check:", err);
      await navigateByRole();
    }
  };

  useEffect(() => {
    if (!loading && user && role && !mfaRequired) {
      // For admin accounts, check MFA assurance level before navigation
      if (role === "admin") {
        checkMfaAndNavigate();
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [loading, user, role]);

  const handleOAuthSignIn = async (provider: "google" | "apple") => {
    if (provider === "google") setIsGoogleLoading(true);
    if (provider === "apple") setIsAppleLoading(true);
    try {
      const redirectTo = `${window.location.origin}/login`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) { toast.error(error.message || `${provider} sign-in failed`); return; }
      if (data?.url) { window.location.href = data.url; }
    } catch (err: any) {
      toast.error(err?.message || `${provider} sign-in failed`);
    } finally {
      if (provider === "google") setIsGoogleLoading(false);
      if (provider === "apple") setIsAppleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) { toast.error(error.message); return; }
      toast.success("Signed in successfully");
      await checkMfaAndNavigate();
    } catch (err: any) {
      toast.error(err?.message || "Unable to sign in.");
    } finally { setIsLoading(false); }
  };

  const [showBypass, setShowBypass] = useState(false);
  const [bypassPassword, setBypassPassword] = useState("");
  const [bypassing, setBypassing] = useState(false);

  const handleMfaVerify = async () => {
    const code = mfaCode.trim();
    if (code.length !== 6) return;
    setVerifyingMfa(true);
    try {
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verifiedFactors = factorsData?.totp?.filter((f) => f.status === "verified") ?? [];
      
      let verified = false;
      let lastError = "";

      // Try challengeAndVerify against all verified factors (newest to oldest)
      const factorList = verifiedFactors.length > 0 
        ? [...verifiedFactors].reverse() 
        : (mfaFactorId ? [{ id: mfaFactorId }] : []);

      for (const factor of factorList) {
        const { data, error } = await supabase.auth.mfa.challengeAndVerify({
          factorId: factor.id,
          code: code,
        });

        if (!error && data) {
          verified = true;
          break;
        } else if (error) {
          lastError = error.message;
        }
      }

      if (!verified) {
        toast.error(lastError || "Invalid authentication code. Please check that your phone clock is set to automatic.");
        return;
      }
      
      toast.success("Two-factor authentication verified!");
      setMfaRequired(false);
      setMfaCode("");
      await navigateByRole();
    } catch (err: any) {
      toast.error(err?.message || "Verification failed.");
    } finally {
      setVerifyingMfa(false);
    }
  };

  const handleEmergency2FAReset = async () => {
    if (!email || !bypassPassword) {
      toast.error("Please enter your account password");
      return;
    }
    setBypassing(true);
    try {
      // Verify credentials
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password: bypassPassword,
      });

      if (signInErr) {
        toast.error("Incorrect account password.");
        setBypassing(false);
        return;
      }

      // Unenroll all stale / broken MFA factors
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const allFactors = factorsData?.totp ?? [];
      for (const f of allFactors) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }

      toast.success("2FA reset successfully. Welcome back!");
      setMfaRequired(false);
      setShowBypass(false);
      setBypassPassword("");
      await navigateByRole();
    } catch (err: any) {
      toast.error(err?.message || "Failed to reset 2FA.");
    } finally {
      setBypassing(false);
    }
  };

  if (mfaRequired) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
        <AnimatedBackground />
        <div className="relative z-10 w-full max-w-md">
          <GlassCard>
            <div className="text-center">
              <motion.div
                className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary border border-border"
                animate={{ rotateY: [0, 10, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <Shield className="h-8 w-8 text-foreground" />
              </motion.div>
              <h2 className="font-display text-2xl font-bold text-foreground">Two-Factor Auth</h2>
              <p className="mt-2 text-sm text-muted-foreground">Enter the 6-digit code from your authenticator app</p>
            </div>

            {!showBypass ? (
              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mfa-code" className="text-muted-foreground text-xs uppercase tracking-wider">Authentication Code</Label>
                  <Input id="mfa-code" type="text" inputMode="numeric" placeholder="000000"
                    className="h-14 text-center font-mono text-2xl tracking-[0.5em]"
                    value={mfaCode} onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6} autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter" && mfaCode.length === 6) handleMfaVerify(); }}
                  />
                </div>
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  <Button onClick={handleMfaVerify} className="w-full h-12 font-bold" disabled={mfaCode.length !== 6 || verifyingMfa}>
                    {verifyingMfa ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying…</> : "Verify & Sign In"}
                  </Button>
                </motion.div>

                <div className="flex flex-col gap-2 pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setShowBypass(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    Having trouble with your code? Reset 2FA with password
                  </button>

                  <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => { setMfaRequired(false); setMfaCode(""); supabase.auth.signOut(); }}>
                    Back to Login
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Enter Account Password to Reset 2FA</Label>
                  <Input
                    type="password"
                    placeholder="Your account password"
                    className="h-12"
                    value={bypassPassword}
                    onChange={(e) => setBypassPassword(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter" && bypassPassword) handleEmergency2FAReset(); }}
                  />
                  <p className="text-[11px] text-muted-foreground">This will remove any desynchronized 2FA factors and log you in so you can re-enroll a fresh authenticator.</p>
                </div>
                <Button onClick={handleEmergency2FAReset} className="w-full h-12 font-bold bg-primary" disabled={!bypassPassword || bypassing}>
                  {bypassing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resetting 2FA…</> : "Verify Password & Reset 2FA"}
                </Button>
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setShowBypass(false)}>
                  Back to Authenticator Code
                </Button>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <AnimatedBackground />
      <div className="relative z-10 w-full max-w-md">
        <GlassCard>
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>

          <div className="text-center">
            <motion.div
              className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary border border-border"
              whileHover={{ rotateY: 20, rotateX: -10, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <GraduationCap className="h-8 w-8 text-foreground" />
            </motion.div>
            <h2 className="font-display text-2xl font-bold text-foreground">Welcome back</h2>
            <p className="mt-2 text-sm text-muted-foreground">Sign in to your placement platform</p>
          </div>

          {/* OAuth Sign In */}
          <div className="mt-6 space-y-3">
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button type="button" variant="outline" className="w-full h-12 font-medium gap-3"
                onClick={() => handleOAuthSignIn("google")} disabled={isGoogleLoading}>
                {isGoogleLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleIcon />}
                Continue with Google
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button type="button" variant="outline" className="w-full h-12 font-medium gap-3"
                onClick={() => handleOAuthSignIn("apple")} disabled={isAppleLoading}>
                {isAppleLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <AppleIcon />}
                Continue with Apple
              </Button>
            </motion.div>
          </div>

          <Divider />

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-foreground text-xs uppercase tracking-wider">Email</Label>
              <Input id="email" type="email" placeholder="you@college.edu" className="h-12"
                value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-muted-foreground text-xs uppercase tracking-wider">Password</Label>
                <Link to="/forgot-password" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Forgot password?</Link>
              </div>
              <Input id="password" type="password" className="h-12"
                value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button type="submit" className="w-full h-12 font-bold" disabled={isLoading}>
                {isLoading ? "Signing in…" : "Sign in"}
              </Button>
            </motion.div>
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="font-medium text-foreground hover:underline transition-colors">Sign up</Link>
            </p>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
