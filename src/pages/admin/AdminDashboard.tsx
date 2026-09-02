import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/3d/GlassCard";
import { AdminAIAssistant } from "@/components/assistant/AdminAIAssistant";
import { InviteCompanyDialog } from "@/components/admin/InviteCompanyDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users, ClipboardList, Building2, TrendingUp, Sparkles, Bot, Mic,
  Plus, ShieldCheck, ShieldAlert, ArrowUpRight, Clock, Award, FileSpreadsheet,
  CheckCircle2, ExternalLink, Calendar, ChevronRight, Activity, Zap
} from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow, isPast } from "date-fns";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    students: 0,
    tests: 0,
    companies: 0,
    passRate: 0,
    totalAttempts: 0,
    flaggedCheats: 0,
  });
  const [recentAttempts, setRecentAttempts] = useState<any[]>([]);
  const [upcomingTests, setUpcomingTests] = useState<any[]>([]);
  const [activeCompanies, setActiveCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Assistant & Invite Modals
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [studentsRes, testsRes, companiesRes, attemptsRes, upcomingTestsRes, recentAttemptsRes, companiesListRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("tests").select("id", { count: "exact", head: true }),
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase.from("test_attempts").select("passed, tab_switches, auto_submitted"),
        supabase.from("tests").select("id, title, scheduled_date, duration, registration_deadline, companies(name)").order("scheduled_date", { ascending: true }).limit(4),
        supabase.from("test_attempts").select("id, total_score, passed, tab_switches, completed_at, profiles(name, email, branch), tests(title)").order("completed_at", { ascending: false }).limit(6),
        supabase.from("companies").select("id, name, job_role, salary_package, job_location").order("created_at", { ascending: false }).limit(4),
      ]);

      const attempts = attemptsRes.data ?? [];
      const passed = attempts.filter((a) => a.passed).length;
      const passRate = attempts.length > 0 ? Math.round((passed / attempts.length) * 100) : 0;
      const cheats = attempts.filter((a) => a.tab_switches > 0 || a.auto_submitted).length;

      setStats({
        students: studentsRes.count ?? 0,
        tests: testsRes.count ?? 0,
        companies: companiesRes.count ?? 0,
        passRate,
        totalAttempts: attempts.length,
        flaggedCheats: cheats,
      });

      setUpcomingTests(upcomingTestsRes.data ?? []);
      setRecentAttempts(recentAttemptsRes.data ?? []);
      setActiveCompanies(companiesListRes.data ?? []);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Registered Candidates",
      value: stats.students,
      change: "+12% this batch",
      icon: Users,
      glow: "from-blue-500/20 to-indigo-500/10",
      accent: "text-blue-400",
      border: "border-blue-500/30",
    },
    {
      title: "Active Visiting Recruiters",
      value: stats.companies,
      change: "Across Tier-1 & Tier-2",
      icon: Building2,
      glow: "from-purple-500/20 to-pink-500/10",
      accent: "text-purple-400",
      border: "border-purple-500/30",
    },
    {
      title: "Assessments Scheduled",
      value: stats.tests,
      change: "Active Question Banks",
      icon: ClipboardList,
      glow: "from-amber-500/20 to-orange-500/10",
      accent: "text-amber-400",
      border: "border-amber-500/30",
    },
    {
      title: "Campus Pass Velocity",
      value: `${stats.passRate}%`,
      change: `${stats.totalAttempts} total attempts`,
      icon: TrendingUp,
      glow: "from-emerald-500/20 to-teal-500/10",
      accent: "text-emerald-400",
      border: "border-emerald-500/30",
    },
  ];

  return (
    <div className="space-y-8 pb-16">
      
      {/* 1. Header Command Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-primary/20 text-primary border-primary/40 font-mono text-[11px] px-2.5 py-0.5">
              <Zap className="mr-1 h-3 w-3" /> RECRUITMENT INTELLIGENCE CENTER
            </Badge>
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            Admin Placement Operations
          </h1>
          <p className="text-sm text-slate-400">
            Real-time candidate telemetry, company recruitment pipelines & AI assessment orchestration.
          </p>
        </div>

        {/* Action Triggers */}
        <div className="flex flex-wrap items-center gap-3">
          {/* AI Assistant Button */}
          <Button
            onClick={() => setAssistantOpen(true)}
            className="h-11 px-4 rounded-xl bg-gradient-to-r from-primary to-indigo-600 font-bold text-white shadow-[0_0_25px_rgba(108,92,231,0.5)] hover:scale-105 active:scale-95 transition-all gap-2"
          >
            <Bot className="h-4 w-4" />
            <span>Ask Placement AI</span>
            <Mic className="h-3.5 w-3.5 opacity-80" />
          </Button>

          {/* Invite Company */}
          <Button
            onClick={() => setInviteOpen(true)}
            variant="outline"
            className="h-11 px-4 rounded-xl glass-button text-slate-200 hover:text-white border-white/15 gap-2 font-semibold"
          >
            <Plus className="h-4 w-4 text-primary" />
            <span>Invite Company</span>
          </Button>

          {/* New Test */}
          <Button
            asChild
            variant="outline"
            className="h-11 px-4 rounded-xl glass-button text-slate-200 hover:text-white border-white/15 gap-2 font-semibold"
          >
            <Link to="/admin/tests">
              <ClipboardList className="h-4 w-4 text-purple-400" />
              <span>Create Test</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. 3D Stat Bento Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, idx) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
          >
            <GlassCard className={`relative overflow-hidden p-6 border ${card.border} hover:scale-[1.02] transition-transform`}>
              <div className={`absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${card.glow} blur-2xl pointer-events-none`} />

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{card.title}</span>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 ${card.accent}`}>
                  <card.icon className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-4 flex items-baseline gap-3">
                <span className="font-display text-3xl font-extrabold text-white">{card.value}</span>
              </div>

              <div className="mt-2 flex items-center text-xs text-slate-400">
                <span className="text-emerald-400 mr-1.5 font-medium">●</span>
                <span>{card.change}</span>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* 3. Middle Section: Drives & Deadlines + Recent Proctoring Stream */}
      <div className="grid gap-6 lg:grid-cols-7">
        
        {/* Upcoming Drives & Registration Deadlines (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" /> Active Drives & Registration Timelines
            </h2>
            <Link to="/admin/tests" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              Manage all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {upcomingTests.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground mb-2 opacity-50" />
                <p className="text-sm font-semibold text-white">No active assessments scheduled</p>
                <p className="text-xs text-slate-400 mt-1">Create an assessment or invite a visiting company to launch a drive.</p>
                <Button onClick={() => setInviteOpen(true)} size="sm" className="mt-4 rounded-xl bg-primary text-white">
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Invite Recruiter
                </Button>
              </GlassCard>
            ) : (
              upcomingTests.map((t) => {
                const deadlinePast = t.registration_deadline ? isPast(new Date(t.registration_deadline)) : false;
                return (
                  <GlassCard key={t.id} className="p-5 border-white/10 hover:border-primary/40 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display text-base font-bold text-white">{t.title}</span>
                          {t.companies?.name && (
                            <Badge className="bg-white/10 text-slate-200 border-white/15 text-[11px]">
                              {t.companies.name}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                            Test Date: {new Date(t.scheduled_date).toLocaleDateString()} at {new Date(t.scheduled_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span>•</span>
                          <span>Duration: {t.duration} mins</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {t.registration_deadline ? (
                          deadlinePast ? (
                            <Badge variant="destructive" className="text-[10px] font-semibold">
                              Registration Closed
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-semibold">
                              Open till {new Date(t.registration_deadline).toLocaleDateString()}
                            </Badge>
                          )
                        ) : (
                          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px]">
                            Open Registration
                          </Badge>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                );
              })
            )}
          </div>
        </div>

        {/* Live Candidate Proctoring & Submission Stream (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-400" /> Live Assessment Telemetry
            </h2>
            <Link to="/admin/analytics" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              Analytics <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <GlassCard className="p-4 divide-y divide-white/10">
            {recentAttempts.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No recent candidate test submissions recorded yet.
              </div>
            ) : (
              recentAttempts.map((attempt) => (
                <div key={attempt.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {attempt.profiles?.name || attempt.profiles?.email || "Student Candidate"}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {attempt.tests?.title || "Assessment"} • {attempt.profiles?.branch || "B.Tech"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`font-mono text-xs font-bold ${attempt.passed ? "text-emerald-400" : "text-slate-400"}`}>
                      {attempt.total_score}%
                    </span>

                    {attempt.tab_switches > 0 ? (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        {attempt.tab_switches} Sw.
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] px-1.5 py-0">
                        Clean
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </GlassCard>
        </div>

      </div>

      {/* 4. Bottom Row: Visiting Recruiters & Company Pipeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-purple-400" /> Visiting Recruiter Roster
          </h2>
          <Button onClick={() => setInviteOpen(true)} size="sm" variant="outline" className="rounded-xl glass-button text-xs gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Invite Recruiter
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {activeCompanies.map((c) => (
            <GlassCard key={c.id} className="p-5 border-white/10 hover:border-purple-500/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold">
                  {c.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-display font-bold text-white text-sm">{c.name}</h3>
                  <p className="text-xs text-slate-400">{c.job_role || "Software Engineer"}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-400">Package:</span>
                <span className="font-semibold text-emerald-400">{c.salary_package || "Industry Standard"}</span>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* 5. Floating Placement AI Trigger (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-40">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setAssistantOpen(true)}
          className="flex items-center gap-2.5 rounded-full bg-gradient-to-r from-primary to-indigo-600 px-5 py-3 text-white font-bold shadow-[0_10px_35px_rgba(108,92,231,0.6)] border border-white/20 backdrop-blur-xl"
        >
          <Bot className="h-5 w-5 text-white" />
          <span className="text-sm">Placement Oracle AI</span>
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
        </motion.button>
      </div>

      {/* Modals */}
      <AdminAIAssistant open={assistantOpen} onOpenChange={setAssistantOpen} />
      <InviteCompanyDialog open={inviteOpen} onOpenChange={setInviteOpen} onInvited={fetchDashboardData} />

    </div>
  );
}
