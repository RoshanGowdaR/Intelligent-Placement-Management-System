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

  const totalAttempts = attempts.length;
  const passedAttempts = attempts.filter((a) => a.passed).length;
  const passRate = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0;
  const avgScore = totalAttempts > 0
    ? Math.round(attempts.reduce((acc, a) => acc + (a.score_percentage || 0), 0) / totalAttempts)
    : 0;

  // Grade calculation
  const grade = avgScore >= 90 ? "A+" : avgScore >= 80 ? "A" : avgScore >= 70 ? "B" : avgScore >= 50 ? "C" : "—";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Top Notice Banner matching Image 5 */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-muted/40 border border-border/60 text-xs text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-[#5b51d8] animate-pulse" />
        <span>
          {totalAttempts > 0
            ? `Evaluation active — your latest score card was compiled from ${totalAttempts} test attempt(s).`
            : "No evaluations yet — your first score card publishes at the end of the month or after your first assessment."}
        </span>
      </div>

      {/* Hero Performance Overview Card matching Image 5 */}
      <div className="p-6 md:p-8 rounded-3xl bg-card border border-border/60 shadow-sm relative overflow-hidden">
        <div className="absolute -left-1 w-2 top-6 bottom-6 bg-[#5b51d8] rounded-r-full" />

        <div className="flex flex-col md:flex-row md:items-center gap-8 pl-3">
          
          {/* Circular Grade Badge */}
          <div className="flex flex-col items-center justify-center">
            <div className="h-24 w-24 md:h-28 md:w-28 rounded-full border-4 border-dashed border-border flex flex-col items-center justify-center bg-muted/10">
              <span className="font-display text-3xl md:text-4xl font-black text-foreground">
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
                {avgScore > 0 ? `${avgScore}%` : "—"} overall
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-6 sm:gap-10 pt-2 border-t border-border/40 font-mono text-xs">
              <div>
                <span className="text-muted-foreground uppercase text-[10px] block font-bold">Average</span>
                <span className="font-extrabold text-foreground text-sm">{avgScore > 0 ? `${avgScore}%` : "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground uppercase text-[10px] block font-bold">Best Month</span>
                <span className="font-extrabold text-foreground text-sm">{avgScore > 0 ? `${avgScore}%` : "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground uppercase text-[10px] block font-bold">Reports</span>
                <span className="font-extrabold text-foreground text-sm">{totalAttempts}</span>
              </div>
              <div>
                <span className="text-muted-foreground uppercase text-[10px] block font-bold">Trend</span>
                <span className="font-extrabold text-emerald-500 text-sm">{passRate > 0 ? `+${passRate}%` : "—"}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Middle 2-Column Section: Score Trend & Component Breakdown matching Image 5 */}
      <div className="grid lg:grid-cols-12 gap-6">
        
        {/* Left (7 cols): Score Trend */}
        <div className="lg:col-span-7 p-6 md:p-8 rounded-3xl bg-card border border-border/60 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground font-mono">Score Trend</span>
              <h3 className="font-display text-base font-bold text-foreground">Last 1 month</h3>
            </div>
            <span className="text-[11px] font-mono font-bold text-muted-foreground">AVERAGE</span>
          </div>

          <div className="h-44 rounded-2xl bg-muted/15 border border-dashed border-border/60 flex items-center justify-center text-xs text-muted-foreground">
            {totalAttempts > 0 ? (
              <div className="space-y-1 text-center">
                <Trophy className="h-6 w-6 text-[#5b51d8] mx-auto opacity-70" />
                <p className="font-semibold text-foreground">{passedAttempts} Passed / {totalAttempts} Attempted</p>
                <p className="text-[11px] text-muted-foreground">Historical test evaluation graph</p>
              </div>
            ) : (
              "No score history yet"
            )}
          </div>
        </div>

        {/* Right (5 cols): Component breakdown matching Image 5 */}
        <div className="lg:col-span-5 p-6 md:p-8 rounded-3xl bg-card border border-border/60 shadow-sm space-y-4">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground font-mono">This Month</span>
            <h3 className="font-display text-base font-bold text-foreground">Component breakdown</h3>
          </div>

          <div className="space-y-3.5 pt-1">
            {/* 1. Attendance */}
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-foreground">Attendance</div>
                  <div className="text-[10px] text-muted-foreground">Consistency</div>
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="font-bold text-foreground">0</span>
                <span className="text-muted-foreground text-[10px]">/20</span>
                <div className="text-[9px] text-muted-foreground">—</div>
              </div>
            </div>

            {/* 2. Monthly assessment */}
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
                  <Trophy className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-foreground">Monthly assessment</div>
                  <div className="text-[10px] text-muted-foreground">Monthly skill assessment</div>
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="font-bold text-foreground">{passedAttempts}</span>
                <span className="text-muted-foreground text-[10px]">/10</span>
                <div className="text-[9px] text-muted-foreground">{totalAttempts > 0 ? `${avgScore}%` : "—"}</div>
              </div>
            </div>

            {/* 3. Live project evaluation */}
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-foreground">Live project evaluation</div>
                  <div className="text-[10px] text-muted-foreground">Execution, functionality &amp; viva</div>
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="font-bold text-foreground">0</span>
                <span className="text-muted-foreground text-[10px]">/50</span>
                <div className="text-[9px] text-muted-foreground">—</div>
              </div>
            </div>

            {/* 4. Project submission */}
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-foreground">Project submission</div>
                  <div className="text-[10px] text-muted-foreground">Deliverables you submitted</div>
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="font-bold text-foreground">0</span>
                <span className="text-muted-foreground text-[10px]">/20</span>
                <div className="text-[9px] text-muted-foreground">—</div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Track Record Section matching Image 5 */}
      <div className="p-6 md:p-8 rounded-3xl bg-card border border-border/60 shadow-sm space-y-3">
        <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground font-mono">Track Record</span>
        <h3 className="font-display text-base font-bold text-foreground">Monthly history</h3>
        <p className="text-xs text-muted-foreground">
          Historical breakdown of all your proctored assessment sessions and viva grades.
        </p>

        {attempts.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No past monthly records yet. Attend company drive assessments to populate your score record.
          </div>
        ) : (
          <div className="divide-y divide-border/60 pt-2">
            {attempts.map((att) => (
              <div key={att.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-foreground">{att.tests?.title || "Assessment"}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {att.completed_at ? new Date(att.completed_at).toLocaleDateString() : "Recent"}
                  </div>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <Badge className={att.passed ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" : "bg-rose-500/15 text-rose-500 border-rose-500/30"}>
                    {att.score_percentage}% {att.passed ? "PASSED" : "FAILED"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
