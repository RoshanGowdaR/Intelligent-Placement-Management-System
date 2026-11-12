export interface VisualizableReportRow {
  attemptId: string;
  studentName: string;
  usn?: string;
  branch: string;
  yearOfPassing?: number | null;
  cgpa: number | null;
  totalScore: number | null;
  earnedMarks?: number;
  totalMarks?: number;
  passed: boolean | null;
  attemptNumber: number;
  tabSwitches: number;
  proctorEvents: { timestamp: string; gadget: string; action: string }[];
  autoSubmitted: boolean;
}

export type VisualizationId =
  | "pass_fail"
  | "score_bins"
  | "branch_perf"
  | "candidate_scores"
  | "proctor_integrity"
  | "cgpa_vs_score"
  | "attempt_outcomes";

export interface VisualizationOption {
  id: VisualizationId;
  title: string;
  chartType: string;
  description: string;
}

export const VISUALIZATION_OPTIONS: VisualizationOption[] = [
  {
    id: "pass_fail",
    title: "Pass vs. Fail Distribution",
    chartType: "Pie / Donut Chart",
    description: "Overall qualification split and pass percentage across the report.",
  },
  {
    id: "score_bins",
    title: "Score Distribution Histogram",
    chartType: "Bar Chart",
    description: "Candidate count grouped into 0–20%, 21–40%, 41–60%, 61–80%, and 81–100% score bands.",
  },
  {
    id: "branch_perf",
    title: "Branch-Wise Performance",
    chartType: "Grouped Bar Chart",
    description: "Compare average score % and pass rate % across branches.",
  },
  {
    id: "candidate_scores",
    title: "Candidate Score Comparison",
    chartType: "Bar Chart",
    description: "Side-by-side comparison of candidate scores sorted from highest to lowest.",
  },
  {
    id: "proctor_integrity",
    title: "Proctoring & Integrity Breakdown",
    chartType: "Donut & Violation Bars",
    description: "Clean attempts vs. tab switches, webcam gadget flags, and auto-submissions.",
  },
  {
    id: "cgpa_vs_score",
    title: "CGPA vs. Assessment Score",
    chartType: "Scatter Plot",
    description: "Correlation between student CGPA and assessment score percentage.",
  },
  {
    id: "attempt_outcomes",
    title: "Attempt & Retake Breakdown",
    chartType: "Bar Chart",
    description: "Total attempts vs. qualified counts segmented by Attempt #1, #2, etc.",
  },
];

