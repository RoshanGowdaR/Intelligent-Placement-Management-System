import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ScatterChart, Scatter, ZAxis
} from "recharts";
import { BarChart3, PieChart as PieChartIcon, Sparkles, SlidersHorizontal, X, CheckSquare } from "lucide-react";
import {
  computeReportVisualizationData,
  VISUALIZATION_OPTIONS,
  type VisualizableReportRow,
  type VisualizationId,
} from "@/lib/reportVisualizations";
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

export function ReportVisualizationsSection({ rows, reportLabel }: ReportVisualizationsSectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedCharts, setSelectedCharts] = useState<VisualizationId[]>([]);
  const [pendingCharts, setPendingCharts] = useState<VisualizationId[]>(["pass_fail", "score_bins", "branch_perf"]);
  const [showVisualizations, setShowVisualizations] = useState(false);

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
    if (pendingCharts.length === 0) {
      toast.error("Please select at least one chart or visualization to display.");
      return;
    }
    setSelectedCharts(pendingCharts);
    setShowVisualizations(true);
    setPickerOpen(false);
  };

  const handleHideVisualizations = () => {
    setShowVisualizations(false);
  };

  return (
    <div className="space-y-4">
      {/* Visualization Trigger Bar directly below the Report Table */}
      <Card className="border-primary/20 bg-card/80 backdrop-blur-sm">
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-4 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/25 shrink-0">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Visual Analytics for Above Report
              </h3>
              <p className="text-xs text-muted-foreground">
                {showVisualizations && selectedCharts.length > 0
                  ? `Showing ${selectedCharts.length} selected visualization${selectedCharts.length > 1 ? "s" : ""} built from ${rows.length} report record${rows.length > 1 ? "s" : ""}.`
                  : `Generate custom charts from the ${rows.length} candidate record${rows.length > 1 ? "s" : ""} shown above.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {showVisualizations && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleHideVisualizations}
                className="text-xs h-9 gap-1.5"
              >
                <X className="h-3.5 w-3.5" /> Hide Charts
              </Button>
            )}
            <Button
              size="sm"
              onClick={openPicker}
              className="text-xs h-9 font-bold gap-1.5 shadow-sm"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {showVisualizations ? "Select / Change Charts" : "Visualize Report"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rendered Visualizations Grid */}
      {showVisualizations && selectedCharts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
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

      {/* Chart Selection Modal */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <BarChart3 className="h-5 w-5 text-primary" /> Choose Visualizations for Your Report
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select the charts and visualizations you want to generate from the {rows.length} candidate records in the report above.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between pt-1 pb-2 border-b">
            <span className="text-xs text-muted-foreground font-medium">
              Selected: <strong className="text-foreground">{pendingCharts.length}</strong> of {VISUALIZATION_OPTIONS.length}
            </span>
            <div className="flex items-center gap-2">
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
              disabled={pendingCharts.length === 0}
              className="font-bold gap-1.5"
            >
              <BarChart3 className="h-4 w-4" />
              Show Selected Visualizations ({pendingCharts.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
