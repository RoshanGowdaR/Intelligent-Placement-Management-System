import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { GlassCard } from "@/components/3d/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileSpreadsheet, Printer, Users, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function CompanyReports() {
  const { user } = useAuth();
  const [company, setCompany] = useState<any>(null);
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
        .select("id, total_score, passed, tab_switches, completed_at, profiles(name, email, usn, branch, cgpa), tests(id, title, scheduled_date, pass_criteria)")
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

  const exportCSV = () => {
    if (reportData.length === 0) {
      toast.error("No data available to export");
      return;
    }

    const headers = ["Candidate Name", "Email", "USN", "Branch", "CGPA", "Assessment Title", "Score (%)", "Status", "Tab Switches", "Submission Date"];
    const rows = reportData.map((r) => [
      `"${r.profiles?.name || ""}"`,
      `"${r.profiles?.email || ""}"`,
      `"${r.profiles?.usn || ""}"`,
      `"${r.profiles?.branch || ""}"`,
      `"${r.profiles?.cgpa || ""}"`,
      `"${r.tests?.title || ""}"`,
      r.total_score,
      r.passed ? "QUALIFIED" : "BELOW_CUTOFF",
      r.tab_switches,
      r.completed_at ? new Date(r.completed_at).toLocaleString() : "",
    ]);

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
          <h1 className="font-display text-3xl font-extrabold text-white">Recruitment Reports</h1>
          <p className="text-sm text-slate-400">
            Export evaluation metrics, candidate qualification logs & audit records for your assessments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={exportCSV} className="h-11 px-5 rounded-xl bg-primary text-white font-bold gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>

          <Button onClick={() => window.print()} variant="outline" className="h-11 px-4 rounded-xl glass-button text-slate-200 border-white/15 gap-2">
            <Printer className="h-4 w-4" /> Print Report
          </Button>
        </div>
      </div>

      {/* Report Table View */}
      <GlassCard className="p-6 border-white/10">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-semibold text-white">
            Assessment Attempts Roster ({reportData.length} records)
          </div>
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
            {company?.name || "Company Portal"}
          </Badge>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mb-2" />
            Generating report…
          </div>
        ) : reportData.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No test submissions found for your company assessments yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-white/5 uppercase text-slate-400 font-semibold border-b border-white/10">
                <tr>
                  <th className="p-3">Candidate</th>
                  <th className="p-3">Branch & CGPA</th>
                  <th className="p-3">Assessment</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Integrity</th>
                  <th className="p-3">Submitted At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 font-medium">
                {reportData.map((row) => (
                  <tr key={row.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-white">{row.profiles?.name || row.profiles?.email}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{row.profiles?.usn || row.profiles?.email}</div>
                    </td>
                    <td className="p-3">
                      <div>{row.profiles?.branch || "B.Tech"}</div>
                      <div className="text-[11px] text-primary font-bold">CGPA: {row.profiles?.cgpa || "N/A"}</div>
                    </td>
                    <td className="p-3 text-white">{row.tests?.title || "Test"}</td>
                    <td className="p-3 font-mono font-bold text-white">{row.total_score}%</td>
                    <td className="p-3">
                      <Badge className={row.passed ? "bg-emerald-500/20 text-emerald-300 text-[10px]" : "bg-destructive/20 text-destructive text-[10px]"}>
                        {row.passed ? "QUALIFIED" : "BELOW CUTOFF"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {row.tab_switches > 0 ? (
                        <span className="text-amber-400 font-bold">{row.tab_switches} Switches</span>
                      ) : (
                        <span className="text-emerald-400 font-bold">Clean</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-400">
                      {row.completed_at ? new Date(row.completed_at).toLocaleDateString() : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

    </div>
  );
}