export function computeReportVisualizationData(rows: VisualizableReportRow[]) {
  const total = rows.length;
  const passedCount = rows.filter((r) => Boolean(r.passed)).length;
  const failedCount = total - passedCount;

  const passFailData = [
    { name: "Passed", value: passedCount, fill: "#10b981" },
    { name: "Failed", value: failedCount, fill: "#ef4444" },
  ].filter((d) => d.value > 0);

  const bins = [
    { range: "0–20%", min: 0, max: 20, count: 0 },
    { range: "21–40%", min: 21, max: 40, count: 0 },
    { range: "41–60%", min: 41, max: 60, count: 0 },
    { range: "61–80%", min: 61, max: 80, count: 0 },
    { range: "81–100%", min: 81, max: 100, count: 0 },
  ];
  for (const r of rows) {
    const score = Math.max(0, Math.min(100, Number(r.totalScore ?? 0)));
    const bucket = bins.find((b) => score >= b.min && score <= b.max) || bins[0];
    bucket.count += 1;
  }
  const scoreBinsData = bins.map(({ range, count }) => ({ range, candidates: count }));

  const branchMap = new Map<string, { total: number; passed: number; scoreSum: number }>();
  for (const r of rows) {
    const branch = (r.branch || "General").trim() || "General";
    const entry = branchMap.get(branch) ?? { total: 0, passed: 0, scoreSum: 0 };
    entry.total += 1;
    if (r.passed) entry.passed += 1;
    entry.scoreSum += Number(r.totalScore ?? 0);
    branchMap.set(branch, entry);
  }
  const branchPerfData = Array.from(branchMap.entries()).map(([branch, stats]) => ({
    branch: branch.length > 18 ? branch.slice(0, 16) + "…" : branch,
    fullBranch: branch,
    avgScore: Math.round(stats.scoreSum / stats.total),
    passRate: Math.round((stats.passed / stats.total) * 100),
    candidates: stats.total,
  }));

  const candidateScoresData = [...rows]
    .sort((a, b) => Number(b.totalScore ?? 0) - Number(a.totalScore ?? 0))
    .slice(0, 20)
    .map((r) => ({
      name: r.studentName.length > 14 ? r.studentName.slice(0, 12) + "…" : r.studentName,
      fullName: r.studentName,
      usn: r.usn || "—",
      score: Math.round(Number(r.totalScore ?? 0)),
      passed: Boolean(r.passed),
    }));

  let cleanCount = 0;
  let flaggedWarnCount = 0;
  let autoSubCount = 0;
  const violationTypes = new Map<string, number>();

  for (const r of rows) {
    const hasCameraFlags = Array.isArray(r.proctorEvents) && r.proctorEvents.some((e) => e.gadget !== "tab_switch");
    const hasTabFlags = r.tabSwitches > 0 || (Array.isArray(r.proctorEvents) && r.proctorEvents.some((e) => e.gadget === "tab_switch"));

    if (r.autoSubmitted) {
      autoSubCount += 1;
    } else if (hasCameraFlags || hasTabFlags) {
      flaggedWarnCount += 1;
    } else {
      cleanCount += 1;
    }

    if (r.tabSwitches > 0) {
      violationTypes.set("Tab Switch", (violationTypes.get("Tab Switch") || 0) + r.tabSwitches);
    }
    for (const ev of r.proctorEvents || []) {
      if (ev.gadget === "tab_switch") continue;
      const label = ev.gadget || "Other Flag";
      violationTypes.set(label, (violationTypes.get(label) || 0) + 1);
    }
  }

  const proctorStatusData = [
    { name: "Clean", value: cleanCount, fill: "#10b981" },
    { name: "Flagged Warning", value: flaggedWarnCount, fill: "#f59e0b" },
    { name: "Auto-Submitted", value: autoSubCount, fill: "#ef4444" },
  ].filter((d) => d.value > 0);

  const proctorEventBreakdown = Array.from(violationTypes.entries())
    .map(([type, count]) => ({ type: type.length > 28 ? type.slice(0, 26) + "…" : type, fullType: type, count }))
    .sort((a, b) => b.count - a.count);

  const cgpaScatterData = rows
    .filter((r) => typeof r.cgpa === "number" && r.cgpa > 0)
    .map((r) => ({
      name: r.studentName,
      cgpa: Number(r.cgpa),
      score: Math.round(Number(r.totalScore ?? 0)),
      passed: Boolean(r.passed),
    }));

  const attemptMap = new Map<number, { total: number; passed: number; scoreSum: number }>();
  for (const r of rows) {
    const num = r.attemptNumber || 1;
    const entry = attemptMap.get(num) ?? { total: 0, passed: 0, scoreSum: 0 };
    entry.total += 1;
    if (r.passed) entry.passed += 1;
    entry.scoreSum += Number(r.totalScore ?? 0);
    attemptMap.set(num, entry);
  }
  const attemptOutcomesData = Array.from(attemptMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([attemptNumber, s]) => ({
      attempt: `Attempt #${attemptNumber}`,
      total: s.total,
      passed: s.passed,
      avgScore: Math.round(s.scoreSum / s.total),
    }));

  return {
    total,
    passedCount,
    failedCount,
    passFailData,
    scoreBinsData,
    branchPerfData,
    candidateScoresData,
    proctorStatusData,
    proctorEventBreakdown,
    cgpaScatterData,
    attemptOutcomesData,
  };
}
