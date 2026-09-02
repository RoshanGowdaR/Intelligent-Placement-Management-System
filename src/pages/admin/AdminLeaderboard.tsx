import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StudentScore {
  studentId: string;
  name: string;
  email: string;
  totalScore: number;
  testsAttempted: number;
  avgScore: number;
  passRate: number;
  cgpa: number | null;
}

export default function AdminLeaderboard() {
  const [attempts, setAttempts] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [filterCompany, setFilterCompany] = useState("all");
  const [filterTest, setFilterTest] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [attRes, profRes, testRes, compRes] = await Promise.all([
        supabase.from("test_attempts").select("*"),
        supabase.from("profiles").select("id, name, email, cgpa"),
        supabase.from("tests").select("id, title, company_id"),
        supabase.from("companies").select("id, name"),
      ]);
      setAttempts(attRes.data ?? []);
      setProfiles(profRes.data ?? []);
      setTests(testRes.data ?? []);
      setCompanies(compRes.data ?? []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredTestIds = useMemo(() => {
    let filtered = tests;
    if (filterCompany !== "all") {
      filtered = filtered.filter((t) => t.company_id === filterCompany);
    }
    if (filterTest !== "all") {
      filtered = filtered.filter((t) => t.id === filterTest);
    }
    return new Set(filtered.map((t) => t.id));
  }, [tests, filterCompany, filterTest]);

  const availableTests = useMemo(() => {
    if (filterCompany === "all") return tests;
    return tests.filter((t) => t.company_id === filterCompany);
  }, [tests, filterCompany]);

  const leaderboard: StudentScore[] = useMemo(() => {
    const profileMap = new Map(profiles.map((p) => [p.id, p]));
    const filtered = attempts.filter((a) => filteredTestIds.has(a.test_id));

    const studentMap = new Map<string, { totalScore: number; count: number; passed: number }>();
    filtered.forEach((a) => {
      const entry = studentMap.get(a.student_id) ?? { totalScore: 0, count: 0, passed: 0 };
      entry.totalScore += Number(a.total_score ?? 0);
      entry.count += 1;
      if (a.passed) entry.passed += 1;
      studentMap.set(a.student_id, entry);
    });

    return Array.from(studentMap.entries())
      .map(([studentId, stats]) => {
        const profile = profileMap.get(studentId);
        return {
          studentId,
          name: profile?.name ?? "Unknown",
          email: profile?.email ?? "",
          totalScore: stats.totalScore,
          testsAttempted: stats.count,
          avgScore: Math.round(stats.totalScore / stats.count),
          passRate: Math.round((stats.passed / stats.count) * 100),
          cgpa: profile?.cgpa ? Number(profile.cgpa) : null,
        };
      })
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [attempts, profiles, filteredTestIds]);

  const exportCSV = () => {
    if (leaderboard.length === 0) return;
    const headers = ["Rank", "Name", "Email", "Avg Score", "Tests Attempted", "Pass Rate (%)", "CGPA"];
    const rows = leaderboard.map((s, i) => [
      i + 1, `"${s.name}"`, `"${s.email}"`, s.avgScore, s.testsAttempted, s.passRate, s.cgpa?.toFixed(2) ?? "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leaderboard.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const RankIcon = ({ rank }: { rank: number }) => {
    if (rank === 1) return <Trophy className="h-5 w-5" style={{ color: "hsl(38, 92%, 50%)" }} />;
    if (rank === 2) return <Medal className="h-5 w-5 text-muted-foreground" />;
    if (rank === 3) return <Award className="h-5 w-5" style={{ color: "hsl(25, 75%, 47%)" }} />;
    return <span className="text-sm font-medium text-muted-foreground">{rank}</span>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground">Top-performing students across all tests</p>
      </div>

      <div className="flex flex-wrap gap-4">
        <Select value={filterCompany} onValueChange={(v) => { setFilterCompany(v); setFilterTest("all"); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterTest} onValueChange={setFilterTest}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by test" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tests</SelectItem>
            {availableTests.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={exportCSV} disabled={leaderboard.length === 0}>
          <Download className="mr-1 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {leaderboard.slice(0, 3).map((s, i) => (
          <Card key={s.studentId} className={i === 0 ? "border-primary/50 bg-primary/5" : ""}>
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <RankIcon rank={i + 1} />
              <div>
                <CardTitle className="text-base">{s.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{s.email}</p>
              </div>
            </CardHeader>
            <CardContent className="flex items-center gap-4 text-sm">
              <div><span className="font-semibold">{s.avgScore}</span> <span className="text-muted-foreground">avg</span></div>
              <div><span className="font-semibold">{s.passRate}%</span> <span className="text-muted-foreground">pass</span></div>
              <div><span className="font-semibold">{s.testsAttempted}</span> <span className="text-muted-foreground">tests</span></div>
              {s.cgpa && <Badge variant="secondary">CGPA {s.cgpa.toFixed(2)}</Badge>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Student</TableHead>
                <TableHead className="text-right">Avg Score</TableHead>
                <TableHead className="text-right">Tests</TableHead>
                <TableHead className="text-right">Pass Rate</TableHead>
                <TableHead className="text-right">CGPA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : leaderboard.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No attempts found</TableCell></TableRow>
              ) : (
                leaderboard.map((s, i) => (
                  <TableRow key={s.studentId}>
                    <TableCell><RankIcon rank={i + 1} /></TableCell>
                    <TableCell>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.email}</div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{s.avgScore}</TableCell>
                    <TableCell className="text-right">{s.testsAttempted}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={s.passRate >= 70 ? "default" : s.passRate >= 50 ? "secondary" : "destructive"}>
                        {s.passRate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{s.cgpa?.toFixed(2) ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
