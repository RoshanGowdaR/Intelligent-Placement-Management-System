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
      // 1. Sign up auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            name: hrName.trim(),
            company_name: companyName.trim(),
            role: "company",
          },
        },
      });

      if (authError) throw authError;
      const newUserId = authData.user?.id;
      if (!newUserId) throw new Error("Could not initialize recruiter account.");

      // 2. Insert into public.companies
      const { data: companyRecord, error: companyError } = await supabase
        .from("companies")
        .insert({
          name: companyName.trim(),
          user_id: newUserId,
          website: website.trim() || null,
          industry: industry.trim() || null,
          description: description.trim() || null,
          hr_name: hrName.trim() || null,
          hr_phone: phone.trim() || null,
          job_role: jobRole.trim() || null,
          salary_package: salaryPackage.trim() || null,
          max_backlogs: Number(maxBacklogs) || 0,
        })
        .select()
        .single();

      if (companyError) {
        console.warn("Company record insert warning:", companyError);
      }

      // 3. Assign 'company' role in public.user_roles
      await supabase.from("user_roles").upsert(
        { user_id: newUserId, role: "company" as any },
        { onConflict: "user_id,role" }
      );

      // 4. Mark invite as accepted if token existed
      if (token) {
        await supabase
          .from("company_invites" as any)
          .update({ accepted_at: new Date().toISOString() })
          .eq("token", token);
      }

      // 5. Broadcast notification to all students
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

      toast.success("Company account registered successfully! Welcome aboard.");
      navigate("/company/dashboard");
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
                  <Label className="text-xs uppercase text-slate-400 font-semibold">Default Target Role</Label>
                  <Input
                    placeholder="e.g. Full Stack Engineer"
                    value={jobRole}
                    onChange={(e) => setJobRole(e.target.value)}
                    className="h-11 rounded-xl border-white/10 bg-white/5 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase text-slate-400 font-semibold">About Company & Culture</Label>
                <Textarea
                  rows={2}
                  placeholder="Brief summary of company, mission, and work culture…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="rounded-xl border-white/10 bg-white/5 text-white"
                />
              </div>
            </div>

            {/* Section 2: Recruiter Credentials */}
            <div className="space-y-4 pt-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2 border-b border-white/10 pb-2">
                <ShieldCheck className="h-4 w-4" /> 2. Recruiter & Account Access
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-slate-400 font-semibold">HR / Lead Recruiter Name *</Label>
                  <Input
                    required
                    placeholder="e.g. Sarah Jenkins"
                    value={hrName}
                    onChange={(e) => setHrName(e.target.value)}
                    className="h-11 rounded-xl border-white/10 bg-white/5 text-white"
                  />
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
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-slate-400 font-semibold">Account Password *</Label>
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
              disabled={isLoading}
              className="w-full h-12 rounded-2xl bg-primary text-white font-bold text-base shadow-[0_0_25px_rgba(108,92,231,0.5)] hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Registering Company Portal…</>
              ) : (
                <><Sparkles className="mr-2 h-5 w-5" /> Complete Registration & Enter Portal</>
              )}
            </Button>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
