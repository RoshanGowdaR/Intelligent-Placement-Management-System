import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePersistentState } from "@/hooks/usePersistentState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Download, FileText, Trash2, ArrowUpDown, ArrowUp, ArrowDown, ShieldAlert, CheckCircle2, AlertTriangle, Monitor, Laptop, Smartphone, Search, X } from "lucide-react";
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
  usn: string;
  branch: string;
  yearOfPassing: number | null;
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

type SortKey = "studentName" | "usn" | "branch" | "yearOfPassing" | "cgpa" | "totalScore" | "attemptNumber" | "completedAt";
type SortDir = "asc" | "desc";

export default function AdminReports() {
  const [tests, setTests] = useState<Test[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [selectedTest, setSelectedTest] = usePersistentState<string>("ipms_reports_selected_test", "");
  const [rows, setRows] = usePersistentState<ReportRow[]>("ipms_reports_rows", []);
  const [loading, setLoading] = useState(false);
  const [selectedAuditRow, setSelectedAuditRow] = useState<ReportRow | null>(null);

  // Persistent Filters across page navigation
  const [filterCompany, setFilterCompany] = usePersistentState<string>("ipms_reports_f_company", "all");
  const [filterTestId, setFilterTestId] = usePersistentState<string>("ipms_reports_f_test", "all");
  const [filterStatus, setFilterStatus] = usePersistentState<string>("ipms_reports_f_status", "all"); // all | passed | failed
  const [filterAutoSubmit, setFilterAutoSubmit] = usePersistentState<string>("ipms_reports_f_autosubmit", "all"); // all | yes | no
  const [filterRetake, setFilterRetake] = usePersistentState<string>("ipms_reports_f_retake", "all"); // all | yes | no
  const [filterBranch, setFilterBranch] = usePersistentState<string>("ipms_reports_f_branch", "all");
  const [filterBatch, setFilterBatch] = usePersistentState<string>("ipms_reports_f_batch", "all");
  const [filterUsnSearch, setFilterUsnSearch] = usePersistentState<string>("ipms_reports_f_usn", "");

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
      .select("id, name, email, cgpa, resume_url, usn, branch, year_of_passing")
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
        usn: p?.usn || "—",
        branch: p?.branch || "General",
        yearOfPassing: p?.year_of_passing ?? null,
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

  // Distinct branches and batches from loaded rows
  const availableBranches = useMemo(() => {
    const branches = new Set<string>();
    rows.forEach((r) => { if (r.branch && r.branch !== "—") branches.add(r.branch); });
    return Array.from(branches).sort();
  }, [rows]);

  const availableBatches = useMemo(() => {
    const batches = new Set<string>();
    rows.forEach((r) => { if (r.yearOfPassing) batches.add(String(r.yearOfPassing)); });
    return Array.from(batches).sort();
  }, [rows]);

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
    if (filterBranch !== "all") out = out.filter((r) => r.branch.toLowerCase() === filterBranch.toLowerCase());
    if (filterBatch !== "all") out = out.filter((r) => String(r.yearOfPassing) === filterBatch);
    if (filterUsnSearch.trim()) {
      const q = filterUsnSearch.trim().toLowerCase();
      out = out.filter((r) => r.usn.toLowerCase().includes(q) || r.studentName.toLowerCase().includes(q));
    }

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
  }, [rows, filterCompany, filterTestId, filterStatus, filterAutoSubmit, filterRetake, filterBranch, filterBatch, filterUsnSearch, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="ml-1 inline h-3 w-3" /> : <ArrowDown className="ml-1 inline h-3 w-3" />;
  };

  // CSV export respects all active filters and includes complete student profile
  const downloadCSV = () => {
    if (filteredRows.length === 0) { toast.error("No data to export"); return; }
    const test = tests.find((t) => t.id === selectedTest);
    const headers = [
      "Name",
      "Email",
      "USN",
      "Branch",
      "Year of Graduation",
      "CGPA",
      "Score (%)",
      "Earned Marks",
      "Total Marks",
      "Status",
      "Attempt",
      "Completed At",
      "Auto-Submitted",
      "Tab Switches",
      "Proctor Warnings",
      "Gadgets Detected",
      "Retake Reason",
      "Resume URL"
    ];
    const csvRows = filteredRows.map((r) => {
      const warnings = r.proctorEvents.filter((e) => e.action === "warning").length;
      const gadgets = [...new Set(r.proctorEvents.map((e) => e.gadget))].join("; ");
      return [
        r.studentName,
        r.email,
        r.usn,
        r.branch,
        r.yearOfPassing ?? "—",
        r.cgpa ?? "",
        r.totalScore ?? "",
        r.earnedMarks,
        r.totalMarks,
        r.passed ? "Passed" : "Failed",
        r.attemptNumber,
        r.completedAt ? format(new Date(r.completedAt), "yyyy-MM-dd HH:mm") : "",
        r.autoSubmitted ? "Yes" : "No",
        r.tabSwitches,
        warnings,
        gadgets,
        (r.retakeReason ?? "").replace(/"/g, "'"),
        r.resumeUrl ?? "",
      ];
    });

    const csv = [headers.join(","), ...csvRows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `placement-report-${test?.title ? test.title.toLowerCase().replace(/[^a-z0-9]/g, "-") : "filtered"}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded CSV with ${filteredRows.length} filtered candidate records`);
  };

  const testsForFilter = useMemo(() => {
    const testIdsInRows = new Set(rows.map((r) => r.testId));
    return tests.filter((t) => testIdsInRows.has(t.id));
  }, [tests, rows]);

  const hasActiveFilters = filterCompany !== "all" || filterTestId !== "all" || filterStatus !== "all" ||
    filterAutoSubmit !== "all" || filterRetake !== "all" || filterBranch !== "all" || filterBatch !== "all" || filterUsnSearch.trim() !== "";

  const clearAllFilters = () => {
    setFilterCompany("all");
    setFilterTestId("all");
    setFilterStatus("all");
    setFilterAutoSubmit("all");
    setFilterRetake("all");
    setFilterBranch("all");
    setFilterBatch("all");
    setFilterUsnSearch("");
    toast.info("Filters reset to default");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Generate, filter, and export granular placement evaluation and forensic audit records.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4 text-primary" /> Generate Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-3 flex-wrap sm:flex-nowrap">
            <div className="flex-1 min-w-[240px] space-y-2">
              <Select value={selectedTest} onValueChange={setSelectedTest}>
                <SelectTrigger><SelectValue placeholder="Select an assessment to generate report" /></SelectTrigger>
                <SelectContent>
                  {tests.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title} — {format(new Date(t.scheduled_date), "MMM d, yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generateReport} disabled={loading} className="shrink-0 font-bold">
              {loading ? "Generating…" : "Generate Report"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap border-b border-border/60 pb-4">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Candidate Assessment Results
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Showing {filteredRows.length} of {rows.length} records matching current filter criteria
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={downloadCSV} className="font-semibold text-xs h-9">
                <Download className="mr-2 h-4 w-4 text-primary" /> Download CSV ({filteredRows.length})
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="font-semibold text-xs h-9">
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

          {/* Granular Filters Bar */}
          <div className="p-4 bg-muted/20 border-b border-border/60 space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              
              {/* USN / Name Search */}
              <div className="relative w-full sm:w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filter by USN or Name..."
                  value={filterUsnSearch}
                  onChange={(e) => setFilterUsnSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-background"
                />
                {filterUsnSearch && (
                  <button
                    onClick={() => setFilterUsnSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Branch Filter */}
              <Select value={filterBranch} onValueChange={setFilterBranch}>
                <SelectTrigger className="w-[140px] h-8 text-xs bg-background"><SelectValue placeholder="Branch" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {availableBranches.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>

              {/* Graduation Year / Batch Filter */}
              <Select value={filterBatch} onValueChange={setFilterBatch}>
                <SelectTrigger className="w-[130px] h-8 text-xs bg-background"><SelectValue placeholder="Graduation Year" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Batches</SelectItem>
                  {availableBatches.length > 0 ? (
                    availableBatches.map((batch) => <SelectItem key={batch} value={batch}>Class of {batch}</SelectItem>)
                  ) : (
                    <>
                      <SelectItem value="2024">Class of 2024</SelectItem>
                      <SelectItem value="2025">Class of 2025</SelectItem>
                      <SelectItem value="2026">Class of 2026</SelectItem>
                      <SelectItem value="2027">Class of 2027</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>

              {/* Company Filter */}
              <Select value={filterCompany} onValueChange={setFilterCompany}>
                <SelectTrigger className="w-[150px] h-8 text-xs bg-background"><SelectValue placeholder="Company" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[130px] h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Results</SelectItem>
                  <SelectItem value="passed">Passed only</SelectItem>
                  <SelectItem value="failed">Failed only</SelectItem>
                </SelectContent>
              </Select>

              {/* Submission Mode Filter */}
              <Select value={filterAutoSubmit} onValueChange={setFilterAutoSubmit}>
                <SelectTrigger className="w-[140px] h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Submission</SelectItem>
                  <SelectItem value="yes">Auto-submitted</SelectItem>
                  <SelectItem value="no">Manually submitted</SelectItem>
                </SelectContent>
              </Select>

              {/* Attempt Filter */}
              <Select value={filterRetake} onValueChange={setFilterRetake}>
                <SelectTrigger className="w-[130px] h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Attempts</SelectItem>
                  <SelectItem value="no">1st Attempt</SelectItem>
                  <SelectItem value="yes">Retakes</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="h-8 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10" onClick={clearAllFilters}>
                  <X className="h-3.5 w-3.5 mr-1" /> Clear filters
                </Button>
              )}
            </div>
          </div>

          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="cursor-pointer select-none font-bold" onClick={() => toggleSort("studentName")}>
                    Candidate Name<SortIcon k="studentName" />
                  </TableHead>
                  <TableHead className="font-bold">Email</TableHead>
                  <TableHead className="cursor-pointer select-none font-bold" onClick={() => toggleSort("usn")}>
                    USN<SortIcon k="usn" />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none font-bold" onClick={() => toggleSort("branch")}>
                    Branch<SortIcon k="branch" />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none font-bold" onClick={() => toggleSort("yearOfPassing")}>
                    Graduation<SortIcon k="yearOfPassing" />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none font-bold" onClick={() => toggleSort("cgpa")}>
                    CGPA<SortIcon k="cgpa" />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none font-bold" onClick={() => toggleSort("totalScore")}>
                    Score / Marks<SortIcon k="totalScore" />
                  </TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="cursor-pointer select-none font-bold" onClick={() => toggleSort("attemptNumber")}>
                    Attempt<SortIcon k="attemptNumber" />
                  </TableHead>
                  <TableHead className="font-bold">Proctor Summary</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                      No candidate records match the active filter criteria.
                    </TableCell>
                  </TableRow>
                ) : filteredRows.map((r) => (
                  <TableRow key={r.attemptId} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="font-semibold text-foreground">{r.studentName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.email}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted/60 border border-border/60 text-foreground font-semibold">
                        {r.usn}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[11px] font-medium bg-primary/5 text-primary border-primary/20">
                        {r.branch}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {r.yearOfPassing ? `Batch of ${r.yearOfPassing}` : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold">{r.cgpa ?? "—"}</TableCell>
                    <TableCell>
                      {r.totalScore != null ? (
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground text-xs">
                            {r.earnedMarks} / {r.totalMarks}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            ({r.totalScore}%)
                          </span>
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.passed ? "default" : "destructive"} className="text-[11px]">
                        {r.passed ? "Passed" : "Failed"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-semibold">
                      #{r.attemptNumber}
                      {r.retakeReason && <span title={r.retakeReason} className="ml-1 text-[10px] text-amber-500 font-normal">(retake)</span>}
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteAttempt(r.attemptId)}
                        title="Delete attempt"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )) }
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Proctoring & Integrity Audit Modal */}
      <Dialog open={!!selectedAuditRow} onOpenChange={(open) => !open && setSelectedAuditRow(null)}>
        <DialogContent className="max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
              <ShieldAlert className="h-5 w-5 text-primary" />
              Proctoring &amp; Integrity Audit
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Candidate: <strong className="text-foreground">{selectedAuditRow?.studentName}</strong> ({selectedAuditRow?.email}) · Attempt #{selectedAuditRow?.attemptNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedAuditRow && (
            <div className="space-y-4 pt-2">
              {/* Status Header */}
              {selectedAuditRow.tabSwitches === 0 && selectedAuditRow.proctorEvents.length === 0 && !selectedAuditRow.autoSubmitted ? (
                <div className="flex items-center gap-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-6 w-6 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm">Verified Clean Assessment Session</h4>
                    <p className="text-xs text-muted-foreground">No tab switches, fullscreen violations, or prohibited gadgets detected during the entire session.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-2xl bg-destructive/10 border border-destructive/20 p-4 text-destructive">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-6 w-6 shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm">Integrity Infractions Detected</h4>
                      <p className="text-xs text-muted-foreground">Violations recorded during assessment session.</p>
                    </div>
                  </div>
                  <Badge variant="destructive" className="font-bold">FLAGGED</Badge>
                </div>
              )}

              {/* Metrics Summary */}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-xl bg-muted/40 border border-border">
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Monitor className="h-3.5 w-3.5" /> Tab Switches
                  </div>
                  <div className="text-xl font-bold mt-1">{selectedAuditRow.tabSwitches}</div>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border border-border">
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Smartphone className="h-3.5 w-3.5" /> Gadgets Flagged
                  </div>
                  <div className="text-xl font-bold mt-1">
                    {selectedAuditRow.proctorEvents.filter((e) => e.gadget !== "tab_switch").length}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border border-border">
                  <div className="text-xs text-muted-foreground">Score Breakdown</div>
                  <div className="text-sm font-bold mt-1">{selectedAuditRow.earnedMarks} / {selectedAuditRow.totalMarks}</div>
                  <div className="text-[10px] text-muted-foreground">({selectedAuditRow.totalScore}%)</div>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border border-border">
                  <div className="text-xs text-muted-foreground">Auto-Submitted</div>
                  <div className={`text-base font-bold mt-1 ${selectedAuditRow.autoSubmitted ? "text-destructive" : "text-emerald-500"}`}>
                    {selectedAuditRow.autoSubmitted ? "YES" : "NO"}
                  </div>
                </div>
              </div>

              {/* Forensic Event Log */}
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Audit Timeline &amp; Event Log</h5>
                {selectedAuditRow.proctorEvents.length === 0 && selectedAuditRow.tabSwitches === 0 ? (
                  <div className="text-xs text-muted-foreground p-3 rounded-xl bg-muted/20 text-center">
                    No proctoring violations recorded. Full session adhered to integrity guidelines.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {selectedAuditRow.tabSwitches > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4 text-amber-500" />
                          <div>
                            <span className="font-semibold text-foreground">Window / Tab Focus Lost</span>
                            <p className="text-[11px] text-muted-foreground">Candidate navigated away from the assessment window or switched tabs.</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="border-amber-500/30 text-amber-600 bg-amber-500/10">
                          {selectedAuditRow.tabSwitches} occurrence{selectedAuditRow.tabSwitches > 1 ? "s" : ""}
                        </Badge>
                      </div>
                    )}
                    {selectedAuditRow.proctorEvents.map((e, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4 text-destructive" />
                          <div>
                            <span className="font-semibold text-foreground">{e.gadget}</span>
                            <p className="text-[11px] text-muted-foreground">Action taken: {e.action}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {format(new Date(e.timestamp), "HH:mm:ss")}
                        </span>
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
