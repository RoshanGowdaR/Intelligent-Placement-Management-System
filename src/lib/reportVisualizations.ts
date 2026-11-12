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


export type CustomChartType = "bar" | "line" | "area" | "pie" | "scatter";

export interface CustomChartSeries {
  key: string;
  label: string;
  color: string;
}

export interface CustomAIChartSpec {
  id: string;
  title: string;
  subtitle: string;
  chartType: CustomChartType;
  xKey: string;
  yKeys: CustomChartSeries[];
  data: Record<string, string | number | boolean>[];
  sourcePrompt: string;
}

const CHART_PALETTE = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export function buildAIChartSystemPrompt(rows: VisualizableReportRow[]): string {
  const compactRows = rows.slice(0, 60).map((r) => ({
    studentName: r.studentName,
    usn: r.usn || "—",
    branch: r.branch || "General",
    batch: r.yearOfPassing ?? null,
    cgpa: r.cgpa ?? null,
    scorePct: Math.round(Number(r.totalScore ?? 0)),
    earnedMarks: r.earnedMarks ?? null,
    totalMarks: r.totalMarks ?? null,
    passed: Boolean(r.passed),
    attemptNumber: r.attemptNumber || 1,
    tabSwitches: r.tabSwitches || 0,
    cameraFlags: (r.proctorEvents || []).filter((e) => e.gadget !== "tab_switch").length,
    flaggedGadgets: (r.proctorEvents || [])
      .filter((e) => e.gadget !== "tab_switch")
      .map((e) => e.gadget),
    autoSubmitted: Boolean(r.autoSubmitted),
  }));

  return `You are a Data Visualization Architect for an Institutional Placement Management System.
Given the candidate assessment report dataset below (${rows.length} total records, up to 60 shown), generate a SINGLE valid JSON object describing the exact chart the user requested.

REPORT DATA (JSON):
${JSON.stringify(compactRows)}

STRICT OUTPUT FORMAT (return ONLY raw JSON, no markdown code blocks or prose):
{
  "title": "Concise chart title",
  "subtitle": "1-sentence takeaway or explanation of what the chart displays",
  "chartType": "bar" | "line" | "area" | "pie" | "scatter",
  "xKey": "categoryOrXFieldName",
  "yKeys": [
    { "key": "numericMetricFieldName", "label": "Display Label", "color": "#6366f1" }
  ],
  "data": [
    { "categoryOrXFieldName": "Value", "numericMetricFieldName": 75 }
  ]
}

Rules:
- Honor the user's requested chartType ("bar", "line", "area", "pie", or "scatter").
- For "pie", include exactly 1 yKey (e.g. "value") and ensure data has { "name": "...", "value": number } with xKey = "name".
- For "scatter", xKey must be numeric in data (e.g. "cgpa" or "tabSwitches") and yKeys[0].key numeric (e.g. "scorePct").
- Every number in "data" must be computed accurately from the actual REPORT DATA above. Never invent candidates or numbers.`;
}

