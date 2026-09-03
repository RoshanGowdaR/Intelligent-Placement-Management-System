import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { GlassCard } from "@/components/3d/GlassCard";
import { AnimatedBackground } from "@/components/3d/AnimatedBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, ArrowLeft, Loader2, Sparkles, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
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

export default function CompanyRegister() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("Information Technology");
  const [description, setDescription] = useState("");
  
  const [hrName, setHrName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [jobRole, setJobRole] = useState("Software Development Engineer");
  const [salaryPackage, setSalaryPackage] = useState("12 - 18 LPA");
  const [maxBacklogs, setMaxBacklogs] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(Boolean(token));

  // Check token if provided in query string
  useEffect(() => {
    if (!token) return;

    const verifyToken = async () => {
      try {
        const { data, error } = await supabase
          .from("company_invites" as any)
          .select("email, company_name, accepted_at, expires_at")
          .eq("token", token)
          .maybeSingle();

        if (error || !data) {
          toast.error("Invitation token not found or invalid.");
        } else if (data.accepted_at) {
          toast.info("This invitation has already been used. Please log in.");
          navigate("/login");
        } else if (new Date(data.expires_at) < new Date()) {
          toast.error("This invitation link has expired. Please contact admin.");
        } else {
          if (data.email) setEmail(data.email);
          if (data.company_name) setCompanyName(data.company_name);
          toast.success("Invitation verified! Please complete your company profile.");
        }
      } catch (err) {
        console.error("Token validation error:", err);
      } finally {
        setValidatingToken(false);
      }
    };

    verifyToken();
  }, [token, navigate]);

  // Handle Google OAuth Sign Up / In
  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    try {
      sessionStorage.setItem(
        "pending_company_details",
        JSON.stringify({
          name: companyName.trim() || "Visiting Recruiter",
          website: website.trim(),
          industry: industry.trim(),
          description: description.trim(),
          hrName: hrName.trim(),
          phone: phone.trim(),
          jobRole: jobRole.trim(),
          salaryPackage: salaryPackage.trim(),
          maxBacklogs: Number(maxBacklogs) || 0,
        })
      );

      const redirectTo = `${window.location.origin}/login`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: false,
        },
      });

      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || "Google registration failed");
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      let activeUserId: string | null = null;

      // 1. Check if user already has an active session
      const { data: currentAuth } = await supabase.auth.getUser();
      if (currentAuth?.user) {
        activeUserId = currentAuth.user.id;
      } else {
        // 2. Try signUp
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              name: hrName.trim(),
              company_name: companyName.trim(),
              role: "company",
            },
          },
        });

        if (authError) {
          // If already registered in auth, attempt signInWithPassword
          const { data: signData, error: signError } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

          if (signError) {
            toast.error(
              "Account already exists! Please click 'Continue with Google' above, or sign in on the login page."
            );
            setIsLoading(false);
            return;
          }
          activeUserId = signData.user?.id ?? null;
        } else {
          activeUserId = authData.user?.id ?? null;

          // Attempt immediate login to guarantee active session
          if (!authData.session) {
            const { data: signData } = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password,
            });
            if (signData?.user) activeUserId = signData.user.id;
          }
        }
      }

      if (!activeUserId) {
        toast.info("Registration submitted! If you use Google, click 'Continue with Google' to sign in directly.");
        navigate("/login");
        return;
      }

      // 3. Upsert into public.companies
      try {
        const { data: existingComp } = await supabase
          .from("companies")
          .select("id")
          .or(`user_id.eq.${activeUserId},name.ilike.${companyName.trim()}`)
          .maybeSingle();

        if (existingComp) {
          await supabase
            .from("companies")
            .update({
              user_id: activeUserId,
              name: companyName.trim(),
              website: website.trim() || null,
              industry: industry.trim() || null,
              description: description.trim() || null,
              hr_name: hrName.trim() || null,
              hr_phone: phone.trim() || null,
              job_role: jobRole.trim() || null,
              salary_package: salaryPackage.trim() || null,
              max_backlogs: Number(maxBacklogs) || 0,
            })
            .eq("id", existingComp.id);
        } else {
          await supabase.from("companies").insert({
            name: companyName.trim(),
            user_id: activeUserId,
            website: website.trim() || null,
            industry: industry.trim() || null,
            description: description.trim() || null,
            hr_name: hrName.trim() || null,
            hr_phone: phone.trim() || null,
            job_role: jobRole.trim() || null,
            salary_package: salaryPackage.trim() || null,
            max_backlogs: Number(maxBacklogs) || 0,
          });
        }
      } catch (companyError) {
        console.warn("Company record sync notice:", companyError);
      }

      // 4. Assign 'company' role in public.user_roles
      try {
        await supabase.from("user_roles").upsert(
          { user_id: activeUserId, role: "company" as any },
          { onConflict: "user_id,role" }
        );
      } catch (roleErr) {
        console.warn("User role assign notice:", roleErr);
      }

      // 5. Mark invite as accepted
      try {
        await supabase
          .from("company_invites" as any)
          .update({ accepted_at: new Date().toISOString() })
          .or(`email.ilike.${cleanEmail}${token ? `,token.eq.${token}` : ""}`);
      } catch (_) {}

      // 6. Broadcast notification to all students
      try {
        const { data: studentProfiles } = await supabase.from("profiles").select("id");
        if (studentProfiles && studentProfiles.length > 0) {
          const notificationsToInsert = studentProfiles.map((s) => ({
            user_id: s.id,
            title: `🏢 New Company Onboarded: ${companyName}`,
            message: `${companyName} has joined the placement platform for ${jobRole} roles (${salaryPackage}). Check your eligibility!`,
            type: "info",
            link: "/dashboard/companies",
          }));
          await supabase.from("notifications").insert(notificationsToInsert);
        }
      } catch (notifErr) {
        console.warn("Could not dispatch broadcast notification:", notifErr);
      }

      toast.success("Company profile registered & activated successfully! Welcome aboard.");
      navigate("/company", { replace: true });
    } catch (err: any) {
      console.error("Company registration failed:", err);
      toast.error(err?.message || "Failed to complete registration");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 md:p-8 overflow-hidden">
      <AnimatedBackground />

      <div className="relative z-10 w-full max-w-3xl">
        <GlassCard className="p-8 border-white/15 backdrop-blur-3xl shadow-[0_30px_90px_rgba(0,0,0,0.85)]">
          
          <Link
            to="/login"
            className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Login
          </Link>

          <div className="text-center mb-8">
            <motion.div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-600/20 border border-purple-500/40 text-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.5)]"
              whileHover={{ rotateY: 20, scale: 1.05 }}
            >
              <Building2 className="h-8 w-8" />
            </motion.div>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold text-white">
              Visiting Recruiter Onboarding
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              Register your organization to conduct campus drives, launch assessments & recruit top talent.
            </p>
          </div>

          {/* Quick Sign In with Google */}
          <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
            <p className="text-xs text-slate-400 mb-3">
              Invited via Google Workspace? Activate your company portal with 1-click:
            </p>
            <Button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={isGoogleLoading}
              className="w-full sm:w-auto h-11 px-8 rounded-xl bg-white text-slate-900 font-bold hover:bg-white/90 shadow-[0_0_25px_rgba(255,255,255,0.2)] flex items-center justify-center gap-3 mx-auto transition-all"
            >
              {isGoogleLoading ? <Loader2 className="h-4 w-4 animate-spin text-slate-900" /> : <GoogleIcon />}
              <span>Continue with Google</span>
            </Button>
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
              <span className="relative bg-[#0e0e17] px-3 text-[11px] uppercase text-slate-400 font-semibold tracking-wider">
                Or configure with Email & Password below
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Company Profile */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2 border-b border-white/10 pb-2">
                <Building2 className="h-4 w-4" /> 1. Company Information
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-slate-400 font-semibold">Company Name *</Label>
                  <Input
                    required
                    placeholder="e.g. Google India"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="h-11 rounded-xl border-white/10 bg-white/5 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase text-slate-400 font-semibold">Official Website</Label>
                  <Input
                    type="url"
                    placeholder="https://company.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="h-11 rounded-xl border-white/10 bg-white/5 text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-slate-400 font-semibold">Industry / Sector</Label>
                  <Input
                    placeholder="e.g. Fintech, Cloud, AI, Core Engineering"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="h-11 rounded-xl border-white/10 bg-white/5 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase text-slate-400 font-semibold">Primary Job Role Offered</Label>
                  <Input
                    placeholder="e.g. Software Engineer / Data Scientist"
                    value={jobRole}
                    onChange={(e) => setJobRole(e.target.value)}
                    className="h-11 rounded-xl border-white/10 bg-white/5 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase text-slate-400 font-semibold">Company Overview</Label>
                <Textarea
                  placeholder="Brief summary of company culture, mission and recruitment vision…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="rounded-xl border-white/10 bg-white/5 text-white min-h-[70px]"
                />
              </div>
            </div>

            {/* Section 2: Recruitment Benchmarks */}
            <div className="space-y-4 pt-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2 border-b border-white/10 pb-2">
                <Sparkles className="h-4 w-4" /> 2. Hiring Package & Cutoff
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-slate-400 font-semibold">Offered Package (CTC)</Label>
                  <Input
                    placeholder="e.g. 14 - 20 LPA"
                    value={salaryPackage}
                    onChange={(e) => setSalaryPackage(e.target.value)}
                    className="h-11 rounded-xl border-white/10 bg-white/5 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase text-slate-400 font-semibold">Maximum Allowed Backlogs</Label>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    value={maxBacklogs}
                    onChange={(e) => setMaxBacklogs(Number(e.target.value))}
                    className="h-11 rounded-xl border-white/10 bg-white/5 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: HR Recruiter Credentials */}
            <div className="space-y-4 pt-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2 border-b border-white/10 pb-2">
                <ShieldCheck className="h-4 w-4" /> 3. Recruiter Authentication Credentials
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-slate-400 font-semibold">HR / Lead Recruiter Name *</Label>
                  <Input
                    required
                    placeholder="e.g. Jane Doe"
                    value={hrName}
                    onChange={(e) => setHrName(e.target.value)}
                    className="h-11 rounded-xl border-white/10 bg-white/5 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase text-slate-400 font-semibold">Contact Phone</Label>
                  <Input
                    placeholder="+91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-11 rounded-xl border-white/10 bg-white/5 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase text-slate-400 font-semibold">Official Work Email *</Label>
                <Input
                  required
                  type="email"
                  placeholder="recruiter@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-xl border-white/10 bg-white/5 text-white"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-slate-400 font-semibold">Create Password *</Label>
                  <Input
                    required
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-xl border-white/10 bg-white/5 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase text-slate-400 font-semibold">Confirm Password *</Label>
                  <Input
                    required
                    type="password"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-11 rounded-xl border-white/10 bg-white/5 text-white"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading || validatingToken}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-primary via-indigo-600 to-purple-600 text-white font-bold text-sm shadow-[0_0_30px_rgba(108,92,231,0.5)] hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Provisioning Recruiter Portal…
                </span>
              ) : (
                "Complete Company Registration →"
              )}
            </Button>
          </form>

        </GlassCard>
      </div>
    </div>
  );
}
