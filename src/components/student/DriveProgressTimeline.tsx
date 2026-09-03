import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/3d/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GitBranch,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Lock,
  ArrowRight,
  Trophy,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  companyId: string;
  studentId: string;
}

export function DriveProgressTimeline({ companyId, studentId }: Props) {
  const [rounds, setRounds] = useState<any[]>([]);
  const [participants, setParticipants] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId || !studentId) return;

    const fetchTimeline = async () => {
      setLoading(true);
      try {
        // 1. Fetch all configured rounds for company
        const { data: roundsData } = await supabase
          .from("drive_rounds")
          .select("*, tests(id, title, duration, scheduled_date)")
          .eq("company_id", companyId)
          .order("round_number", { ascending: true });

        const roundList = roundsData ?? [];
        setRounds(roundList);

        if (roundList.length > 0) {
          const roundIds = roundList.map((r) => r.id);

          // 2. Fetch student's participation records (filtered by RLS to only published results)
          const { data: partData } = await supabase
            .from("round_participants")
            .select("*")
            .in("drive_round_id", roundIds)
            .eq("student_id", studentId);

          const partMap: Record<string, any> = {};
          (partData ?? []).forEach((p) => {
            partMap[p.drive_round_id] = p;
          });
          setParticipants(partMap);
        }
      } catch (err) {
        console.error("Timeline error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeline();
  }, [companyId, studentId]);

  if (loading) {
    return (
      <GlassCard className="p-6 border-border">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-xs text-muted-foreground">Loading recruitment drive timeline…</span>
        </div>
      </GlassCard>
    );
  }

  if (rounds.length === 0) {
    return null; // No multi-round drive configured yet
  }

  // Determine current active milestone
  let isEliminated = false;
  let allRoundsCleared = false;

  const steps = rounds.map((r, idx) => {
    const part = participants[r.id];
    let state: "qualified" | "not_qualified" | "awaiting" | "open" | "locked" = "locked";

    if (part) {
      if (part.status === "qualified") {
        state = "qualified";
      } else if (part.status === "not_qualified" || part.status === "absent") {
        state = "not_qualified";
        isEliminated = true;
      } else {
        state = "awaiting";
      }
    } else if (!r.is_published && idx === 0 && !isEliminated) {
      state = "open";
    } else if (!r.is_published && idx > 0 && !isEliminated) {
      // Check if previous round was qualified
      const prevRound = rounds[idx - 1];
      const prevPart = participants[prevRound.id];
      if (prevPart && prevPart.status === "qualified") {
        state = "open";
      }
    }

    return { round: r, participant: part, state };
  });

  const lastStep = steps[steps.length - 1];
  if (lastStep?.state === "qualified") {
    allRoundsCleared = true;
  }

  return (
    <GlassCard className="p-6 border-primary/20 bg-gradient-to-br from-primary/[0.03] to-purple-500/[0.03] shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <GitBranch className="h-4 w-4" /> Multi-Round Recruitment Journey
          </div>
          <h2 className="font-display text-xl font-bold text-foreground mt-0.5">
            Your Placement Drive Progress
          </h2>
        </div>

        {allRoundsCleared ? (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-xs py-1 px-3 gap-1.5 font-bold">
            <Trophy className="h-3.5 w-3.5" /> All Rounds Cleared • Selected!
          </Badge>
        ) : isEliminated ? (
          <Badge variant="outline" className="border-rose-500/30 text-rose-400 bg-rose-500/10 text-xs py-1 px-3">
            Drive Concluded
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs py-1 px-3 gap-1">
            <Sparkles className="h-3 w-3 text-purple-400" /> Active Candidate
          </Badge>
        )}
      </div>

      {/* Horizontal Multi-Step Milestone Track */}
      <div className="relative">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ round: r, participant: p, state }, idx) => {
            const isTest = r.round_type === "test";

            return (
              <div
                key={r.id}
                className={`relative rounded-2xl p-4 border transition-all ${
                  state === "qualified"
                    ? "border-emerald-500/40 bg-emerald-500/[0.04]"
                    : state === "not_qualified"
                    ? "border-rose-500/30 bg-rose-500/[0.03]"
                    : state === "open"
                    ? "border-primary/50 bg-primary/[0.06] shadow-[0_0_20px_rgba(108,92,231,0.2)]"
                    : state === "awaiting"
                    ? "border-amber-500/40 bg-amber-500/[0.04]"
                    : "border-border/60 bg-white/[0.01] opacity-70"
                }`}
              >
                {/* Milestone Step Header */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Round {r.round_number}
                  </span>

                  {state === "qualified" && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px] gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Qualified
                    </Badge>
                  )}
                  {state === "not_qualified" && (
                    <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/30 text-[10px] gap-1">
                      <XCircle className="h-3 w-3" /> Not Qualified
                    </Badge>
                  )}
                  {state === "awaiting" && (
                    <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] gap-1">
                      <Clock className="h-3 w-3" /> Awaiting Results
                    </Badge>
                  )}
                  {state === "open" && (
                    <Badge className="bg-primary/20 text-primary border-primary/40 text-[10px] gap-1 animate-pulse">
                      <Sparkles className="h-3 w-3" /> Active Round
                    </Badge>
                  )}
                  {state === "locked" && (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1">
                      <Lock className="h-2.5 w-2.5" /> Gated
                    </Badge>
                  )}
                </div>

                <h3 className="font-display text-sm font-bold text-foreground truncate">
                  {r.round_name}
                </h3>
                <p className="text-[11px] text-muted-foreground capitalize mt-0.5">
                  {r.round_type.replace("_", " ")}
                </p>

                {/* Score or Status Details */}
                <div className="mt-3 pt-3 border-t border-border/60 text-xs">
                  {state === "qualified" && (
                    <div className="space-y-1">
                      {p?.score !== null && (
                        <div className="text-[11px] text-muted-foreground">
                          Score: <span className="font-mono font-bold text-foreground">{p.score}</span>
                        </div>
                      )}
                      <p className="text-[11px] text-emerald-400 font-medium">
                        Promoted to next round!
                      </p>
                    </div>
                  )}

                  {state === "not_qualified" && (
                    <div className="space-y-1">
                      {p?.score !== null && (
                        <div className="text-[11px] text-muted-foreground">
                          Score: <span className="font-mono font-bold text-foreground">{p.score}</span>
                        </div>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        Thank you for your effort.
                      </p>
                    </div>
                  )}

                  {state === "awaiting" && (
                    <p className="text-[11px] text-amber-400/90 font-medium">
                      Test completed. Awaiting cohort batch release.
                    </p>
                  )}

                  {state === "open" && (
                    <div className="space-y-2">
                      {isTest && r.tests ? (
                        <Button
                          asChild
                          size="sm"
                          className="w-full h-7 text-[11px] rounded-lg bg-primary text-white font-semibold"
                        >
                          <Link to="/dashboard/tests">
                            Attempt Assessment <ArrowRight className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">
                          Interview slot &amp; mode will be coordinated by recruiter.
                        </p>
                      )}
                    </div>
                  )}

                  {state === "locked" && (
                    <p className="text-[11px] text-muted-foreground/70">
                      Unlocks upon qualifying Round {r.round_number - 1}.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </GlassCard>
  );
}
