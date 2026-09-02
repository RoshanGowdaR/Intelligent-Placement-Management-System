import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { CalendarDays, Clock } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Schedule = Tables<"schedules">;
type Test = Tables<"tests">;

export default function StudentSchedule() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<(Schedule & { test: Test | null })[]>([]);
  const [allTests, setAllTests] = useState<Test[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [schedRes, testRes] = await Promise.all([
        supabase.from("schedules").select("*").eq("student_id", user.id).order("created_at", { ascending: false }),
        supabase.from("tests").select("*").order("scheduled_date", { ascending: true }),
      ]);
      const testMap = new Map((testRes.data ?? []).map((t) => [t.id, t]));
      setSchedules(
        (schedRes.data ?? []).map((s) => ({ ...s, test: testMap.get(s.test_id) ?? null }))
      );
      setAllTests(testRes.data ?? []);
    };
    fetch();
  }, [user]);

  const statusVariant = (status: string) => {
    switch (status) {
      case "completed": return "default" as const;
      case "missed": return "destructive" as const;
      default: return "secondary" as const;
    }
  };

  // Show all upcoming tests even if not yet scheduled
  const upcomingTests = allTests.filter((t) => !isPast(new Date(t.scheduled_date)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Schedule</h1>
        <p className="text-muted-foreground">View your upcoming test schedule</p>
      </div>

      {upcomingTests.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Upcoming Tests</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {upcomingTests.map((test) => (
              <Card key={test.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    {test.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Date</span>
                    <span>{format(new Date(test.scheduled_date), "MMM d, yyyy h:mm a")}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Duration</span>
                    <span>{test.duration} min</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-primary">
                    <Clock className="h-3 w-3" />
                    Starts {formatDistanceToNow(new Date(test.scheduled_date), { addSuffix: true })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">My Registrations</h2>
        {schedules.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No registrations yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {schedules.map((s) => (
              <Card key={s.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{s.test?.title ?? "Unknown Test"}</p>
                    <p className="text-sm text-muted-foreground">
                      {s.test ? format(new Date(s.test.scheduled_date), "MMM d, yyyy h:mm a") : "—"}
                    </p>
                  </div>
                  <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
