import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import {
  CalendarDays, Trophy, ClipboardList, UserCircle, Building2,
  Sparkles, ArrowRight, ShieldCheck, CheckCircle2, Circle, Clock,
  MessageSquare, HelpCircle, Mail, ExternalLink, GitBranch,
  ChevronRight, Lock, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{
    name: string | null;
    profile_completion_percentage: number | null;
    branch: string | null;
    cgpa: number | null;
    resume_url: string | null;
  } | null>(null);

  const [upcomingTests, setUpcomingTests] = useState(0);
  const [completedTests, setCompletedTests] = useState(0);
  const [passRate, setPassRate] = useState(0);
  const [activeCompaniesCount, setActiveCompaniesCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [profileRes, schedulesRes, attemptsRes, companiesRes] = await Promise.all([
        supabase.from("profiles").select("name, profile_completion_percentage, branch, cgpa, resume_url").eq("id", user.id).single(),
        supabase.from("schedules").select("status").eq("student_id", user.id),
        supabase.from("test_attempts").select("passed").eq("student_id", user.id),
        supabase.from("companies").select("id", { count: "exact", head: true }),
      ]);

      setProfile(profileRes.data);
      const schedules = schedulesRes.data ?? [];
      setUpcomingTests(schedules.filter((s) => s.status === "registered").length);
      setCompletedTests(schedules.filter((s) => s.status === "completed").length);

      const attempts = attemptsRes.data ?? [];
      const passed = attempts.filter((a) => a.passed).length;
      setPassRate(attempts.length > 0 ? Math.round((passed / attempts.length) * 100) : 0);
      setActiveCompaniesCount(companiesRes.count ?? 0);
    };
    fetchData();
  }, [user]);

  const completion = profile?.profile_completion_percentage ?? 0;
  const isProfileDone = completion >= 80;
  const hasResume = Boolean(profile?.resume_url);
  const hasCompletedTest = completedTests > 0;

  // 4 Main Milestones
  const milestones = [
    { id: "01", label: "Application", done: isProfileDone },
    { id: "02", label: "Assessment", done: hasCompletedTest },
    { id: "03", label: "Interviews", done: false },
    { id: "04", label: "Selection", done: false },
  ];

  const clearedMilestones = milestones.filter((m) => m.done).length;
  const progressPercent = Math.round((clearedMilestones / milestones.length) * 100);

  // SVG Circular Gauge
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const todayFormatted = format(new Date(), "EEEE, MMM d, yyyy");
  const displayName = profile?.name || (user?.email ? user.email.split("@")[0] : "Candidate");

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      
      {/* 1. HERO BANNER matching Zidio Dark Navy Design */}
      <div className="rounded-3xl bg-[#141428] text-white p-6 md:p-8 relative overflow-hidden border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
        
        {/* Subtle decorative background gradient circles */}
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-[#5b51d8]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          
          {/* Top meta row */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Welcome back, <span className="capitalize text-[#8e85ff]">{displayName}</span>
            </h2>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300 font-medium">
              <CalendarDays className="h-3.5 w-3.5 text-[#8e85ff]" />
              <span>{todayFormatted}</span>
            </div>
          </div>

          {/* Hero main body: Left info + Right Circular Progress */}
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#5b51d8]/30 text-[#a59dff] border border-[#5b51d8]/40">
                  STAGE 01 / 04 • In progress
                </span>
              </div>

              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  Application &amp; Placement Drives
                </h1>
                <p className="text-sm text-slate-300 mt-1.5 max-w-xl leading-relaxed">
                  To start your placement journey, complete your profile, explore visiting recruiters, and attend scheduled assessments.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Takes ~2 minutes • Keep your resume and marks ready.</span>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  asChild
                  className="rounded-xl bg-[#5b51d8] hover:bg-[#4d43cc] text-white text-xs font-bold px-5 h-10 gap-2 shadow-[0_4px_16px_rgba(91,81,216,0.5)] transition-all"
                >
                  <Link to="/dashboard/companies">
                    Go to Companies &amp; Apply <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="rounded-xl bg-white/5 hover:bg-white/10 border-white/15 text-white text-xs font-bold px-4 h-10"
                >
                  <Link to="/dashboard/profile">
                    Profile Studio
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right Column (4 cols): Circular Gauge Card */}
            <div className="lg:col-span-4 flex justify-center lg:justify-end">
              <div className="w-full max-w-[260px] p-5 rounded-2xl bg-[#1b1b36] border border-white/10 flex flex-col items-center text-center shadow-inner">
                
                {/* Circular SVG */}
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      className="text-white/10 stroke-current"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      className="text-[#6456f5] stroke-current transition-all duration-1000 ease-out"
                      strokeWidth="8"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="font-display text-2xl font-black text-white">{progressPercent}%</span>
                    <span className="text-[10px] text-slate-400 font-medium">{clearedMilestones} of 4 done</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 mt-3 leading-relaxed">
                  Complete your onboarding journey to <span className="text-white font-semibold">unlock all platform features</span>.
                </p>
              </div>
            </div>

          </div>

          {/* Bottom Milestone Stepper Track matching Zidio */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3 font-mono">
              <span className="uppercase tracking-wider text-[10px]">Placement Pipeline</span>
              <span>{clearedMilestones} / 4 milestones cleared</span>
            </div>

            <div className="grid grid-cols-4 gap-2 relative">
              {milestones.map((m, idx) => {
                const isCurrent = idx === 0;
                return (
                  <div key={m.id} className="flex flex-col items-center text-center group">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs mb-1.5 transition-all ${
                        m.done
                          ? "bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                          : isCurrent
                          ? "bg-[#5b51d8] text-white ring-4 ring-[#5b51d8]/30"
                          : "bg-white/10 text-slate-400 border border-white/10"
                      }`}
                    >
                      {m.done ? <Check className="h-4 w-4" /> : m.id}
                    </div>
                    <span
                      className={`text-xs font-semibold truncate ${
                        m.done || isCurrent ? "text-white" : "text-slate-400"
                      }`}
                    >
                      {m.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* 2. NEXT STEP & ANNOUNCEMENTS SECTION */}
      <div className="grid lg:grid-cols-12 gap-6">
        
        {/* Left: YOUR NEXT STEP (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="p-6 rounded-3xl bg-card border border-border/60 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#5b51d8]">
                Your Next Step
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-semibold">
                Stage 1
              </span>
            </div>

            <div>
              <h3 className="font-display text-xl font-bold text-foreground">
                Application &amp; Readiness
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your placement onboarding begins once you verify your profile and register with companies.
              </p>
            </div>

            {/* Checklist */}
            <div className="space-y-3 pt-1">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {isProfileDone ? (
                    <div className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </div>
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground stroke-[1.5]" />
                  )}
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-foreground">Complete Profile Studio &amp; Upload Resume</span>
                  <p className="text-muted-foreground text-[11px]">Ensure your CGPA, semester marks cards, and skills are updated.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Circle className="h-5 w-5 text-muted-foreground stroke-[1.5]" />
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-foreground">Browse Careers &amp; Apply for Active Company Drives</span>
                  <p className="text-muted-foreground text-[11px]">Submit your eligibility verification for visiting recruiters.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Circle className="h-5 w-5 text-muted-foreground stroke-[1.5]" />
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-foreground">Attend Scheduled Proctored Tests &amp; Interviews</span>
                  <p className="text-muted-foreground text-[11px]">Check your schedule tab to take assessments on time.</p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button
                asChild
                className="rounded-xl bg-[#5b51d8] hover:bg-[#4d43cc] text-white text-xs font-bold px-5 h-10 gap-2 shadow-[0_4px_14px_rgba(91,81,216,0.3)]"
              >
                <Link to="/dashboard/companies">
                  Go to Careers &amp; Apply <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Locked Stage Cards with Diagonal Pattern */}
          <div className="p-6 rounded-3xl bg-muted/20 border border-dashed border-border/70 space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                <Lock className="h-3 w-3" /> LOCKED
              </Badge>
              <span className="text-[11px] text-muted-foreground font-mono">Unlocks at Stage 2 • Assessments</span>
            </div>
            <h4 className="font-display text-base font-bold text-foreground">Technical Assessment Brief</h4>
            <p className="text-xs text-muted-foreground">
              Your company coding assessments and MCQ rounds unlock after recruiter eligibility confirmation.
            </p>
          </div>
        </div>

        {/* Right: Announcements & Placement Team (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Announcements Widget */}
          <div className="p-6 rounded-3xl bg-card border border-border/60 shadow-sm space-y-4">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">
              Announcements
            </span>

            <div className="space-y-3.5">
              {/* Item 1 */}
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-xl bg-[#5b51d8]/10 text-[#5b51d8] flex items-center justify-center shrink-0">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="text-xs space-y-0.5">
                  <h5 className="font-bold text-foreground">Welcome to your dashboard</h5>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Track your onboarding journey and complete the current step to move forward.
                  </p>
                  <span className="text-[10px] text-muted-foreground font-mono">Just now</span>
                </div>
              </div>

              {/* Item 2 */}
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <HelpCircle className="h-4 w-4" />
                </div>
                <div className="text-xs space-y-0.5">
                  <h5 className="font-bold text-foreground">TPO Help Center is available</h5>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Need placement guidance? Open Help for step-by-step instructions and FAQs.
                  </p>
                  <span className="text-[10px] text-muted-foreground font-mono">Today</span>
                </div>
              </div>
            </div>
          </div>

          {/* Placement Advisory Card */}
          <div className="p-6 rounded-3xl bg-card border border-border/60 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Your Placement Team
              </span>
              <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30 bg-emerald-500/5">
                Active Cell
              </Badge>
            </div>
            <h4 className="font-display text-sm font-bold text-foreground">Training &amp; Placement Office</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You will be scheduled for mentor mock interviews and resume reviews throughout the drive season.
            </p>
          </div>

        </div>

      </div>

      {/* 3. "YOUR WORKSPACE" 8-CARD GRID */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-xl font-extrabold text-foreground">
              Your Workspace
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Access your assessments, drives, AI preparation, and career resources.
            </p>
          </div>
          <Link
            to="/dashboard/tests"
            className="text-xs font-bold text-[#5b51d8] hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* 1. My Assessments */}
          <Link
            to="/dashboard/tests"
            className="p-4 rounded-2xl bg-card border border-border/60 hover:border-[#5b51d8]/40 hover:shadow-md transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-foreground group-hover:text-[#5b51d8] transition-colors">
                  My Assessments
                </h4>
                <p className="text-[11px] text-muted-foreground">Take &amp; review tests</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
          </Link>

          {/* 2. Visiting Companies */}
          <Link
            to="/dashboard/companies"
            className="p-4 rounded-2xl bg-card border border-border/60 hover:border-[#5b51d8]/40 hover:shadow-md transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-foreground group-hover:text-[#5b51d8] transition-colors">
                  Visiting Companies
                </h4>
                <p className="text-[11px] text-muted-foreground">{activeCompaniesCount} active drives</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
          </Link>

          {/* 3. Resume & Profile Studio */}
          <Link
            to="/dashboard/profile"
            className="p-4 rounded-2xl bg-card border border-border/60 hover:border-[#5b51d8]/40 hover:shadow-md transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <UserCircle className="h-5 w-5" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-foreground group-hover:text-[#5b51d8] transition-colors">
                  Profile Studio
                </h4>
                <p className="text-[11px] text-muted-foreground">{completion}% readiness</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
          </Link>

          {/* 4. Drive Pipeline */}
          <Link
            to="/dashboard/companies"
            className="p-4 rounded-2xl bg-card border border-border/60 hover:border-[#5b51d8]/40 hover:shadow-md transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <GitBranch className="h-5 w-5" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-foreground group-hover:text-[#5b51d8] transition-colors">
                  Drive Pipeline
                </h4>
                <p className="text-[11px] text-muted-foreground">Multi-round gating</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
          </Link>

          {/* 5. Results & Ranks */}
          <Link
            to="/dashboard/results"
            className="p-4 rounded-2xl bg-card border border-border/60 hover:border-[#5b51d8]/40 hover:shadow-md transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center">
                <Trophy className="h-5 w-5" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-foreground group-hover:text-[#5b51d8] transition-colors">
                  Results &amp; Ranks
                </h4>
                <p className="text-[11px] text-muted-foreground">{passRate}% pass rate</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
          </Link>

          {/* 6. Placement Schedule */}
          <Link
            to="/dashboard/schedule"
            className="p-4 rounded-2xl bg-card border border-border/60 hover:border-[#5b51d8]/40 hover:shadow-md transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-foreground group-hover:text-[#5b51d8] transition-colors">
                  Drive Schedule
                </h4>
                <p className="text-[11px] text-muted-foreground">{upcomingTests} upcoming slots</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
          </Link>

          {/* 7. AI Prep & Assistant */}
          <div
            onClick={() => {
              const el = document.querySelector(".fixed.bottom-6.right-6 button") as HTMLElement;
              el?.click();
            }}
            className="p-4 rounded-2xl bg-card border border-border/60 hover:border-[#5b51d8]/40 hover:shadow-md transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-foreground group-hover:text-[#5b51d8] transition-colors">
                  AI Interview Prep
                </h4>
                <p className="text-[11px] text-muted-foreground">Interactive assistant</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
          </div>

          {/* 8. Verification & Letters */}
          <div
            className="p-4 rounded-2xl bg-card border border-border/60 hover:border-[#5b51d8]/40 hover:shadow-md transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-foreground group-hover:text-[#5b51d8] transition-colors">
                  Offer Letters
                </h4>
                <p className="text-[11px] text-muted-foreground">Digital credentials</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
          </div>

        </div>
      </div>

      {/* 4. BOTTOM HELP & SUPPORT BANNER */}
      <div className="p-6 rounded-3xl bg-muted/40 border border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h4 className="font-display text-sm font-bold text-foreground">Need help with your journey?</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Our placement team and support coordinators are available every day, 10 AM – 7 PM IST.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("mailto:placement@college.edu")}
            className="rounded-xl h-8 text-xs font-semibold gap-1.5 border-border bg-card"
          >
            <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email support
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info("Check the FAQs in the Help Center.")}
            className="rounded-xl h-8 text-xs font-semibold gap-1.5 border-border bg-card"
          >
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" /> FAQ
          </Button>
        </div>
      </div>

    </div>
  );
}
