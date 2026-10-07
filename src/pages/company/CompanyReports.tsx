import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { GlassCard } from "@/components/3d/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, Loader2, ShieldAlert, AlertTriangle, Monitor, Smartphone, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { toast } from "sonner";

export default function CompanyReports() {
  const { user } = useAuth();
  const [company, setCompany] = useState<any>(null);
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAuditRow, setSelectedAuditRow] = useState<any | null>(null);

  useEffect(() => {
    fetchReportData();
  }, [user]);

  const fetchReportData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: comp } = await supabase
        .from("companies")
        .select("id, name")
        .eq("user_id", user.id)
        .maybeSingle();

      setCompany(comp);

      let attemptsQuery = supabase
        .from("test_attempts")
        .select("id, total_score, scores, passed, tab_switches, auto_submitted, proctor_events, completed_at, profiles(name, email, usn, branch, cgpa), tests(id, title, scheduled_date, pass_criteria, question_bank, round_number, round_name)")
        .order("completed_at", { ascending: false });

      if (comp?.id) {
        attemptsQuery = attemptsQuery.or(`tests.created_by.eq.${user.id},tests.company_id.eq.${comp.id}`);
      }

      const { data, error } = await attemptsQuery;
      if (error) throw error;
      setReportData(data ?? []);
    } catch (err: any) {
      console.error("Error fetching report data:", err);
      toast.error("Failed to load recruitment report");
    } finally {
      setLoading(false);
    }
  };

  const getMarksBreakdown = (r: any) => {
    const testTotalMarks = ((r.tests?.question_bank as any[]) || []).reduce((sum: number, q: any) => sum + (q.points || 1), 0) || 100;
    const scoresObj = (r.scores as any) || {};
    const earnedMarks = scoresObj._earned_marks !== undefined ? Number(scoresObj._earned_marks) : Math.round(((r.total_score || 0) * testTotalMarks) / 100);
    const totalMarks = scoresObj._total_marks !== undefined ? Number(scoresObj._total_marks) : testTotalMarks;
    return { earnedMarks, totalMarks };
  };

  const exportCSV = () => {
    if (reportData.length === 0) {
      toast.error("No data available to export");
      return;
    }

    const headers = ["Candidate Name", "Email", "USN", "Branch", "CGPA", "Assessment Title", "Round", "Marks", "Score (%)", "Status", "Tab Switches", "Submission Date"];
    const rows = reportData.map((r) => {
      const { earnedMarks, totalMarks } = getMarksBreakdown(r);
      return [
        `"${r.profiles?.name || ""}"`,
        `"${r.profiles?.email || ""}"`,
        `"${r.profiles?.usn || ""}"`,
        `"${r.profiles?.branch || ""}"`,
        `"${r.profiles?.cgpa || ""}"`,
        `"${r.tests?.title || ""}"`,
        `"${r.tests?.round_name || `Round ${r.tests?.round_number || 1}`}"`,
        `"${earnedMarks} / ${totalMarks}"`,
        r.total_score,
        r.passed ? "QUALIFIED" : "BELOW_CUTOFF",
        r.tab_switches,
        r.completed_at ? new Date(r.completed_at).toLocaleString() : "",
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${company?.name || "Company"}_Recruitment_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Recruitment report exported as CSV!");
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-foreground">Recruitment Reports</h1>
          <p className="text-sm text-muted-foreground">
            Export evaluation metrics, candidate qualification logs & proctoring audit records for your assessments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={exportCSV} className="h-11 px-5 rounded-xl bg-primary text-primary-foreground font-bold gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>

          <Button onClick={() => window.print()} variant="outline" className="h-11 px-4 rounded-xl text-foreground border-border gap-2 hover:bg-muted">
            <Printer className="h-4 w-4" /> Print Report
          </Button>
        </div>
      </div>

      {/* Report Table View */}
      <GlassCard className="p-6 border-border">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-semibold text-foreground">
            Assessment Attempts Roster ({reportData.length} records)
          </div>
          <Badge className="bg-purple-500/20 text-purple-400 dark:text-purple-300 border-purple-500/30 text-xs">
            {company?.name || "Company Portal"}
          </Badge>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mb-2" />
            Generating report…
          </div>
        ) : reportData.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            No test submissions found for your company assessments yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-muted-foreground">
              <thead className="bg-muted/50 uppercase text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3">Candidate</th>
                  <th className="p-3">Branch & CGPA</th>
                  <th className="p-3">Assessment & Round</th>
                  <th className="p-3">Score & Marks</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Proctor Summary</th>
                  <th className="p-3">Submitted At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {reportData.map((row) => {
                  const { earnedMarks, totalMarks } = getMarksBreakdown(row);
                  const proctorEvents: any[] = Array.isArray(row.proctor_events) ? row.proctor_events : [];
                  const tabSwitches = typeof row.tab_switches === "number" ? row.tab_switches : 0;
                  const isClean = tabSwitches === 0 && proctorEvents.length === 0 && !row.auto_submitted;
                  const gadgets = [...new Set(proctorEvents.filter((e) => e.gadget !== "tab_switch").map((e) => e.gadget))];

                  return (
                    <tr key={row.id} className="hover:bg-muted/40 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-foreground">{row.profiles?.name || row.profiles?.email}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{row.profiles?.usn || row.profiles?.email}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-foreground">{row.profiles?.branch || "B.Tech"}</div>
                        <div className="text-[11px] text-primary font-bold">CGPA: {row.profiles?.cgpa || "N/A"}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-foreground">{row.tests?.title || "Test"}</div>
                        {row.tests?.round_name && (
                          <Badge variant="outline" className="text-[9px] mt-0.5 px-1.5 py-0 border-primary/30 text-primary">
                            {row.tests.round_name}
                          </Badge>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="font-bold font-mono text-foreground">{earnedMarks} / {totalMarks}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">({row.total_score}%)</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge className={row.passed ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-[10px]" : "bg-destructive/20 text-destructive text-[10px]"}>
                          {row.passed ? "QUALIFIED" : "BELOW CUTOFF"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-wrap items-center gap-1 max-w-[170px]">
                            {isClean ? (
                              <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1 inline" /> Clean
                              </Badge>
                            ) : (
                              <>
                                {tabSwitches > 0 && (
                                  <Badge variant="secondary" className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]">
                                    {tabSwitches} switch{tabSwitches > 1 ? "es" : ""}
                                  </Badge>
                                )}
                                {gadgets.length > 0 && (
                                  <Badge variant="destructive" className="text-[10px]">
                                    {gadgets.length} gadget{gadgets.length > 1 ? "s" : ""}
                                  </Badge>
                                )}
                                {row.auto_submitted && (
                                  <Badge variant="destructive" className="text-[10px]">
                                    Auto-submitted
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-xs font-medium shrink-0"
                            onClick={() => setSelectedAuditRow({ ...row, earnedMarks, totalMarks, proctorEvents, tabSwitches })}
                          >
                            View
                          </Button>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {row.completed_at ? new Date(row.completed_at).toLocaleDateString() : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Proctoring & Integrity Detail Dialog */}
      <Dialog open={!!selectedAuditRow} onOpenChange={(open) => !open && setSelectedAuditRow(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <ShieldAlert className="h-5 w-5 text-primary" /> Proctoring & Integrity Audit
            </DialogTitle>
            <DialogDescription>
              Candidate: <span className="font-semibold text-foreground">{selectedAuditRow?.profiles?.name || selectedAuditRow?.profiles?.email}</span> ({selectedAuditRow?.profiles?.email})
            </DialogDescription>
          </DialogHeader>

          {selectedAuditRow && (
            <div className="space-y-4 pt-2">
              {/* Integrity Overview Banner */}
              <div className={`p-3.5 rounded-lg border flex items-center justify-between ${
                selectedAuditRow.tabSwitches === 0 && (selectedAuditRow.proctorEvents?.length || 0) === 0 && !selectedAuditRow.auto_submitted
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-destructive/10 border-destructive/30 text-destructive"
              }`}>
                <div className="flex items-center gap-2.5">
                  {selectedAuditRow.tabSwitches === 0 && (selectedAuditRow.proctorEvents?.length || 0) === 0 && !selectedAuditRow.auto_submitted ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      <div>
                        <div className="font-bold text-sm">Clean Integrity Record</div>
                        <div className="text-xs text-muted-foreground">No tab switching or gadget detection flagged during session.</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      <div>
                        <div className="font-bold text-sm">Integrity Infractions Detected</div>
                        <div className="text-xs text-muted-foreground">Violations recorded during assessment session.</div>
                      </div>
                    </>
                  )}
                </div>
                <Badge variant={selectedAuditRow.tabSwitches === 0 && (selectedAuditRow.proctorEvents?.length || 0) === 0 && !selectedAuditRow.auto_submitted ? "default" : "destructive"}>
                  {selectedAuditRow.tabSwitches === 0 && (selectedAuditRow.proctorEvents?.length || 0) === 0 && !selectedAuditRow.auto_submitted ? "VERIFIED" : "FLAGGED"}
                </Badge>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-lg border bg-muted/30">
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                    <Monitor className="h-3.5 w-3.5" /> Tab Switches
                  </div>
                  <div className="text-xl font-bold font-mono mt-1 text-foreground">
                    {selectedAuditRow.tabSwitches}
                  </div>
                </div>

                <div className="p-3 rounded-lg border bg-muted/30">
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                    <Smartphone className="h-3.5 w-3.5" /> Gadgets Flagged
                  </div>
                  <div className="text-xl font-bold font-mono mt-1 text-foreground">
                    {[...new Set((selectedAuditRow.proctorEvents || []).filter((e: any) => e.gadget !== "tab_switch").map((e: any) => e.gadget))].length}
                  </div>
                </div>

                <div className="p-3 rounded-lg border bg-muted/30">
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                    Score Breakdown
                  </div>
                  <div className="text-sm font-bold font-mono mt-1 text-foreground">
                    {selectedAuditRow.earnedMarks} / {selectedAuditRow.totalMarks}
                  </div>
                  <div className="text-[10px] text-muted-foreground">({selectedAuditRow.total_score ?? 0}%)</div>
                </div>

                <div className="p-3 rounded-lg border bg-muted/30">
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                    Auto-Submitted
                  </div>
                  <div className="text-base font-bold mt-1">
                    {selectedAuditRow.auto_submitted ? (
                      <span className="text-destructive font-mono">YES</span>
                    ) : (
                      <span className="text-emerald-500 font-mono">NO</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Chronological Event Timeline */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Audit Timeline & Event Log
                </h4>

                {(selectedAuditRow.proctorEvents?.length || 0) === 0 && selectedAuditRow.tabSwitches === 0 ? (
                  <div className="p-4 rounded-lg border border-dashed text-center text-xs text-muted-foreground">
                    Candidate completed the assessment without any detected gadget infractions or tab switches.
                  </div>
                ) : (
                  <div className="rounded-lg border divide-y max-h-60 overflow-y-auto">
                    {selectedAuditRow.tabSwitches > 0 && !(selectedAuditRow.proctorEvents || []).some((e: any) => e.gadget === "tab_switch") && (
                      <div className="p-3 flex items-start gap-3 bg-amber-500/5">
                        <Monitor className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <div className="flex-1 text-xs">
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            <span>Window / Tab Focus Lost</span>
                            <Badge variant="outline" className="text-[9px] text-amber-600 dark:text-amber-400 border-amber-500/30">
                              {selectedAuditRow.tabSwitches} occurrence{selectedAuditRow.tabSwitches > 1 ? "s" : ""}
                            </Badge>
                          </div>
                          <div className="text-muted-foreground mt-0.5">
                            Candidate navigated away from the assessment window or switched tabs.
                          </div>
                        </div>
                      </div>
                    )}

                    {(selectedAuditRow.proctorEvents || [])
                      .slice()
                      .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                      .map((ev: any, i: number) => (
                        <div key={i} className="p-3 flex items-start gap-3 hover:bg-muted/30">
                          <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${ev.action === "auto_submit" ? "bg-destructive" : "bg-amber-500"}`} />
                          <div className="flex-1 text-xs">
                            <div className="flex items-center gap-2">
                              <Badge variant={ev.action === "auto_submit" ? "destructive" : "secondary"} className="text-[10px]">
                                {ev.action === "auto_submit" ? "Auto-submitted" : "AI Warning"}
                              </Badge>
                              <span className="font-semibold text-foreground">
                                {ev.gadget === "tab_switch" ? "Tab Switch Detected" : `Gadget Flagged: ${ev.gadget}`}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                              {format(new Date(ev.timestamp), "yyyy-MM-dd HH:mm:ss")}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