export function buildFallbackCustomChart(
  userPrompt: string,
  rows: VisualizableReportRow[]
): CustomAIChartSpec {
  const q = userPrompt.toLowerCase();
  const preferredType: CustomChartType = q.includes("pie") || q.includes("donut")
    ? "pie"
    : q.includes("line") || q.includes("trend")
    ? "line"
    : q.includes("area")
    ? "area"
    : q.includes("scatter") || q.includes("correlation")
    ? "scatter"
    : "bar";

  const id = `custom-${Date.now()}`;

  if (preferredType === "pie") {
    if (q.includes("branch")) {
      const branchCounts = new Map<string, number>();
      for (const r of rows) {
        const b = r.branch || "General";
        branchCounts.set(b, (branchCounts.get(b) || 0) + 1);
      }
      return {
        id,
        title: "Candidates by Branch",
        subtitle: `Distribution across ${branchCounts.size} branches from ${rows.length} report rows`,
        chartType: "pie",
        xKey: "name",
        yKeys: [{ key: "value", label: "Candidates", color: "#6366f1" }],
        data: Array.from(branchCounts.entries()).map(([name, value]) => ({ name, value })),
        sourcePrompt: userPrompt,
      };
    }
    const clean = rows.filter((r) => r.tabSwitches === 0 && r.proctorEvents.length === 0 && !r.autoSubmitted).length;
    const flagged = rows.length - clean;
    if (q.includes("proctor") || q.includes("cheat") || q.includes("gadget") || q.includes("integrity")) {
      return {
        id,
        title: "Integrity Split (Clean vs Flagged)",
        subtitle: "Ratio of clean assessment attempts to flagged attempts",
        chartType: "pie",
        xKey: "name",
        yKeys: [{ key: "value", label: "Attempts", color: "#10b981" }],
        data: [
          { name: "Clean", value: clean },
          { name: "Flagged / Auto-Submitted", value: flagged },
        ].filter((d) => d.value > 0),
        sourcePrompt: userPrompt,
      };
    }
    const passed = rows.filter((r) => r.passed).length;
    const failed = rows.length - passed;
    return {
      id,
      title: "Custom Qualification Split",
      subtitle: `${passed} Passed vs ${failed} Failed`,
      chartType: "pie",
      xKey: "name",
      yKeys: [{ key: "value", label: "Candidates", color: "#10b981" }],
      data: [
        { name: "Passed", value: passed },
        { name: "Failed", value: failed },
      ].filter((d) => d.value > 0),
      sourcePrompt: userPrompt,
    };
  }

  if (preferredType === "scatter") {
    const useTab = q.includes("tab") || q.includes("switch") || q.includes("proctor");
    const xKey = useTab ? "tabSwitches" : "cgpa";
    const scatterRows = rows
      .filter((r) => (useTab ? true : typeof r.cgpa === "number" && r.cgpa > 0))
      .map((r) => ({
        name: r.studentName,
        [xKey]: useTab ? r.tabSwitches : Number(r.cgpa),
        scorePct: Math.round(Number(r.totalScore ?? 0)),
      }));
    return {
      id,
      title: useTab ? "Tab Switches vs Score (%)" : "CGPA vs Score (%)",
      subtitle: `Correlation across ${scatterRows.length} records`,
      chartType: "scatter",
      xKey,
      yKeys: [{ key: "scorePct", label: "Score (%)", color: "#6366f1" }],
      data: scatterRows.length > 0 ? scatterRows : rows.map((r, i) => ({ name: r.studentName, [xKey]: i + 1, scorePct: Math.round(Number(r.totalScore ?? 0)) })),
      sourcePrompt: userPrompt,
    };
  }

  if (q.includes("tab") || q.includes("proctor") || q.includes("gadget") || q.includes("violation")) {
    return {
      id,
      title: "Candidate Proctoring & Tab Switch Activity",
      subtitle: "Tab switches and camera/gadget alerts recorded per candidate",
      chartType: preferredType,
      xKey: "student",
      yKeys: [
        { key: "tabSwitches", label: "Tab Switches", color: "#f59e0b" },
        { key: "gadgetFlags", label: "Gadget Flags", color: "#ef4444" },
      ],
      data: rows.slice(0, 15).map((r) => ({
        student: r.studentName.length > 14 ? r.studentName.slice(0, 12) + "…" : r.studentName,
        tabSwitches: r.tabSwitches,
        gadgetFlags: (r.proctorEvents || []).filter((e) => e.gadget !== "tab_switch").length,
      })),
      sourcePrompt: userPrompt,
    };
  }

  if (q.includes("branch")) {
    const agg = computeReportVisualizationData(rows);
    return {
      id,
      title: "Branch-Wise Scores & Pass Rate",
      subtitle: "Average percentage and pass rate per branch",
      chartType: preferredType,
      xKey: "branch",
      yKeys: [
        { key: "avgScore", label: "Avg Score (%)", color: "#6366f1" },
        { key: "passRate", label: "Pass Rate (%)", color: "#10b981" },
      ],
      data: agg.branchPerfData,
      sourcePrompt: userPrompt,
    };
  }

  return {
    id,
    title: "Candidate Earned Marks & Score (%)",
    subtitle: `Custom ${preferredType} visualization generated from ${rows.length} candidate results`,
    chartType: preferredType,
    xKey: "student",
    yKeys: [
      { key: "scorePct", label: "Score (%)", color: "#6366f1" },
      { key: "earnedMarks", label: "Earned Marks", color: "#10b981" },
    ],
    data: [...rows]
      .sort((a, b) => Number(b.totalScore ?? 0) - Number(a.totalScore ?? 0))
      .slice(0, 15)
      .map((r) => ({
        student: r.studentName.length > 14 ? r.studentName.slice(0, 12) + "…" : r.studentName,
        scorePct: Math.round(Number(r.totalScore ?? 0)),
        earnedMarks: Number(r.earnedMarks ?? 0),
      })),
    sourcePrompt: userPrompt,
  };
}

export function parseOrFallbackAIChartSpec(
  rawText: string,
  userPrompt: string,
  rows: VisualizableReportRow[]
): CustomAIChartSpec {
  try {
    const cleaned = (rawText || "")
      .replace(/^```json\s*/gim, "")
      .replace(/^```\s*/gim, "")
      .replace(/```$/gm, "")
      .trim();

    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace <= firstBrace) {
      return buildFallbackCustomChart(userPrompt, rows);
    }

    const parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    const validTypes: CustomChartType[] = ["bar", "line", "area", "pie", "scatter"];
    const chartType: CustomChartType = validTypes.includes(parsed.chartType)
      ? parsed.chartType
      : "bar";

    if (!Array.isArray(parsed.data) || parsed.data.length === 0) {
      return buildFallbackCustomChart(userPrompt, rows);
    }

    const sampleRow = parsed.data[0] || {};
    const keys = Object.keys(sampleRow);
    const xKey = typeof parsed.xKey === "string" && parsed.xKey in sampleRow
      ? parsed.xKey
      : keys[0] || "name";

    let yKeys: CustomChartSeries[] = Array.isArray(parsed.yKeys)
      ? parsed.yKeys
          .filter((y: any) => y && typeof y.key === "string" && y.key in sampleRow)
          .map((y: any, idx: number) => ({
            key: y.key,
            label: typeof y.label === "string" ? y.label : y.key,
            color: typeof y.color === "string" ? y.color : CHART_PALETTE[idx % CHART_PALETTE.length],
          }))
      : [];

    if (yKeys.length === 0) {
      const numericKeys = keys.filter((k) => k !== xKey && typeof sampleRow[k] === "number");
      if (numericKeys.length === 0) {
        return buildFallbackCustomChart(userPrompt, rows);
      }
      yKeys = numericKeys.map((k, idx) => ({
        key: k,
        label: k,
        color: CHART_PALETTE[idx % CHART_PALETTE.length],
      }));
    }

    return {
      id: `custom-${Date.now()}`,
      title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : "AI Custom Visualization",
      subtitle: typeof parsed.subtitle === "string" && parsed.subtitle.trim() ? parsed.subtitle.trim() : userPrompt,
      chartType,
      xKey,
      yKeys,
      data: parsed.data,
      sourcePrompt: userPrompt,
    };
  } catch {
    return buildFallbackCustomChart(userPrompt, rows);
  }
}
