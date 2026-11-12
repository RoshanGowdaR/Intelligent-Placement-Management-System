import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ScatterChart, Scatter, ZAxis
} from "recharts";
import { BarChart3, PieChart as PieChartIcon, Sparkles, SlidersHorizontal, X, CheckSquare, Loader2, Wand2 } from "lucide-react";
import {
  buildAIChartSystemPrompt,
  computeReportVisualizationData,
  parseOrFallbackAIChartSpec,
  VISUALIZATION_OPTIONS,
  type CustomAIChartSpec,
  type VisualizableReportRow,
  type VisualizationId,
} from "@/lib/reportVisualizations";
import { askGemini } from "@/lib/gemini";
import { toast } from "sonner";

interface ReportVisualizationsSectionProps {
  rows: VisualizableReportRow[];
  reportLabel?: string;
}

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  borderColor: "hsl(var(--border))",
  borderRadius: "12px",
  color: "hsl(var(--foreground))",
  fontSize: "12px",
};

const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

const AI_CHART_SUGGESTIONS = [
  "Bar chart comparing tab switches and gadget flags per student",
  "Pie chart of candidate distribution by branch",
  "Line chart of top candidate scores and earned marks",
  "Scatter plot comparing tab switches vs score percentage",
];

function CustomAIChartRenderer({ spec }: { spec: CustomAIChartSpec }) {
  if (spec.chartType === "pie") {
    const valKey = spec.yKeys[0]?.key || "value";
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={spec.data}
            dataKey={valKey}
            nameKey={spec.xKey}
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={86}
            paddingAngle={3}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {spec.data.map((_, idx) => (
              <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (spec.chartType === "line") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={spec.data} margin={{ top: 10, right: 16, left: -10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
          <XAxis dataKey={spec.xKey} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          {spec.yKeys.map((series) => (
            <Line
              key={series.key}
              type="monotone"
              dataKey={series.key}
              name={series.label}
              stroke={series.color}
              strokeWidth={2.5}
              dot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (spec.chartType === "area") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={spec.data} margin={{ top: 10, right: 16, left: -10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
          <XAxis dataKey={spec.xKey} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          {spec.yKeys.map((series) => (
            <Area
              key={series.key}
              type="monotone"
              dataKey={series.key}
              name={series.label}
              stroke={series.color}
              fill={series.color}
              fillOpacity={0.22}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (spec.chartType === "scatter") {
    const yKey = spec.yKeys[0]?.key || "scorePct";
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
          <XAxis type="number" dataKey={spec.xKey} name={spec.xKey} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis type="number" dataKey={yKey} name={spec.yKeys[0]?.label || yKey} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <ZAxis range={[60, 120]} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={TOOLTIP_STYLE} />
          <Scatter name={spec.title} data={spec.data} fill={spec.yKeys[0]?.color || "#6366f1"} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={spec.data} margin={{ top: 10, right: 16, left: -10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
        <XAxis dataKey={spec.xKey} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: "12px" }} />
        {spec.yKeys.map((series) => (
          <Bar key={series.key} dataKey={series.key} name={series.label} fill={series.color} radius={[6, 6, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ReportVisualizationsSection({ rows, reportLabel }: ReportVisualizationsSectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedCharts, setSelectedCharts] = useState<VisualizationId[]>([]);
  const [pendingCharts, setPendingCharts] = useState<VisualizationId[]>(["pass_fail", "score_bins", "branch_perf"]);
  const [showVisualizations, setShowVisualizations] = useState(false);

  // Ask AI for custom visualizations
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [customAICharts, setCustomAICharts] = useState<CustomAIChartSpec[]>([]);

  const data = useMemo(() => computeReportVisualizationData(rows), [rows]);

  if (rows.length === 0) return null;

  const openPicker = () => {
    setPendingCharts(
      selectedCharts.length > 0 ? selectedCharts : ["pass_fail", "score_bins", "branch_perf"]
    );
    setPickerOpen(true);
  };

  const toggleChart = (id: VisualizationId) => {
    setPendingCharts((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleApplySelection = () => {
    if (pendingCharts.length === 0 && customAICharts.length === 0) {
      toast.error("Please select at least one chart or use Ask AI to generate a custom visualization.");
      return;
    }
    setSelectedCharts(pendingCharts);
    setShowVisualizations(true);
    setPickerOpen(false);
  };

  const handleHideVisualizations = () => {
    setShowVisualizations(false);
  };

  const handleGenerateAIChart = async () => {
    const cleanPrompt = aiPrompt.trim();
    if (!cleanPrompt) {
      toast.error("Please describe the chart or visualization you want.");
      return;
    }

    setAiGenerating(true);
    try {
      let spec: CustomAIChartSpec;
      try {
        const systemPrompt = buildAIChartSystemPrompt(rows);
        const rawText = await askGemini(cleanPrompt, systemPrompt);
        spec = parseOrFallbackAIChartSpec(rawText, cleanPrompt, rows);
      } catch {
        spec = parseOrFallbackAIChartSpec("", cleanPrompt, rows);
      }

      setCustomAICharts((prev) => [spec, ...prev]);
      setShowVisualizations(true);
      setAiDialogOpen(false);
      setPickerOpen(false);
      setAiPrompt("");
      toast.success(`Generated custom visualization: "${spec.title}"`);
    } finally {
      setAiGenerating(false);
    }
  };

  const totalShownCount =
    (showVisualizations ? selectedCharts.length : 0) + (showVisualizations ? customAICharts.length : 0);

  return (
    <div className="space-y-4">
      {/* Visualization Trigger Bar directly below Report Table — left-aligned actions avoid overlapping bottom-right Admin AI pill */}
      <Card className="border-primary/20 bg-card/80 backdrop-blur-sm">
        <CardContent className="flex flex-col gap-3.5 py-4 px-5 sm:pr-52">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/25 shrink-0">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Visual Analytics for Above Report
              </h3>
              <p className="text-xs text-muted-foreground">
                {showVisualizations && totalShownCount > 0
                  ? `Showing ${totalShownCount} visualization${totalShownCount > 1 ? "s" : ""} built from ${rows.length} report record${rows.length > 1 ? "s" : ""}.`
                  : `Generate custom charts or ask AI for tailored visualizations using the ${rows.length} candidate record${rows.length > 1 ? "s" : ""} above.`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={openPicker}
              className="text-xs h-9 font-bold gap-1.5 shadow-sm"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {showVisualizations ? "Select / Change Charts" : "Visualize Report"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAiDialogOpen(true)}
              className="text-xs h-9 font-semibold gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Ask AI for More
            </Button>
            {showVisualizations && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleHideVisualizations}
                className="text-xs h-9 gap-1.5 text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" /> Hide Charts
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rendered Visualizations Grid */}
      {showVisualizations && totalShownCount > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {customAICharts.map((spec) => (
            <Card key={spec.id} className="border-primary/30">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary shrink-0" />
                      <span>{spec.title}</span>
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        AI {spec.chartType}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs">{spec.subtitle}</CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => setCustomAICharts((prev) => prev.filter((c) => c.id !== spec.id))}
                    title="Remove AI chart"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="h-[280px]">
                <CustomAIChartRenderer spec={spec} />
              </CardContent>
            </Card>
          ))}

          {selectedCharts.includes("pass_fail") && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4 text-primary" /> Pass vs. Fail Distribution
                  </CardTitle>
                  <Badge variant="outline" className="text-[11px]">
                    {data.total > 0 ? Math.round((data.passedCount / data.total) * 100) : 0}% Pass Rate
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  {data.passedCount} passed · {data.failedCount} failed {reportLabel ? `(${reportLabel})` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[270px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.passFailData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={88}
                      paddingAngle={4}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {data.passFailData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {selectedCharts.includes("score_bins") && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> Score Distribution Histogram
                </CardTitle>
                <CardDescription className="text-xs">
                  Number of candidates in each score percentage band
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[270px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.scoreBinsData} margin={{ top: 10, right: 16, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis dataKey="range" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="candidates" name="Candidates" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {selectedCharts.includes("branch_perf") && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> Branch-Wise Performance
                </CardTitle>
                <CardDescription className="text-xs">
                  Average assessment score (%) and pass rate (%) by branch
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.branchPerfData} margin={{ top: 10, right: 16, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis dataKey="branch" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar dataKey="avgScore" name="Avg Score (%)" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="passRate" name="Pass Rate (%)" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {selectedCharts.includes("candidate_scores") && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> Candidate Score Comparison
                </CardTitle>
                <CardDescription className="text-xs">
                  Top {data.candidateScoresData.length} candidate scores (%) sorted highest to lowest
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.candidateScoresData} margin={{ top: 10, right: 16, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis
                      dataKey="name"
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={50}
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(value: any) => [`${value}%`, "Score"]}
                      labelFormatter={(_, payload) => {
                        const item = payload?.[0]?.payload;
                        return item ? `${item.fullName} (${item.usn})` : "";
                      }}
                    />
                    <Bar dataKey="score" name="Score (%)" radius={[6, 6, 0, 0]}>
                      {data.candidateScoresData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.passed ? "#10b981" : "#f43f5e"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {selectedCharts.includes("proctor_integrity") && (
            <Card className={data.proctorEventBreakdown.length > 0 ? "lg:col-span-2" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Proctoring &amp; Integrity Breakdown
                </CardTitle>
                <CardDescription className="text-xs">
                  Attempt integrity status distribution and flagged violation events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`grid gap-4 ${data.proctorEventBreakdown.length > 0 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.proctorStatusData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={82}
                          paddingAngle={3}
                        >
                          {data.proctorStatusData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Legend wrapperStyle={{ fontSize: "12px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {data.proctorEventBreakdown.length > 0 && (
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.proctorEventBreakdown} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                          <YAxis type="category" dataKey="type" width={135} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                          <Bar dataKey="count" name="Occurrences" fill="#f59e0b" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {selectedCharts.includes("cgpa_vs_score") && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> CGPA vs. Assessment Score Correlation
                </CardTitle>
                <CardDescription className="text-xs">
                  Each point plots a candidate&apos;s CGPA against their test percentage
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[270px]">
                {data.cgpaScatterData.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-xs text-muted-foreground text-center px-4">
                    No CGPA values recorded for the candidates in this report yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis type="number" dataKey="cgpa" name="CGPA" domain={[4, 10]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis type="number" dataKey="score" name="Score" unit="%" domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <ZAxis range={[60, 120]} />
                      <Tooltip
                        cursor={{ strokeDasharray: "3 3" }}
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(value: any, name: string) => [name === "Score" ? `${value}%` : value, name]}
                      />
                      <Scatter name="Candidates" data={data.cgpaScatterData} fill="#6366f1" />
                    </ScatterChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          )}

          {selectedCharts.includes("attempt_outcomes") && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> Attempt &amp; Retake Breakdown
                </CardTitle>
                <CardDescription className="text-xs">
                  Total attempts vs. passed candidates grouped by attempt number
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[270px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.attemptOutcomesData} margin={{ top: 10, right: 16, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis dataKey="attempt" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar dataKey="total" name="Total Attempts" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="passed" name="Passed" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Chart Selection Modal (with Ask AI for More shortcut) */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <BarChart3 className="h-5 w-5 text-primary" /> Choose Visualizations for Your Report
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select the charts and visualizations you want to generate from the {rows.length} candidate records in the report above, or ask AI for custom charts.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 pb-2 border-b">
            <span className="text-xs text-muted-foreground font-medium">
              Selected: <strong className="text-foreground">{pendingCharts.length}</strong> of {VISUALIZATION_OPTIONS.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10"
                onClick={() => {
                  setPickerOpen(false);
                  setAiDialogOpen(true);
                }}
              >
                <Sparkles className="h-3.5 w-3.5" /> Ask AI for More
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setPendingCharts(VISUALIZATION_OPTIONS.map((o) => o.id))}
              >
                <CheckSquare className="h-3.5 w-3.5" /> Select All
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setPendingCharts([])}
              >
                Clear
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            {VISUALIZATION_OPTIONS.map((opt) => {
              const checked = pendingCharts.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleChart(opt.id)}
                  className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${
                    checked
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border bg-card hover:bg-muted/50"
                  }`}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleChart(opt.id)}
                    className="mt-0.5 pointer-events-none"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-foreground">{opt.title}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {opt.chartType}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {opt.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setPickerOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApplySelection}
              disabled={pendingCharts.length === 0 && customAICharts.length === 0}
              className="font-bold gap-1.5"
            >
              <BarChart3 className="h-4 w-4" />
              Show Selected Visualizations ({pendingCharts.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ask AI for Custom Visualizations Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Sparkles className="h-5 w-5 text-primary" /> Ask AI for Custom Visualization
            </DialogTitle>
            <DialogDescription className="text-xs">
              Describe what chart type and metrics you want from the {rows.length} candidate results above, and AI will generate it automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <Textarea
              placeholder="e.g., Create a bar chart comparing tab switches and gadget flags per student, or a pie chart of candidates by branch..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={3}
              className="text-xs rounded-xl"
            />

            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground">Try an example:</span>
              <div className="flex flex-wrap gap-1.5">
                {AI_CHART_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setAiPrompt(suggestion)}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-muted/40 hover:bg-primary/10 hover:border-primary/40 text-foreground transition-colors text-left"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setAiDialogOpen(false)} disabled={aiGenerating}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleGenerateAIChart}
              disabled={!aiPrompt.trim() || aiGenerating}
              className="font-bold gap-1.5"
            >
              {aiGenerating ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Generating Chart…</>
              ) : (
                <><Wand2 className="h-4 w-4" /> Generate AI Visualization</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
