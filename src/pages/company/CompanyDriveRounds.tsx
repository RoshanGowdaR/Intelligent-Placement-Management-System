import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { GlassCard } from "@/components/3d/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GitBranch,
  Plus,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ClipboardList,
  MessageSquare,
  Award,
  AlertTriangle,
  Lock,
  Unlock,
  Send,
  Loader2,
  Search,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  openRound,
  closeRoundAndScore,
  recordInterviewResult,
  publishRoundResults,
  type DriveRound,
  type RoundParticipant,
  type PassingLogic,
  type RoundType,
} from "@/services/driveEngine";

export default function CompanyDriveRounds() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<any>(null);
  const [rounds, setRounds] = useState<DriveRound[]>([]);
  const [activeRound, setActiveRound] = useState<DriveRound | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  // Builder Modal
  const [builderOpen, setBuilderOpen] = useState(false);
  const [roundName, setRoundName] = useState("");
  const [roundType, setRoundType] = useState<RoundType>("test");
  const [testId, setTestId] = useState<string>("");
  const [passingLogic, setPassingLogic] = useState<PassingLogic>("cutoff_score");
  const [passingValue, setPassingValue] = useState<string>("60");
  const [deadline, setDeadline] = useState<string>("");
  const [autoProgress, setAutoProgress] = useState(false);
  const [savingRound, setSavingRound] = useState(false);

  // Manual Evaluation Modal
  const [evalOpen, setEvalOpen] = useState(false);
  const [evalParticipant, setEvalParticipant] = useState<any>(null);
  const [evalScore, setEvalScore] = useState<string>("");
  const [evalStatus, setEvalStatus] = useState<"qualified" | "not_qualified">("qualified");
  const [evalNotes, setEvalNotes] = useState<string>("");
  const [submittingEval, setSubmittingEval] = useState(false);

  // Publish Dialog
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Action Loading
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchCompanyAndRounds();
  }, [user]);

  useEffect(() => {
    if (activeRound) {
      fetchParticipants(activeRound.id);
    }
  }, [activeRound]);

  const fetchCompanyAndRounds = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Fetch company record
      const { data: comp } = await supabase
        .from("companies")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      setCompany(comp);

      if (comp?.id) {
        // 2. Fetch company's tests
        const { data: compTests } = await supabase
          .from("tests")
          .select("id, title")
          .eq("company_id", comp.id);
        setTests(compTests ?? []);

        // 3. Fetch drive rounds
        const { data: driveRounds } = await supabase
          .from("drive_rounds")
          .select("*")
          .eq("company_id", comp.id)
          .order("round_number", { ascending: true });

        const roundList = (driveRounds as DriveRound[]) ?? [];
        setRounds(roundList);

        if (roundList.length > 0) {
          // Default to first active or latest round
          setActiveRound((prev) => roundList.find((r) => r.id === prev?.id) || roundList[0]);
        }
      }
    } catch (err: any) {
      console.error("Error fetching drive rounds:", err);
      toast.error("Failed to load drive workflow");
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async (roundId: string) => {
    try {
      const { data } = await supabase
        .from("round_participants")
        .select("*, profiles(id, name, email, usn, branch, cgpa, resume_url)")
        .eq("drive_round_id", roundId)
        .order("score", { ascending: false, nullsFirst: false });

      setParticipants(data ?? []);
    } catch (err) {
      console.error("Error fetching participants:", err);
    }
  };

  const handleCreateRound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) {
      toast.error("Company profile required to configure rounds.");
      return;
    }
    if (!roundName.trim()) {
      toast.error("Round name is required");
      return;
    }

    setSavingRound(true);

    try {
      const nextRoundNumber = rounds.length + 1;

      const { data, error } = await supabase
        .from("drive_rounds")
        .insert({
          company_id: company.id,
          round_number: nextRoundNumber,
          round_name: roundName.trim(),
          round_type: roundType,
          test_id: roundType === "test" && testId ? testId : null,
          passing_logic: passingLogic,
          passing_value: passingValue ? Number(passingValue) : null,
          registration_deadline: deadline ? new Date(deadline).toISOString() : null,
          auto_progress: autoProgress,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Round ${nextRoundNumber} (${roundName}) configured!`);
      setBuilderOpen(false);
      setRoundName("");
      setDeadline("");
      await fetchCompanyAndRounds();
      if (data) setActiveRound(data as DriveRound);
    } catch (err: any) {
      console.error("Create round error:", err);
      toast.error(err?.message || "Failed to create round");
    } finally {
      setSavingRound(false);
    }
  };

  const handleOpenRound = async () => {
    if (!activeRound || !user) return;
    setActionLoading(true);
    try {
      const res = await openRound(activeRound.id, user.id);
      toast.success(res.message);
      await fetchParticipants(activeRound.id);
    } catch (err: any) {
      toast.error(err?.message || "Failed to open round");
    } finally {
      setActionLoading(false);
    }
  };

  const handleScoreRound = async () => {
    if (!activeRound) return;
    setActionLoading(true);
    try {
      const res = await closeRoundAndScore(activeRound.id);
      toast.success(`Scored and evaluated ${res.scoredCount} candidate(s)!`);
      await fetchParticipants(activeRound.id);
    } catch (err: any) {
      toast.error(err?.message || "Failed to score round");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evalParticipant || !user) return;
    setSubmittingEval(true);

    try {
      await recordInterviewResult(
        evalParticipant.id,
        evalScore ? Number(evalScore) : null,
        evalStatus,
        evalNotes,
        user.id
      );

      toast.success("Candidate evaluation saved!");
      setEvalOpen(false);
      await fetchParticipants(activeRound!.id);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save evaluation");
    } finally {
      setSubmittingEval(false);
    }
  };

  const handlePublishResults = async () => {
    if (!activeRound || !user) return;
    setPublishing(true);

    try {
      const res = await publishRoundResults(activeRound.id, user.id, activeRound.auto_progress);
      toast.success(
        `Round ${activeRound.round_number} results batch-published! ${res.publishedCount} student(s) notified simultaneously.`
      );
      setPublishDialogOpen(false);
      await fetchCompanyAndRounds();
      await fetchParticipants(activeRound.id);
    } catch (err: any) {
      toast.error(err?.message || "Failed to publish results");
    } finally {
      setPublishing(false);
    }
  };

  const filteredParticipants = participants.filter((p) => {
    const prof = p.profiles || {};
    const text = `${prof.name || ""} ${prof.email || ""} ${prof.usn || ""} ${p.status}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const qualifiedCount = participants.filter((p) => p.status === "qualified").length;
  const rejectedCount = participants.filter((p) => p.status === "not_qualified").length;
  const pendingCount = participants.filter((p) => p.status === "pending").length;
  const absentCount = participants.filter((p) => p.status === "absent").length;

  return (
    <div className="space-y-8 pb-16">
      
      {/* 1. Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <GitBranch className="h-4 w-4" /> Multi-Round Recruitment Pipeline
          </div>
          <h1 className="font-display text-3xl font-extrabold text-foreground mt-1">
            Campus Drive Rounds &amp; Candidate Gating
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Stage candidates through multi-round workflows (Assessments &rarr; Interviews &rarr; Offers) with locked batch releases.
          </p>
        </div>

        <Button
          onClick={() => setBuilderOpen(true)}
          className="rounded-xl bg-primary text-white font-semibold gap-2 shadow-[0_0_20px_rgba(108,92,231,0.4)]"
        >
          <Plus className="h-4 w-4" /> Add Next Round
        </Button>
      </div>

      {/* 2. Pipeline Funnel Step Progression */}
      {rounds.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {rounds.map((r) => {
            const isSelected = activeRound?.id === r.id;
            return (
              <GlassCard
                key={r.id}
                onClick={() => setActiveRound(r)}
                className={`p-4 cursor-pointer transition-all border ${
                  isSelected
                    ? "border-primary bg-primary/10 shadow-[0_0_25px_rgba(108,92,231,0.25)]"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Round {r.round_number}
                  </span>
                  <Badge
                    variant={r.is_published ? "default" : "outline"}
                    className={`text-[10px] ${
                      r.is_published
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        : "border-amber-500/40 text-amber-400 bg-amber-500/10"
                    }`}
                  >
                    {r.is_published ? "Published & Locked" : "Draft / In Progress"}
                  </Badge>
                </div>

                <h3 className="font-display text-base font-bold text-foreground mt-2 truncate">
                  {r.round_name}
                </h3>

                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="capitalize">{r.round_type.replace("_", " ")}</span>
                  <span>{r.passing_logic.replace("_", " ")}</span>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* 3. Empty State if no rounds */}
      {rounds.length === 0 && !loading && (
        <GlassCard className="p-12 text-center border-dashed border-border">
          <GitBranch className="mx-auto h-12 w-12 text-muted-foreground mb-3 opacity-50" />
          <h3 className="font-display text-lg font-bold text-foreground">No Drive Rounds Configured Yet</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
            Build your recruitment pipeline! Start with an Online Assessment (OA), followed by Technical Interviews, and HR selection.
          </p>
          <Button
            onClick={() => setBuilderOpen(true)}
            className="mt-5 rounded-xl bg-primary text-white font-semibold gap-2"
          >
            <Plus className="h-4 w-4" /> Create Round 1
          </Button>
        </GlassCard>
      )}

      {/* 4. Active Round Detail & Controls */}
      {activeRound && (
        <div className="space-y-6">
          
          {/* Round Header & Status Bar */}
          <GlassCard className="p-6 border-border">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono text-xs">
                    Round {activeRound.round_number}
                  </Badge>
                  <h2 className="font-display text-2xl font-bold text-foreground">
                    {activeRound.round_name}
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Type: <span className="font-semibold text-foreground capitalize">{activeRound.round_type}</span> • Passing Logic: <span className="font-semibold text-foreground uppercase">{activeRound.passing_logic.replace("_", " ")}</span> ({activeRound.passing_value ?? "Manual Rubric"})
                </p>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-2.5">
                {participants.length === 0 && (
                  <Button
                    onClick={handleOpenRound}
                    disabled={actionLoading}
                    className="rounded-xl bg-primary text-white font-semibold text-xs gap-1.5"
                  >
                    {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Users className="h-3.5 w-3.5" />}
                    <span>Open &amp; Populate Candidates</span>
                  </Button>
                )}

                {activeRound.round_type === "test" && participants.length > 0 && !activeRound.is_published && (
                  <Button
                    onClick={handleScoreRound}
                    disabled={actionLoading}
                    variant="outline"
                    className="rounded-xl border-border text-foreground text-xs font-semibold gap-1.5"
                  >
                    {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-purple-400" />}
                    <span>Auto-Score From Test</span>
                  </Button>
                )}

                {/* Publish Results Button */}
                {!activeRound.is_published ? (
                  <Button
                    onClick={() => setPublishDialogOpen(true)}
                    disabled={participants.length === 0}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Publish Round Results</span>
                  </Button>
                ) : (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 py-1 px-3 text-xs gap-1">
                    <Lock className="h-3 w-3" /> Results Published &amp; Gated
                  </Badge>
                )}
              </div>
            </div>

            {/* Metrics Chips */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t border-border">
              <div className="p-3 rounded-xl bg-card/50 border border-border">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Cohort</span>
                <p className="font-display text-xl font-extrabold text-foreground mt-0.5">{participants.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <span className="text-[10px] uppercase font-bold text-amber-500">Pending Evaluation</span>
                <p className="font-display text-xl font-extrabold text-amber-500 mt-0.5">{pendingCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <span className="text-[10px] uppercase font-bold text-emerald-500">Qualified (Passing)</span>
                <p className="font-display text-xl font-extrabold text-emerald-500 mt-0.5">{qualifiedCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
                <span className="text-[10px] uppercase font-bold text-rose-500">Not Qualified</span>
                <p className="font-display text-xl font-extrabold text-rose-500 mt-0.5">{rejectedCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-500/5 border border-slate-500/20">
                <span className="text-[10px] uppercase font-bold text-slate-400">Absent / Missed</span>
                <p className="font-display text-xl font-extrabold text-slate-400 mt-0.5">{absentCount}</p>
              </div>
            </div>
          </GlassCard>

          {/* Candidates Roster Table */}
          <GlassCard className="p-6 border-border">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">
                  Round Candidates ({filteredParticipants.length})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Individual student scoreboards, rubric evaluations &amp; round gate statuses.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filter candidate..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl bg-white/5 border-border"
                />
              </div>
            </div>

            {filteredParticipants.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No candidates found in this round yet. Click "Open &amp; Populate Candidates" above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-white/[0.02] text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-3 px-4">Candidate</th>
                      <th className="py-3 px-4">USN &amp; Branch</th>
                      <th className="py-3 px-4">CGPA</th>
                      <th className="py-3 px-4">Score</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Recruiter Notes</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredParticipants.map((p) => {
                      const prof = p.profiles || {};
                      const isQual = p.status === "qualified";
                      const isRej = p.status === "not_qualified";
                      const isPend = p.status === "pending";

                      return (
                        <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-semibold text-foreground">
                            <div>{prof.name || "Student"}</div>
                            <div className="text-[11px] font-normal text-muted-foreground">{prof.email}</div>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            <div>{prof.usn || "N/A"}</div>
                            <div className="text-[11px]">{prof.branch || "General"}</div>
                          </td>
                          <td className="py-3 px-4 font-mono">{prof.cgpa ?? "N/A"}</td>
                          <td className="py-3 px-4 font-mono font-bold text-foreground">
                            {p.score !== null ? `${p.score}` : "—"}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={`text-[10px] capitalize ${
                                isQual
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                  : isRej
                                  ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                  : isPend
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                  : "bg-slate-500/10 text-slate-400 border-slate-500/30"
                              }`}
                            >
                              {p.status.replace("_", " ")}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 max-w-[200px] truncate text-muted-foreground">
                            {p.recruiter_notes || "—"}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={activeRound.is_published}
                              onClick={() => {
                                setEvalParticipant(p);
                                setEvalScore(p.score !== null ? String(p.score) : "");
                                setEvalStatus(p.status === "qualified" ? "qualified" : "not_qualified");
                                setEvalNotes(p.recruiter_notes || "");
                                setEvalOpen(true);
                              }}
                              className="h-7 rounded-lg text-[11px] border-border text-foreground hover:bg-primary hover:text-white"
                            >
                              Evaluate
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* MODAL 1: Round Builder Dialog */}
      <Dialog open={builderOpen} onOpenChange={setBuilderOpen}>
        <DialogContent className="max-w-md border-border bg-[#0d0d14] text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <GitBranch className="h-5 w-5 text-primary" />
              Configure Round {rounds.length + 1}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define the round format, attached test, and qualifying pass rules.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRound} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Round Name *</Label>
              <Input
                required
                placeholder="e.g. Technical Coding Round"
                value={roundName}
                onChange={(e) => setRoundName(e.target.value)}
                className="h-10 rounded-xl bg-white/5 border-border"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Round Type *</Label>
                <Select value={roundType} onValueChange={(v: RoundType) => setRoundType(v)}>
                  <SelectTrigger className="h-10 rounded-xl bg-white/5 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="test">Online Assessment (OA)</SelectItem>
                    <SelectItem value="interview">Technical Interview</SelectItem>
                    <SelectItem value="group_discussion">HR / Managerial</SelectItem>
                    <SelectItem value="other">Offer / Final Selection</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Passing Logic *</Label>
                <Select value={passingLogic} onValueChange={(v: PassingLogic) => setPassingLogic(v)}>
                  <SelectTrigger className="h-10 rounded-xl bg-white/5 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cutoff_score">Cutoff Score (Min Marks)</SelectItem>
                    <SelectItem value="top_n">Top N Rankers</SelectItem>
                    <SelectItem value="top_percent">Top Percentile (%)</SelectItem>
                    <SelectItem value="manual">Manual Recruiter Rubric</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {roundType === "test" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Attach Assessment Test</Label>
                <Select value={testId} onValueChange={setTestId}>
                  <SelectTrigger className="h-10 rounded-xl bg-white/5 border-border">
                    <SelectValue placeholder="Select existing test..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tests.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {passingLogic !== "manual" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">
                  {passingLogic === "cutoff_score"
                    ? "Minimum Passing Score (Points/Marks)"
                    : passingLogic === "top_n"
                    ? "Number of Candidates to Qualify (N)"
                    : "Top Percentage to Qualify (%)"}
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={passingValue}
                  onChange={(e) => setPassingValue(e.target.value)}
                  className="h-10 rounded-xl bg-white/5 border-border"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Registration / Completion Deadline</Label>
              <Input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="h-10 rounded-xl bg-white/5 border-border text-foreground"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="submit"
                disabled={savingRound}
                className="w-full h-10 rounded-xl bg-primary text-white font-semibold text-xs"
              >
                {savingRound ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save & Add Round to Drive"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Manual Candidate Evaluation Dialog */}
      <Dialog open={evalOpen} onOpenChange={setEvalOpen}>
        <DialogContent className="max-w-md border-border bg-[#0d0d14] text-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Evaluate Candidate: {evalParticipant?.profiles?.name || "Student"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter interview rubric score, qualifying decision and feedback notes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEvaluation} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Interview Score (0-100)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 85"
                  value={evalScore}
                  onChange={(e) => setEvalScore(e.target.value)}
                  className="h-10 rounded-xl bg-white/5 border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Qualification *</Label>
                <Select value={evalStatus} onValueChange={(v: any) => setEvalStatus(v)}>
                  <SelectTrigger className="h-10 rounded-xl bg-white/5 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qualified">Qualified (Passed)</SelectItem>
                    <SelectItem value="not_qualified">Not Qualified (Rejected)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Recruiter Rubric Notes</Label>
              <Textarea
                placeholder="Strong communication, sound knowledge of data structures, recommended for next round..."
                value={evalNotes}
                onChange={(e) => setEvalNotes(e.target.value)}
                className="rounded-xl bg-white/5 border-border min-h-[90px] text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="submit"
                disabled={submittingEval}
                className="w-full h-10 rounded-xl bg-primary text-white font-semibold text-xs"
              >
                {submittingEval ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Evaluation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Batch Publish Confirmation Dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent className="max-w-md border-border bg-[#0d0d14] text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              Publish Round {activeRound?.round_number} Results?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1 space-y-2">
              <p>
                You are about to <strong>batch release</strong> results for{" "}
                <strong>{participants.length} candidate(s)</strong>:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-foreground font-mono">
                <li>{qualifiedCount} Qualified</li>
                <li>{rejectedCount} Not Qualified</li>
                <li>{absentCount} Absent</li>
              </ul>
              <p className="text-amber-300 font-semibold pt-1">
                🔒 Once published, results are locked and immutable. Every student will immediately receive a simultaneous in-app notification.
              </p>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-3">
            <Button
              variant="outline"
              onClick={() => setPublishDialogOpen(false)}
              className="rounded-xl border-border text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePublishResults}
              disabled={publishing}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
            >
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Batch Release"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
