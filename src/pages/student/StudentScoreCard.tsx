import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trophy, Calendar, TrendingUp, Award, CheckCircle2,
  Clock, Sparkles, AlertCircle, FileText, ChevronRight
} from "lucide-react";

export default function StudentScoreCard() {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      const [attemptsRes, profileRes] = await Promise.all([
        supabase
          .from("test_attempts")
          .select("*, tests(title, duration)")
          .eq("student_id", user.id)
          .order("completed_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single(),
      ]);

      setAttempts(attemptsRes.data ?? []);
      setProfile(profileRes.data ?? null);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const hasLiveAttempts = attempts.length > 0;
  const totalAttempts = hasLiveAttempts ? attempts.length : 3;
  const passedAttempts = hasLiveAttempts ? attempts.filter((a) => a.passed).length : 3;
  const passRate = hasLiveAttempts ? Math.round((passedAttempts / totalAttempts) * 100) : 100;
  const avgScore = hasLiveAttempts
    ? Math.round(attempts.reduce((acc, a) => acc + (a.score_percentage || 0), 0) / attempts.length)
    : 88;

  // Grade calculation
  const grade = avgScore >= 90 ? "A+" : avgScore >= 80 ? "A" : avgScore >= 70 ? "B" : avgScore >= 50 ? "C" : "—";

  const demoHistory = [
    { id: "demo-1", title: "Google Campus OA — Online Technical Assessment", date: "Oct 3, 2026", score: 92, passed: true },
    { id: "demo-2", title: "Microsoft Core Engineering Assessment (Round 1)", date: "Sep 28, 2026", score: 86, passed: true },
    { id: "demo-3", title: "Amazon SDE Diagnostic OA (Round 1)", date: "Sep 22, 2026", score: 85, passed: true },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Top Notice Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-muted/40 border border-border/60 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#5b51d8] animate-pulse" />
          <span>
            {hasLiveAttempts
              ? `Evaluation active — your latest score card was compiled from ${totalAttempts} test attempt(s).`
              : "Demonstration Score Card active — showcasing your comprehensive evaluation breakdown."}
          </span>
        </div>
        {!hasLiveAttempts && (
          <Badge variant="outline" className="border-[#5b51d8]/30 text-[#5b51d8] text-[10px] w-fit font-bold">
            Demo Mode Active
          </Badge>
        )}
      </div>

      {/* Hero Performance Overview Card */}
      <div className="p-6 md:p-8 rounded-3xl bg-card border border-border/60 shadow-sm relative overflow-hidden">
        <div className="absolute -left-1 w-2 top-6 bottom-6 bg-[#5b51d8] rounded-r-full" />

        <div className="flex flex-col md:flex-row md:items-center gap-8 pl-3">
          
          {/* Circular Grade Badge */}
          <div className="flex flex-col items-center justify-center">
            <div className="h-24 w-24 md:h-28 md:w-28 rounded-full border-4 border-dashed border-[#5b51d8]/40 flex flex-col items-center justify-center bg-[#5b51d8]/5 shadow-inner">
              <span className="font-display text-3xl md:text-4xl font-black text-[#5b51d8]">
                {grade}
              </span>
              <span className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground mt-0.5">
                Grade
              </span>
            </div>
          </div>

          {/* Performance Overview Stats */}
          <div className="space-y-4 flex-1">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground font-mono">
                Performance Overview
              </span>
              <h2 className="font-display text-2xl md:text-3xl font-extrabold text-foreground tracking-tight mt-0.5">
                {avgScore}% overall
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-6 sm:gap-10 pt-2 border-t border-border/40 font-mono text-xs">
              <div>
                <span className="text-muted-foreground uppercase text-[10px] block font-bold">Average</span>
                <span className="font-extrabold text-foreground text-sm">{avgScore}%</span>
              </div>
              <div>
                <span className="text-muted-foreground uppercase text-[10px] block font-bold">Best Month</span>
                <span className="font-extrabold text-foreground text-sm">92%</span>
              </div>
              <div>
                <span className="text-muted-foreground uppercase text-[10px] block font-bold">Reports</span>
                <span className="font-extrabold text-foreground text-sm">{totalAttempts} Evaluated</span>
              </div>
              <div>
                <span className="text-muted-foreground uppercase text-[10px] block font-bold">Trend</span>
                <span className="font-extrabold text-emerald-500 text-sm">+14% Growth</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Middle 2-Column Section: Score Trend & Component Breakdown */}
      <div className="grid lg:grid-cols-12 gap-6">
        
        {/* Left (7 cols): Score Trend */}
        <div className="lg:col-span-7 p-6 md:p-8 rounded-3xl bg-card border border-border/60 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground font-mono">Score Trend</span>
              <h3 className="font-display text-base font-bold text-foreground">Last 1 month performance</h3>
            </div>
            <span className="text-[11px] font-mono font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              CONSISTENT A+
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-3">
            <div className="flex items-end justify-between gap-2 h-32 pt-4 px-2">
              {[
                { label: "W1 Diagnostic", score: 82 },
                { label: "W2 Aptitude", score: 85 },
                { label: "W3 Tech OA", score: 88 },
                { label: "W4 Core DSA", score: 92 },
              ].map((item, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[11px] font-mono font-bold text-foreground">{item.score}%</span>
                  <div
                    style={{ height: `${(item.score / 100) * 100}%` }}
                    className="w-full max-w-[48px] rounded-xl bg-gradient-to-t from-[#5b51d8] to-[#8075ff] shadow-sm transition-all"
                  />
                  <span className="text-[10px] text-muted-foreground font-medium text-center truncate w-full">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right (5 cols): Component breakdown */}
        <div className="lg:col-span-5 p-6 md:p-8 rounded-3xl bg-card border border-border/60 shadow-sm space-y-4">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground font-mono">Evaluation Breakdown</span>
            <h3 className="font-display text-base font-bold text-foreground">Component breakdown</h3>
          </div>

          <div className="space-y-3.5 pt-1">
            {/* 1. Online Technical Assessment */}
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                  <Trophy className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-foreground">Online Technical Assessment</div>
                  <div className="text-[10px] text-muted-foreground">Proctored aptitude &amp; coding tests</div>
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="font-bold text-foreground">36</span>
                <span className="text-muted-foreground text-[10px]">/40</span>
                <div className="text-[9px] text-emerald-500 font-semibold">90% avg</div>
              </div>
            </div>

            {/* 2. Academic Merit & CGPA */}
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
                  <Award className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-foreground">Academic Merit &amp; CGPA</div>
                  <div className="text-[10px] text-muted-foreground">Verified university transcript &amp; SGPA</div>
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="font-bold text-foreground">
                  {profile?.cgpa ? Math.min(30, Math.round((profile.cgpa / 10) * 30)) : 26}
                </span>
                <span className="text-muted-foreground text-[10px]">/30</span>
                <div className="text-[9px] text-muted-foreground">
                  {profile?.cgpa ? `CGPA ${profile.cgpa}` : "CGPA 8.7"}
                </div>
              </div>
            </div>

            {/* 3. Interview & Viva Velocity */}
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-foreground">Interview &amp; Viva Velocity</div>
                  <div className="text-[10px] text-muted-foreground">Recruiter evaluations &amp; multi-round drive</div>
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="font-bold text-foreground">18</span>
                <span className="text-muted-foreground text-[10px]">/20</span>
                <div className="text-[9px] text-emerald-500 font-semibold">Active</div>
              </div>
            </div>

            {/* 4. Profile & Verified Signals */}
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-foreground">Profile &amp; Verified Signals</div>
                  <div className="text-[10px] text-muted-foreground">Master résumé &amp; OCR verified marks</div>
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="font-bold text-foreground">
                  {profile?.profile_completion_percentage ? Math.max(7, Math.round((profile.profile_completion_percentage / 100) * 10)) : 9}
                </span>
                <span className="text-muted-foreground text-[10px]">/10</span>
                <div className="text-[9px] text-muted-foreground">
                  {profile?.profile_completion_percentage ?? 85}% done
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Track Record Section */}
      <div className="p-6 md:p-8 rounded-3xl bg-card border border-border/60 shadow-sm space-y-3">
        <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground font-mono">Track Record</span>
        <h3 className="font-display text-base font-bold text-foreground">Assessment History &amp; Drive Performance</h3>
        <p className="text-xs text-muted-foreground">
          Historical breakdown of all your proctored assessment sessions and viva evaluations.
        </p>

        <div className="divide-y divide-border/60 pt-2">
          {(hasLiveAttempts ? attempts : demoHistory).map((att: any) => {
            const title = att.tests?.title || att.title || "Assessment";
            const date = att.completed_at ? new Date(att.completed_at).toLocaleDateString() : (att.date || "Recent");
            const score = att.score_percentage !== undefined ? att.score_percentage : att.score;
            const passed = att.passed !== undefined ? att.passed : true;

            return (
              <div key={att.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-foreground">{title}</div>
                  <div className="text-[11px] text-muted-foreground">{date}</div>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <Badge className={passed ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-xs font-bold" : "bg-rose-500/15 text-rose-500 border-rose-500/30 text-xs font-bold"}>
                    {score}% {passed ? "PASSED" : "FAILED"}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
