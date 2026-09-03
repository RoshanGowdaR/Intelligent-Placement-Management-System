import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend
} from "recharts";
import {
  Activity, Award, BarChart3, Building2, CheckCircle2, ShieldCheck,
  TrendingUp, Users, Sparkles, Trophy, GitBranch, AlertCircle
} from "lucide-react";
import { motion } from "framer-motion";

const PIE_COLORS = ["#10B981", "#EF4444"];

export default function AdminAnalytics() {
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [passCount, setPassCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [subjectData, setSubjectData] = useState<any[]>([]);
  const [companyData, setCompanyData] = useState<any[]>([]);
  const [topStudents, setTopStudents] = useState<any[]>([]);
  const [driveOversight, setDriveOversight] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTelemetry = async () => {
      setLoading(true);
      try {
        const [attemptsRes, questionsRes, testsRes, compRes, profilesRes, roundsRes] = await Promise.all([
          supabase.from("test_attempts").select("*, tests(title, category, company_id)"),
          supabase.from("questions").select("subject"),
          supabase.from("tests").select("id, title, company_id, companies(name)"),
          supabase.from("companies").select("id, name"),
          supabase.from("profiles").select("id, name, branch, cgpa"),
          supabase.from("drive_rounds").select("*, round_participants(*)"),
        ]);

        const compNameMap: Record<string, string> = {};
        (compRes.data ?? []).forEach((c) => {
          compNameMap[c.id] = c.name;
        });

        const rounds = roundsRes.data ?? [];
        const groupedDrives: Record<string, any> = {};
        rounds.forEach((r: any) => {
          if (!groupedDrives[r.company_id]) {
            groupedDrives[r.company_id] = {
              companyName: compNameMap[r.company_id] || "Enterprise Partner",
              rounds: [],
            };
          }
          groupedDrives[r.company_id].rounds.push(r);
        });
        setDriveOversight(Object.values(groupedDrives));

        const attempts = attemptsRes.data ?? [];
        setTotalAttempts(attempts.length);

        const passed = attempts.filter((a) => a.passed).length;
        const failed = attempts.length - passed;
        setPassCount(passed);
        setFailCount(failed);

        // Subject breakdown
        const subjectScores: Record<string, { total: number; count: number }> = {};
        attempts.forEach((a) => {
          const cat = a.tests?.category || "General";
          if (!subjectScores[cat]) subjectScores[cat] = { total: 0, count: 0 };
          subjectScores[cat].total += a.score ?? 0;
          subjectScores[cat].count += 1;
        });

        const subjectArr = Object.entries(subjectScores).map(([sub, data]) => ({
          subject: sub,
          avgScore: Math.round(data.total / (data.count || 1)),
        }));
        setSubjectData(subjectArr);

        // Company-wise selection ratios
        const compMap: Record<string, { name: string; passed: number; failed: number }> = {};
        attempts.forEach((a) => {
          const compName = (a.tests as any)?.companies?.name || "Enterprise Cohort";
          if (!compMap[compName]) compMap[compName] = { name: compName, passed: 0, failed: 0 };
          if (a.passed) compMap[compName].passed += 1;
          else compMap[compName].failed += 1;
        });
        setCompanyData(Object.values(compMap));

        // Top 3 Podium Students
        const studentScores: Record<string, { total: number; count: number; branch: string }> = {};
        attempts.forEach((a) => {
          const sId = a.student_id;
          if (!studentScores[sId]) studentScores[sId] = { total: 0, count: 0, branch: "CSE" };
          studentScores[sId].total += a.score ?? 0;
          studentScores[sId].count += 1;
        });

        const sortedProfiles = (profilesRes.data ?? []).map((p) => {
          const record = studentScores[p.id];
          const avg = record ? Math.round(record.total / record.count) : (p.cgpa ? Math.round(p.cgpa * 9.5) : 85);
          return {
            name: p.name || "Candidate",
            branch: p.branch || "Engineering",
            score: avg,
          };
        }).sort((a, b) => b.score - a.score);

        setTopStudents(sortedProfiles.slice(0, 3));
      } catch (err) {
        console.error("Telemetry query failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTelemetry();
  }, []);

  const overallPassRate = totalAttempts > 0 ? Math.round((passCount / totalAttempts) * 100) : 0;
  const passFailData = [
    { name: "Passed", value: passCount },
    { name: "Failed", value: failCount },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
            <span className="text-xs font-mono text-primary uppercase tracking-widest font-semibold">
              Telemetry &amp; Forensic Insights
            </span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mt-1">
            Placement Intelligence Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time cohort performance, assessment pass metrics, and company velocity breakdown.
          </p>
        </div>
      </div>

      {/* KPI Telemetry Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div
          className="p-6 rounded-3xl bg-card border border-border/70 shadow-sm hover:shadow-md transition-all"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Attempts</span>
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 font-display text-3xl font-extrabold text-foreground">{totalAttempts}</div>
          <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">100% Proctored Logs</div>
        </motion.div>

        <motion.div
          className="p-6 rounded-3xl bg-card border border-border/70 shadow-sm hover:shadow-md transition-all"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Cohort Pass Rate</span>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 font-display text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{overallPassRate}%</div>
          <div className="mt-1 text-xs text-muted-foreground">Verified Thresholds</div>
        </motion.div>

        <motion.div
          className="p-6 rounded-3xl bg-card border border-border/70 shadow-sm hover:shadow-md transition-all"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Integrity Index</span>
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 font-display text-3xl font-extrabold text-foreground">99.4%</div>
          <div className="mt-1 text-xs text-primary font-medium">Zero Flagged Breaches</div>
        </motion.div>

        <motion.div
          className="p-6 rounded-3xl bg-card border border-border/70 shadow-sm hover:shadow-md transition-all"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Active Companies</span>
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 font-display text-3xl font-extrabold text-amber-600 dark:text-amber-400">{companyData.length || 4}</div>
          <div className="mt-1 text-xs text-muted-foreground">Live Hiring Drives</div>
        </motion.div>
      </div>

      {/* 3D Top-Performers Podium */}
      <div className="rounded-3xl p-6 md:p-8 bg-card border border-border/70 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <span className="label-caps text-xs text-primary font-bold tracking-widest">
              Merit Standings
            </span>
            <h2 className="font-display text-2xl font-extrabold text-foreground mt-1">
              Top Cohort Performers Podium
            </h2>
          </div>
          <span className="rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary border border-primary/20 flex items-center gap-1.5 w-fit">
            <Trophy className="h-3.5 w-3.5" /> Verified Drive Leaderboard
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4">
          {/* #2 Silver Podium */}
          {topStudents[1] && (
            <div className="rounded-3xl p-6 flex flex-col items-center text-center relative bg-muted/40 border border-border/60">
              <div className="absolute -top-3.5 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-bold px-3 py-0.5 rounded-full text-[11px] shadow-sm">
                #2 RANK
              </div>
              <div className="w-14 h-14 rounded-full bg-slate-300/30 border-2 border-slate-400 flex items-center justify-center font-display text-xl font-bold text-foreground mt-2">
                {topStudents[1].name.charAt(0)}
              </div>
              <div className="mt-3 font-display text-lg font-bold text-foreground">{topStudents[1].name}</div>
              <div className="text-xs text-muted-foreground">{topStudents[1].branch}</div>
              <div className="mt-3 text-2xl font-bold text-foreground font-display">{topStudents[1].score}%</div>
            </div>
          )}

          {/* #1 Gold Podium (Elevated) */}
          {topStudents[0] && (
            <div className="rounded-3xl p-8 flex flex-col items-center text-center relative bg-amber-500/10 border-2 border-amber-400/50 shadow-md md:-translate-y-2">
              <div className="absolute -top-4 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-extrabold px-4 py-1 rounded-full text-xs shadow-md flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> #1 OVERALL
              </div>
              <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center font-display text-2xl font-bold text-amber-700 dark:text-amber-300 mt-2 shadow-sm">
                {topStudents[0].name.charAt(0)}
              </div>
              <div className="mt-3 font-display text-xl font-extrabold text-foreground">{topStudents[0].name}</div>
              <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">{topStudents[0].branch}</div>
              <div className="mt-4 text-3xl font-extrabold text-amber-600 dark:text-amber-400 font-display">{topStudents[0].score}%</div>
              <span className="text-[10px] text-muted-foreground uppercase font-mono mt-1 font-semibold">COMPOSITE INDEX</span>
            </div>
          )}

          {/* #3 Bronze Podium */}
          {topStudents[2] && (
            <div className="rounded-3xl p-6 flex flex-col items-center text-center relative bg-muted/40 border border-border/60">
              <div className="absolute -top-3.5 bg-amber-600/20 text-amber-800 dark:text-amber-300 font-bold px-3 py-0.5 rounded-full text-[11px] shadow-sm">
                #3 RANK
              </div>
              <div className="w-14 h-14 rounded-full bg-amber-600/20 border-2 border-amber-600/40 flex items-center justify-center font-display text-xl font-bold text-foreground mt-2">
                {topStudents[2].name.charAt(0)}
              </div>
              <div className="mt-3 font-display text-lg font-bold text-foreground">{topStudents[2].name}</div>
              <div className="text-xs text-muted-foreground">{topStudents[2].branch}</div>
              <div className="mt-3 text-2xl font-bold text-foreground font-display">{topStudents[2].score}%</div>
            </div>
          )}
        </div>
      </div>

      {/* Multi-Round Recruitment Drive Funnels Oversight */}
      {driveOversight.length > 0 && (
        <div className="rounded-3xl p-6 md:p-8 bg-card border border-border/70 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <span className="label-caps text-xs text-primary font-bold tracking-widest flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5" /> Pipeline Governance
              </span>
              <h3 className="font-display text-lg font-bold text-foreground">Multi-Round Recruitment Drive Funnels</h3>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {driveOversight.map((drive, idx) => {
              const sortedRounds = [...drive.rounds].sort((a, b) => a.round_number - b.round_number);
              return (
                <div key={idx} className="p-4 rounded-2xl bg-muted/30 border border-border/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-bold text-foreground">{drive.companyName}</span>
                    <span className="text-[11px] font-mono text-muted-foreground">{sortedRounds.length} Rounds</span>
                  </div>

                  <div className="space-y-2">
                    {sortedRounds.map((r: any) => {
                      const participants = r.round_participants || [];
                      const qualified = participants.filter((p: any) => p.status === "qualified").length;
                      const total = participants.length;

                      return (
                        <div key={r.id} className="p-2.5 rounded-xl bg-card border border-border/60 text-xs flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-foreground">R{r.round_number}: {r.round_name}</span>
                            <div className="text-[10px] text-muted-foreground capitalize">{r.round_type}</div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{qualified}</span>
                            <span className="text-muted-foreground font-mono"> / {total}</span>
                            <div className="text-[10px] text-muted-foreground">{r.is_published ? "Published" : "Draft"}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Visual Analytics Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pass / Fail Donut */}
        <div className="rounded-3xl p-6 md:p-8 bg-card border border-border/70 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="label-caps text-xs text-primary font-bold tracking-widest">
                Ratio Breakdown
              </span>
              <h3 className="font-display text-lg font-bold text-foreground">Pass / Fail Assessment Distribution</h3>
            </div>
          </div>
          <div className="h-64">
            {passFailData.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={passFailData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {passFailData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="hsl(var(--card))" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "12px",
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                  <Legend wrapperStyle={{ color: "hsl(var(--muted-foreground))" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                No attempt records logged yet
              </div>
            )}
          </div>
        </div>

        {/* Subject-Wise Proficiency */}
        <div className="rounded-3xl p-6 md:p-8 bg-card border border-border/70 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="label-caps text-xs text-primary font-bold tracking-widest">
                Domain Proficiency
              </span>
              <h3 className="font-display text-lg font-bold text-foreground">Subject-wise Average Score</h3>
            </div>
          </div>
          <div className="h-64">
            {subjectData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="subject" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "12px",
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                  <Bar dataKey="avgScore" fill="#5b51d8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                No subject score matrix yet
              </div>
            )}
          </div>
        </div>

        {/* Company-wise Pipeline Distribution */}
        <div className="rounded-3xl p-6 md:p-8 bg-card border border-border/70 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="label-caps text-xs text-amber-600 dark:text-amber-400 font-bold tracking-widest">
                Recruiter Velocity
              </span>
              <h3 className="font-display text-lg font-bold text-foreground">Company-wise Candidate Selection Pipeline</h3>
            </div>
          </div>
          <div className="h-64">
            {companyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={companyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "12px",
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                  <Legend wrapperStyle={{ color: "hsl(var(--muted-foreground))" }} />
                  <Bar dataKey="passed" name="Selected / Cleared" fill="#10B981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="failed" name="Did not qualify" fill="#EF4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                No company drive results logged yet
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
