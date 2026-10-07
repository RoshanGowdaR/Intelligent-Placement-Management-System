import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Download, FileText, Trash2, ArrowUpDown, ArrowUp, ArrowDown, ShieldAlert, CheckCircle2, AlertTriangle, Monitor, Laptop, Smartphone } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CompanyLogo from "@/components/CompanyLogo";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type Test = Tables<"tests">;

interface ProctorEvent {
  timestamp: string;
  gadget: string;
  action: "warning" | "auto_submit";
}

interface ReportRow {
  attemptId: string;
  testId: string;
  companyId: string | null;
  studentName: string;
  email: string;
  cgpa: number | null;
  totalScore: number | null;
  earnedMarks: number;
  totalMarks: number;
  passed: boolean | null;
  attemptNumber: number;
  completedAt: string | null;
  resumeUrl: string | null;
  tabSwitches: number;
  proctorEvents: ProctorEvent[];
  autoSubmitted: boolean;
  retakeReason: string | null;
}

type SortKey = "studentName" | "cgpa" | "totalScore" | "attemptNumber" | "completedAt";
type SortDir = "asc" | "desc";

export default function AdminReports() {
  const [tests, setTests] = useState<Test[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [selectedTest, setSelectedTest] = useState("");
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAuditRow, setSelectedAuditRow] = useState<ReportRow | null>(null);

  // Filters
  const [filterCompany, setFilterCompany] = useState("all");
  const [filterTestId, setFilterTestId] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all"); // all | passed | failed
  const [filterAutoSubmit, setFilterAutoSubmit] = useState("all"); // all | yes | no
  const [filterRetake, setFilterRetake] = useState("all"); // all | yes | no

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("totalScore");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    Promise.all([
      supabase.from("tests").select("*").order("scheduled_date", { ascending: false }),
      supabase.from("companies").select("id, name").order("name"),
    ]).then(([tRes, cRes]) => {
      setTests(tRes.data ?? []);
      setCompanies(cRes.data ?? []);
    });
  }, []);

  const markFalsePositive = async (testId: string, gadget: string) => {
    const test = tests.find((t) => t.id === testId);
    if (!test) return;
    const currentCfg = ((test as unknown as { proctor_config?: Record<string, unknown> }).proctor_config) ?? {};
    const currentWatched = Array.isArray((currentCfg as { watched_classes?: string[] }).watched_classes)
      ? (currentCfg as { watched_classes: string[] }).watched_classes
      : ["cell phone", "laptop", "tv", "remote", "keyboard", "mouse", "tablet", "book"];
    if (!currentWatched.includes(gadget)) {
      toast.info(`"${gadget}" is already excluded for this test`);
      return;
    }
    const nextWatched = currentWatched.filter((c) => c !== gadget);
    const nextCfg = { ...currentCfg, watched_classes: nextWatched };
    const { error } = await (supabase.from("tests") as any).update({ proctor_config: nextCfg }).eq("id", testId);
    if (error) { toast.error(error.message); return; }
    setTests((prev) => prev.map((t) => t.id === testId ? ({ ...t, proctor_config: nextCfg } as Test) : t));
    toast.success(`Stopped flagging "${gadget}" in "${test.title}"`);
  };

  const generateReport = async () => {
    if (!selectedTest) { toast.error("Select a test first"); return; }
    setLoading(true);

    const { data: attempts } = await supabase
      .from("test_attempts")
      .select("id, test_id, student_id, total_score, scores, passed, attempt_number, completed_at, tab_switches, auto_submitted, proctor_events, retake_reason")
      .eq("test_id", selectedTest)
      .order("total_score", { ascending: false });

    if (!attempts || attempts.length === 0) {
      setRows([]);
      setLoading(false);
      toast.info("No attempts found for this test");
      return;
    }

    const studentIds = [...new Set(attempts.map((a) => a.student_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, email, cgpa, resume_url")
      .in("id", studentIds);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const testMap = new Map(tests.map((t) => [t.id, t]));

    const reportRows: ReportRow[] = attempts.map((a) => {
      const p = profileMap.get(a.student_id);
      const t = testMap.get(a.test_id);
      const rec = a as unknown as { auto_submitted?: boolean; proctor_events?: ProctorEvent[]; retake_reason?: string | null; tab_switches?: number; scores?: any };
      const scoresObj = (rec.scores as any) || {};
      const testTotalMarks = ((t?.question_bank as any[]) || []).reduce((sum, q) => sum + (q.points || 1), 0) || 100;
      const earnedMarks = scoresObj._earned_marks !== undefined ? Number(scoresObj._earned_marks) : Math.round(((a.total_score || 0) * testTotalMarks) / 100);
      const totalMarks = scoresObj._total_marks !== undefined ? Number(scoresObj._total_marks) : testTotalMarks;
      const tabSwitches = typeof a.tab_switches === "number" ? a.tab_switches : 0;

      return {
        attemptId: a.id,
        testId: a.test_id,
        companyId: t?.company_id ?? null,
        studentName: p?.name || "Unknown",
        email: p?.email || "—",
        cgpa: p?.cgpa ?? null,
        totalScore: a.total_score,
        earnedMarks,
        totalMarks,
        passed: a.passed,
        attemptNumber: a.attempt_number,
        completedAt: a.completed_at,
        resumeUrl: p?.resume_url ?? null,
        tabSwitches,
        proctorEvents: Array.isArray(rec.proctor_events) ? rec.proctor_events : [],
        autoSubmitted: !!rec.auto_submitted,
        retakeReason: rec.retake_reason ?? null,
      };
    });

    setRows(reportRows);
    setLoading(false);
  };

  const deleteAttempt = async (attemptId: string) => {
    const { error } = await supabase.from("test_attempts").delete().eq("id", attemptId);
    if (error) { toast.error("Failed to delete: " + error.message); return; }
    setRows((prev) => prev.filter((r) => r.attemptId !== attemptId));
    toast.success("Record deleted");
  };

  const deleteAllForTest = async () => {
    if (!selectedTest) return;
    const { error } = await supabase.from("test_attempts").delete().eq("test_id", selectedTest);
    if (error) { toast.error("Failed to delete: " + error.message); return; }
    setRows([]);
    toast.success("All records for this test were deleted");
  };

  const filteredRows = useMemo(() => {
    let out = rows.slice();
    if (filterCompany !== "all") out = out.filter((r) => r.companyId === filterCompany);
    if (filterTestId !== "all") out = out.filter((r) => r.testId === filterTestId);
    if (filterStatus === "passed") out = out.filter((r) => r.passed);
    if (filterStatus === "failed") out = out.filter((r) => !r.passed);
    if (filterAutoSubmit === "yes") out = out.filter((r) => r.autoSubmitted);
    if (filterAutoSubmit === "no") out = out.filter((r) => !r.autoSubmitted);
    if (filterRetake === "yes") out = out.filter((r) => r.attemptNumber > 1);
    if (filterRetake === "no") out = out.filter((r) => r.attemptNumber === 1);

    const dir = sortDir === "asc" ? 1 : -1;
    out.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return out;
  }, [rows, filterCompany, filterTestId, filterStatus, filterAutoSubmit, filterRetake, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="ml-1 inline h-3 w-3" /> : <ArrowDown className="ml-1 inline h-3 w-3" />;
  };

  const downloadCSV = () => {
    if (filteredRows.length === 0) { toast.error("No data to export"); return; }
    const test = tests.find((t) => t.id === selectedTest);
    const headers = ["Name", "Email", "CGPA", "Score", "Status", "Attempt", "Completed At", "Auto-Submitted", "Proctor Warnings", "Gadgets Detected", "Retake Reason", "Resume URL"];
    const csvRows = filteredRows.map((r) => {
      const warnings = r.proctorEvents.filter((e) => e.action === "warning").length;
      const gadgets = [...new Set(r.proctorEvents.map((e) => e.gadget))].join("; ");
      return [
        r.studentName,
        r.email,
        r.cgpa ?? "",
        r.totalScore ?? "",
        r.passed ? "Passed" : "Failed",
        r.attemptNumber,
        r.completedAt ? format(new Date(r.completedAt), "yyyy-MM-dd HH:mm") : "",
        r.autoSubmitted ? "Yes" : "No",
        warnings,
        gadgets,
        (r.retakeReason ?? "").replace(/"/g, "'"),
        r.resumeUrl ?? "",
      ];
    });

    const csv = [headers.join(","), ...csvRows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${test?.title ?? "test"}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  };

  const testsForFilter = useMemo(() => {
    const testIdsInRows = new Set(rows.map((r) => r.testId));
    return tests.filter((t) => testIdsInRows.has(t.id));
  }, [tests, rows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Generate and download placement reports</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4" /> Generate Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <Select value={selectedTest} onValueChange={setSelectedTest}>
                <SelectTrigger><SelectValue placeholder="Select a test" /></SelectTrigger>
                <SelectContent>
                  {tests.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title} — {format(new Date(t.scheduled_date), "MMM d, yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generateReport} disabled={loading}>
              {loading ? "Generating…" : "Generate"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Results ({filteredRows.length} of {rows.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadCSV}>
                <Download className="mr-2 h-4 w-4" /> Download CSV
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete all records for this test?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes every attempt record for the selected test. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteAllForTest}>Delete All</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardHeader>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 px-6 pb-4">
            <Select value={filterCompany} onValueChange={setFilterCompany}>
              <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Company" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All companies</SelectItem>
                {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterTestId} onValueChange={setFilterTestId}>
              <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Test" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tests</SelectItem>
                {testsForFilter.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All results</SelectItem>
                <SelectItem value="passed">Passed only</SelectItem>
                <SelectItem value="failed">Failed only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterAutoSubmit} onValueChange={setFilterAutoSubmit}>
              <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any submission</SelectItem>
                <SelectItem value="yes">Auto-submitted</SelectItem>
                <SelectItem value="no">Manually submitted</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterRetake} onValueChange={setFilterRetake}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All attempts</SelectItem>
                <SelectItem value="yes">Retakes only</SelectItem>
                <SelectItem value="no">First attempt only</SelectItem>
              </SelectContent>
            </Select>
            {(filterCompany !== "all" || filterTestId !== "all" || filterStatus !== "all" || filterAutoSubmit !== "all" || filterRetake !== "all") && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => {
                setFilterCompany("all"); setFilterTestId("all"); setFilterStatus("all");
                setFilterAutoSubmit("all"); setFilterRetake("all");
              }}>Clear filters</Button>
            )}
          </div>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("studentName")}>Name<SortIcon k="studentName" /></TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("cgpa")}>CGPA<SortIcon k="cgpa" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("totalScore")}>Score<SortIcon k="totalScore" /></TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("attemptNumber")}>Attempt<SortIcon k="attemptNumber" /></TableHead>
                  <TableHead>Proctor Summary</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No records match the current filters</TableCell></TableRow>
                ) : filteredRows.map((r) => (
                  <TableRow key={r.attemptId}>
                    <TableCell className="font-medium">{r.studentName}</TableCell>
                    <TableCell>{r.email}</TableCell>
                    <TableCell>{r.cgpa ?? "—"}</TableCell>
                    <TableCell>
                      {r.totalScore != null ? (
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">
                            {r.earnedMarks} / {r.totalMarks}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            ({r.totalScore}%)
                          </span>
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.passed ? "default" : "destructive"}>
                        {r.passed ? "Passed" : "Failed"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.attemptNumber}
                      {r.retakeReason && <span title={r.retakeReason} className="ml-1 text-xs text-muted-foreground">(retake)</span>}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const isClean = r.tabSwitches === 0 && r.proctorEvents.length === 0 && !r.autoSubmitted;
                        const gadgets = [...new Set(r.proctorEvents.filter((e) => e.gadget !== "tab_switch").map((e) => e.gadget))];
                        return (
                          <div className="flex items-center gap-2">
                            <div className="flex flex-wrap items-center gap-1 max-w-[200px]">
                              {isClean ? (
                                <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-xs">
                                  <CheckCircle2 className="h-3 w-3 mr-1 inline" /> Clean
                                </Badge>
                              ) : (
                                <>
                                  {r.tabSwitches > 0 && (
                                    <Badge variant="secondary" className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]">
                                      {r.tabSwitches} tab switch{r.tabSwitches > 1 ? "es" : ""}
                                    </Badge>
                                  )}
                                  {gadgets.length > 0 && (
                                    <Badge variant="destructive" className="text-[10px]">
                                      {gadgets.length} gadget{gadgets.length > 1 ? "s" : ""}
                                    </Badge>
                                  )}
                                  {r.autoSubmitted && (
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
                              className="h-7 px-2.5 text-xs font-medium ml-auto"
                              onClick={() => setSelectedAuditRow(r)}
                            >
                              View
                            </Button>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this record?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Permanently delete {r.studentName}'s attempt #{r.attemptNumber}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteAttempt(r.attemptId)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Proctoring & Integrity Detail Dialog */}
      <Dialog open={!!selectedAuditRow} onOpenChange={(open) => !open && setSelectedAuditRow(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <ShieldAlert className="h-5 w-5 text-primary" /> Proctoring & Integrity Audit
            </DialogTitle>
            <DialogDescription>
              Candidate: <span className="font-semibold text-foreground">{selectedAuditRow?.studentName}</span> ({selectedAuditRow?.email}) · Attempt #{selectedAuditRow?.attemptNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedAuditRow && (
            <div className="space-y-4 pt-2">
              {/* Integrity Overview Banner */}
              <div className={`p-3.5 rounded-lg border flex items-center justify-between ${
                selectedAuditRow.tabSwitches === 0 && selectedAuditRow.proctorEvents.length === 0 && !selectedAuditRow.autoSubmitted
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-destructive/10 border-destructive/30 text-destructive"
              }`}>
                <div className="flex items-center gap-2.5">
                  {selectedAuditRow.tabSwitches === 0 && selectedAuditRow.proctorEvents.length === 0 && !selectedAuditRow.autoSubmitted ? (
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
                <Badge variant={selectedAuditRow.tabSwitches === 0 && selectedAuditRow.proctorEvents.length === 0 && !selectedAuditRow.autoSubmitted ? "default" : "destructive"}>
                  {selectedAuditRow.tabSwitches === 0 && selectedAuditRow.proctorEvents.length === 0 && !selectedAuditRow.autoSubmitted ? "VERIFIED" : "FLAGGED"}
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
                    {[...new Set(selectedAuditRow.proctorEvents.filter(e => e.gadget !== "tab_switch").map(e => e.gadget))].length}
                  </div>
                </div>

                <div className="p-3 rounded-lg border bg-muted/30">
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                    Score Breakdown
                  </div>
                  <div className="text-sm font-bold font-mono mt-1 text-foreground">
                    {selectedAuditRow.earnedMarks} / {selectedAuditRow.totalMarks}
                  </div>
                  <div className="text-[10px] text-muted-foreground">({selectedAuditRow.totalScore ?? 0}%)</div>
                </div>

                <div className="p-3 rounded-lg border bg-muted/30">
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                    Auto-Submitted
                  </div>
                  <div className="text-base font-bold mt-1">
                    {selectedAuditRow.autoSubmitted ? (
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

                {selectedAuditRow.proctorEvents.length === 0 && selectedAuditRow.tabSwitches === 0 ? (
                  <div className="p-4 rounded-lg border border-dashed text-center text-xs text-muted-foreground">
                    Candidate completed the assessment without any detected gadget infractions or tab switches.
                  </div>
                ) : (
                  <div className="rounded-lg border divide-y max-h-60 overflow-y-auto">
                    {selectedAuditRow.tabSwitches > 0 && !selectedAuditRow.proctorEvents.some(e => e.gadget === "tab_switch") && (
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

                    {selectedAuditRow.proctorEvents
                      .slice()
                      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                      .map((ev, i) => (
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

              {selectedAuditRow.retakeReason && (
                <div className="p-3 rounded-lg border bg-muted/40 text-xs">
                  <span className="font-semibold text-foreground">Retake Justification:</span> {selectedAuditRow.retakeReason}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
