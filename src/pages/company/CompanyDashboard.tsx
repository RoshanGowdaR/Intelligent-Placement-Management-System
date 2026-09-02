import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { GlassCard } from "@/components/3d/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Users, ClipboardList, TrendingUp, Plus, Calendar,
  CheckCircle2, Clock, ChevronRight, FileText, Sparkles, UserCheck
} from "lucide-react";
import { motion } from "framer-motion";
import { isPast } from "date-fns";

export default function CompanyDashboard() {
  const { user } = useAuth();
  const [company, setCompany] = useState<any>(null);
  const [stats, setStats] = useState({
    eligibleStudents: 0,
    registeredCandidates: 0,
    testsCreated: 0,
    passRate: 0,
  });
  const [companyTests, setCompanyTests] = useState<any[]>([]);
  const [recentCandidates, setRecentCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompanyData();
  }, [user]);

  const fetchCompanyData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Fetch current company record linked to user_id
      const { data: compData } = await supabase
        .from("companies")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      const currentCompany = compData || {
        name: user.user_metadata?.company_name || "Visiting Recruiter",
        id: null,
      };
      setCompany(currentCompany);

      // 2. Fetch tests created by this company or linked company_id
      let testQuery = supabase.from("tests").select("*");
      if (currentCompany.id) {
        testQuery = testQuery.or(`created_by.eq.${user.id},company_id.eq.${currentCompany.id}`);
      } else {
        testQuery = testQuery.eq("created_by", user.id);
      }
      const { data: tests } = await testQuery;
      const testsList = tests ?? [];
      setCompanyTests(testsList);

      const testIds = testsList.map((t) => t.id);

      // 3. Fetch registered schedules count & attempts count for company tests
      let registeredCount = 0;
      let attemptsList: any[] = [];

      if (testIds.length > 0) {
        const [schedulesRes, attemptsRes] = await Promise.all([
          supabase.from("schedules").select("id", { count: "exact", head: true }).in("test_id", testIds),
          supabase.from("test_attempts").select("id, student_id, total_score, passed, completed_at, profiles(name, email, branch, cgpa), tests(title)").in("test_id", testIds).order("completed_at", { ascending: false }).limit(6),
        ]);

        registeredCount = schedulesRes.count ?? 0;
        attemptsList = attemptsRes.data ?? [];
        setRecentCandidates(attemptsList);
      }

      // 4. Calculate eligible students on campus based on max_backlogs or branch
      const { count: totalStudents } = await supabase.from("profiles").select("id", { count: "exact", head: true });

      const passedAttempts = attemptsList.filter((a) => a.passed).length;
      const passRate = attemptsList.length > 0 ? Math.round((passedAttempts / attemptsList.length) * 100) : 0;

      setStats({
        eligibleStudents: totalStudents ?? 0,
        registeredCandidates: registeredCount,
        testsCreated: testsList.length,
        passRate,
      });
    } catch (err) {
      console.error("Error loading company dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Eligible Students on Campus",
      value: stats.eligibleStudents,
      subtitle: "Matching campus talent pool",
      icon: UserCheck,
      color: "text-blue-400",
      glow: "from-blue-500/20 to-indigo-500/10",
      border: "border-blue-500/30",
    },
    {
      title: "Registered Candidates",
      value: stats.registeredCandidates,
      subtitle: "Enrolled for your assessments",
      icon: Users,
      color: "text-purple-400",
      glow: "from-purple-500/20 to-pink-500/10",
      border: "border-purple-500/30",
    },
    {
      title: "Assessments Created",
      value: stats.testsCreated,
      subtitle: "Active test suites",
      icon: ClipboardList,
      color: "text-amber-400",
      glow: "from-amber-500/20 to-orange-500/10",
      border: "border-amber-500/30",
    },
    {
      title: "Assessment Pass Rate",
      value: `${stats.passRate}%`,
      subtitle: "Candidate qualification velocity",
      icon: TrendingUp,
      color: "text-emerald-400",
      glow: "from-emerald-500/20 to-teal-500/10",
      border: "border-emerald-500/30",
    },
  ];

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 font-mono text-[11px] px-2.5 py-0.5">
              RECRUITER PORTAL
            </Badge>
            <span className="text-xs text-slate-400 font-semibold">{company?.name || "Company Recruiter"}</span>
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            Recruitment Command Center
          </h1>
          <p className="text-sm text-slate-400">
            Schedule hiring assessments, monitor candidate registration deadlines & evaluate performance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild className="h-11 px-5 rounded-xl bg-primary text-white font-bold shadow-[0_0_20px_rgba(108,92,231,0.5)] gap-2">
            <Link to="/company/tests">
              <Plus className="h-4 w-4" /> Create Assessment
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-11 px-4 rounded-xl glass-button text-slate-200 hover:text-white border-white/15 gap-2">
            <Link to="/company/reports">
              <FileText className="h-4 w-4 text-emerald-400" /> Drive Reports
            </Link>
          </Button>
        </div>
      </div>

      {/* 3D Stat Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, idx) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
          >
            <GlassCard className={`relative overflow-hidden p-6 border ${card.border}`}>
              <div className={`absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${card.glow} blur-2xl pointer-events-none`} />

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{card.title}</span>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 ${card.color}`}>
                  <card.icon className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-4 flex items-baseline gap-3">
                <span className="font-display text-3xl font-extrabold text-white">{card.value}</span>
              </div>

              <div className="mt-2 text-xs text-slate-400">{card.subtitle}</div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Main Grid: My Tests & Deadlines + Candidate Submissions */}
      <div className="grid gap-6 lg:grid-cols-7">
        
        {/* Left 4 cols: My Scheduled Assessments */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" /> My Scheduled Assessments
            </h2>
            <Link to="/company/tests" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              Create New <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {companyTests.length === 0 ? (
              <GlassCard className="p-8 text-center border-white/10">
                <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground mb-2 opacity-50" />
                <p className="text-sm font-semibold text-white">No assessments created yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Create a tailored placement test with custom questions and a registration window for students.
                </p>
                <Button asChild size="sm" className="mt-4 rounded-xl bg-primary text-white">
                  <Link to="/company/tests">
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Launch First Test
                  </Link>
                </Button>
              </GlassCard>
            ) : (
              companyTests.map((t) => {
                const deadlinePast = t.registration_deadline ? isPast(new Date(t.registration_deadline)) : false;
                return (
                  <GlassCard key={t.id} className="p-5 border-white/10 hover:border-primary/40 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-display text-base font-bold text-white">{t.title}</h3>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                            Date: {new Date(t.scheduled_date).toLocaleDateString()}
                          </span>
                          <span>•</span>
                          <span>Duration: {t.duration} mins</span>
                          <span>•</span>
                          <span>Passing Cutoff: {t.pass_criteria?.pass_percentage ?? 50}%</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {t.registration_deadline ? (
                          deadlinePast ? (
                            <Badge variant="destructive" className="text-[10px]">
                              Registration Closed
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                              Open till {new Date(t.registration_deadline).toLocaleDateString()}
                            </Badge>
                          )
                        ) : (
                          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px]">
                            Open
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

        {/* Right 3 cols: Recent Candidate Submissions */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-400" /> Candidate Submissions
            </h2>
            <Link to="/company/candidates" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              All Candidates <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <GlassCard className="p-4 divide-y divide-white/10">
            {recentCandidates.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No candidate submissions for your tests yet.
              </div>
            ) : (
              recentCandidates.map((attempt) => (
                <div key={attempt.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {attempt.profiles?.name || attempt.profiles?.email || "Candidate"}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {attempt.profiles?.branch || "B.Tech"} • CGPA: {attempt.profiles?.cgpa || "N/A"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`font-mono text-xs font-bold ${attempt.passed ? "text-emerald-400" : "text-slate-400"}`}>
                      {attempt.total_score}%
                    </span>
                    <Badge className={attempt.passed ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]" : "bg-white/5 text-slate-400 text-[10px]"}>
                      {attempt.passed ? "Qualified" : "Below Cutoff"}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </GlassCard>
        </div>

      </div>

    </div>
  );
}
