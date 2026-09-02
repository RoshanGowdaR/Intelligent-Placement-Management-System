import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CalendarDays, Trophy, ClipboardList, UserCircle, TrendingUp, Zap, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { EligibilityChecker } from "@/components/EligibilityChecker";
import { BentoCard } from "@/components/3d/BentoCard";
import { Icon3D } from "@/components/3d/Icon3D";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ name: string | null; profile_completion_percentage: number | null; branch: string | null; cgpa: number | null } | null>(null);
  const [upcomingTests, setUpcomingTests] = useState(0);
  const [completedTests, setCompletedTests] = useState(0);
  const [passRate, setPassRate] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [profileRes, schedulesRes, attemptsRes] = await Promise.all([
        supabase.from("profiles").select("name, profile_completion_percentage, branch, cgpa").eq("id", user.id).single(),
        supabase.from("schedules").select("status").eq("student_id", user.id),
        supabase.from("test_attempts").select("passed").eq("student_id", user.id),
      ]);

      setProfile(profileRes.data);
      const schedules = schedulesRes.data ?? [];
      setUpcomingTests(schedules.filter((s) => s.status === "registered").length);
      setCompletedTests(schedules.filter((s) => s.status === "completed").length);

      const attempts = attemptsRes.data ?? [];
      const passed = attempts.filter((a) => a.passed).length;
      setPassRate(attempts.length > 0 ? Math.round((passed / attempts.length) * 100) : 0);
    };
    fetchData();
  }, [user]);

  const completion = profile?.profile_completion_percentage ?? 0;
  // Calculate readiness score
  const readinessScore = Math.min(100, Math.round((completion * 0.4) + ((profile?.cgpa ? profile.cgpa * 10 : 70) * 0.3) + (completedTests > 0 ? (passRate * 0.3) : 20)));
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (readinessScore / 100) * circumference;

  return (
    <div className="space-y-8">
      {/* Welcome & System Status */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-primary uppercase tracking-widest font-semibold">
              IPMS Candidate Portal
            </span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-white mt-1">
            Welcome, {profile?.name || "Candidate"}
          </h1>
          <p className="text-sm text-slate-300">
            {profile?.branch ? `${profile.branch} • ` : ""}Automated placement telemetry & assessment readiness
          </p>
        </motion.div>

        <div className="flex items-center gap-3">
          <Link
            to="/dashboard/tests"
            className="glass-button flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white hover:border-primary/50 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
          >
            <ClipboardList className="h-4 w-4 text-primary" /> View Assessments
          </Link>
          <Link
            to="/dashboard/companies"
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(108,92,231,0.4)] hover:bg-primary/90 transition-all"
          >
            <Sparkles className="h-4 w-4" /> Opportunities <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Top Bento Highlight: 3D Readiness Ring & Profile Velocity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Readiness Meter (Stitch 3D Ring) */}
        <div className="glass-panel relative overflow-hidden rounded-3xl p-6 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex items-center justify-between">
          <div className="space-y-2">
            <span className="label-caps text-xs text-primary font-bold tracking-widest">
              Telemetry Score
            </span>
            <h3 className="font-display text-xl font-bold text-white">Placement Readiness</h3>
            <p className="text-xs text-muted-foreground max-w-[180px]">
              Computed from verified marks, profile depth & mock performance.
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-xs text-emerald-400">
              <ShieldCheck className="h-4 w-4" /> Verified Candidate
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <svg className="w-28 h-28 transform -rotate-90">
              <circle
                cx="56"
                cy="56"
                r="45"
                className="text-white/10"
                strokeWidth="8"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="56"
                cy="56"
                r="45"
                className="text-primary progress-ring"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="font-display text-2xl font-bold text-white">{readinessScore}%</span>
              <span className="text-[10px] text-muted-foreground uppercase font-mono">INDEX</span>
            </div>
          </div>
        </div>

        {/* Profile Completion — high priority bento card */}
        <div className="glass-panel rounded-3xl p-6 border border-white/10 lg:col-span-2 flex flex-col justify-between shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <Icon3D icon={UserCircle} color="blue" size="md" />
              <div>
                <span className="label-caps text-xs text-secondary font-bold tracking-widest">
                  Authentication & Records
                </span>
                <h3 className="font-display text-xl font-bold text-white">Profile & Credentials Verification</h3>
                <p className="text-xs text-slate-300 mt-1">
                  {completion < 80
                    ? "Complete at least 80% of your profile (academic marks, resume, branch) to unlock proctored drives."
                    : "Your academic records and resume credentials are fully authenticated for placement routing."}
                </p>
              </div>
            </div>
            <span className="font-display text-3xl font-bold text-primary">{completion}%</span>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground font-mono">
              <span>CRITERIA VERIFICATION</span>
              <span>{completion >= 80 ? "STATUS: ELIGIBLE" : "STATUS: PENDING UPDATE"}</span>
            </div>
            <Progress value={completion} className="h-3 bg-white/10" />
          </div>
        </div>
      </div>

      {/* Stats grid — 3D bento */}
      <div className="grid gap-4 sm:grid-cols-3">
        <BentoCard priority="medium" delay={0.1}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Upcoming Tests</p>
              <p className="mt-2 font-display text-4xl font-bold text-white">{upcomingTests}</p>
              <p className="text-xs text-primary mt-1">Scheduled in schedule queue</p>
            </div>
            <Icon3D icon={CalendarDays} color="violet" size="md" />
          </div>
        </BentoCard>

        <BentoCard priority="medium" delay={0.2}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tests Completed</p>
              <p className="mt-2 font-display text-4xl font-bold text-white">{completedTests}</p>
              <p className="text-xs text-slate-400 mt-1">Proctored submissions</p>
            </div>
            <Icon3D icon={ClipboardList} color="blue" size="md" />
          </div>
        </BentoCard>

        <BentoCard priority={passRate > 70 ? "high" : "low"} delay={0.3}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assessment Pass Rate</p>
              <p className="mt-2 font-display text-4xl font-bold text-white">{passRate}%</p>
              <p className="text-xs text-emerald-400 mt-1">Forensic validation</p>
            </div>
            <Icon3D icon={Trophy} color="orange" size="md" />
          </div>
        </BentoCard>
      </div>

      {/* Eligibility Matrix Card */}
      <EligibilityChecker />
    </div>
  );
}
