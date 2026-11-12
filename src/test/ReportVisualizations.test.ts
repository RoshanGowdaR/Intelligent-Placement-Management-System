import { describe, it, expect } from "vitest";
import { computeReportVisualizationData, VISUALIZATION_OPTIONS } from "@/lib/reportVisualizations";

describe("Report Visualizations Data Aggregation", () => {
  const sampleRows = [
    {
      attemptId: "1",
      studentName: "Aarav Sharma",
      usn: "4MC24CS001",
      branch: "Computer Science",
      cgpa: 8.9,
      totalScore: 88,
      passed: true,
      attemptNumber: 1,
      tabSwitches: 0,
      proctorEvents: [],
      autoSubmitted: false,
    },
    {
      attemptId: "2",
      studentName: "Hemanth Gowda",
      usn: "4MC24CS405",
      branch: "Computer Science",
      cgpa: 7.4,
      totalScore: 22,
      passed: false,
      attemptNumber: 1,
      tabSwitches: 1,
      proctorEvents: [],
      autoSubmitted: false,
    },
    {
      attemptId: "3",
      studentName: "Diya Nair",
      usn: "4MC24EC012",
      branch: "Electronics",
      cgpa: null,
      totalScore: 65,
      passed: true,
      attemptNumber: 2,
      tabSwitches: 0,
      proctorEvents: [{ timestamp: "2026-11-12T08:00:00Z", gadget: "Prohibited Device (Mobile Phone / Smartphone)", action: "warning" }],
      autoSubmitted: true,
    },
  ];

  it("computes accurate pass/fail distribution, score bins, and branch stats", () => {
    const agg = computeReportVisualizationData(sampleRows);
    expect(agg.total).toBe(3);
    expect(agg.passedCount).toBe(2);
    expect(agg.failedCount).toBe(1);
    expect(agg.passFailData).toEqual([
      { name: "Passed", value: 2, fill: "#10b981" },
      { name: "Failed", value: 1, fill: "#ef4444" },
    ]);

    expect(agg.scoreBinsData).toEqual([
      { range: "0–20%", candidates: 0 },
      { range: "21–40%", candidates: 1 },
      { range: "41–60%", candidates: 0 },
      { range: "61–80%", candidates: 1 },
      { range: "81–100%", candidates: 1 },
    ]);

    expect(agg.branchPerfData).toEqual([
      { branch: "Computer Science", fullBranch: "Computer Science", avgScore: 55, passRate: 50, candidates: 2 },
      { branch: "Electronics", fullBranch: "Electronics", avgScore: 65, passRate: 100, candidates: 1 },
    ]);
  });

  it("summarizes proctoring integrity events, CGPA correlation, and attempts", () => {
    const agg = computeReportVisualizationData(sampleRows);
    expect(agg.proctorStatusData).toEqual([
      { name: "Clean", value: 1, fill: "#10b981" },
      { name: "Flagged Warning", value: 1, fill: "#f59e0b" },
      { name: "Auto-Submitted", value: 1, fill: "#ef4444" },
    ]);

    expect(agg.proctorEventBreakdown).toEqual([
      { type: "Tab Switch", fullType: "Tab Switch", count: 1 },
      {
        type: "Prohibited Device (Mobile …",
        fullType: "Prohibited Device (Mobile Phone / Smartphone)",
        count: 1,
      },
    ]);

    expect(agg.cgpaScatterData).toHaveLength(2);
    expect(agg.attemptOutcomesData).toEqual([
      { attempt: "Attempt #1", total: 2, passed: 1, avgScore: 55 },
      { attempt: "Attempt #2", total: 1, passed: 1, avgScore: 65 },
    ]);
    expect(VISUALIZATION_OPTIONS.length).toBeGreaterThanOrEqual(5);
  });
});


import { parseOrFallbackAIChartSpec, buildFallbackCustomChart } from "@/lib/reportVisualizations";

describe("Custom AI Report Visualizations Parser & Fallback", () => {
  const sampleRows = [
    {
      attemptId: "1",
      studentName: "Aarav Sharma",
      usn: "4MC24CS001",
      branch: "Computer Science",
      cgpa: 8.9,
      totalScore: 88,
      earnedMarks: 8,
      totalMarks: 9,
      passed: true,
      attemptNumber: 1,
      tabSwitches: 0,
      proctorEvents: [],
      autoSubmitted: false,
    },
    {
      attemptId: "2",
      studentName: "Hemanth Gowda",
      usn: "4MC24CS405",
      branch: "Electronics",
      cgpa: 7.4,
      totalScore: 22,
      earnedMarks: 2,
      totalMarks: 9,
      passed: false,
      attemptNumber: 1,
      tabSwitches: 2,
      proctorEvents: [{ timestamp: "2026-11-12T08:00:00Z", gadget: "Prohibited Device (Mobile Phone / Smartphone)", action: "warning" }],
      autoSubmitted: true,
    },
  ];

  it("parses valid fenced JSON chart specification from AI output", () => {
    const rawAI = `\`\`\`json
{
  "title": "Scores by Candidate",
  "subtitle": "Comparison across candidates",
  "chartType": "line",
  "xKey": "student",
  "yKeys": [{ "key": "score", "label": "Score (%)", "color": "#6366f1" }],
  "data": [
    { "student": "Aarav Sharma", "score": 88 },
    { "student": "Hemanth Gowda", "score": 22 }
  ]
}
\`\`\``;
    const spec = parseOrFallbackAIChartSpec(rawAI, "Show scores as a line chart", sampleRows);
    expect(spec.title).toBe("Scores by Candidate");
    expect(spec.chartType).toBe("line");
    expect(spec.xKey).toBe("student");
    expect(spec.data).toHaveLength(2);
  });

  it("falls back gracefully to deterministic custom chart matching user prompt intent", () => {
    const pieSpec = buildFallbackCustomChart("pie chart of candidates by branch", sampleRows);
    expect(pieSpec.chartType).toBe("pie");
    expect(pieSpec.data).toEqual([
      { name: "Computer Science", value: 1 },
      { name: "Electronics", value: 1 },
    ]);

    const proctorBar = parseOrFallbackAIChartSpec("not valid json", "bar chart of tab switches and gadget flags", sampleRows);
    expect(proctorBar.chartType).toBe("bar");
    expect(proctorBar.yKeys.some((k) => k.key === "tabSwitches")).toBe(true);
    expect(proctorBar.yKeys.some((k) => k.key === "gadgetFlags")).toBe(true);
  });
});
