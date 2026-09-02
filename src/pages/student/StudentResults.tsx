import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Trophy, TrendingUp, Sparkles, Loader2, Eye, CheckCircle2, XCircle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Attempt = Tables<"test_attempts">;

interface Question {
  id: string;
  type: "mcq" | "coding";
  subject: string;
  topic: string;
  text: string;
  options?: string[];
  correct_answer: string;
  points: number;
}

function ReviewModal({ attempt, questions, onClose }: {
  attempt: Attempt & { test_title: string };
  questions: Question[];
  onClose: () => void;
}) {
  const userAnswers = (attempt.answers as Record<string, string>) ?? {};
  const [explanations, setExplanations] = useState<Record<string, { why_wrong: string; why_right: string }>>({});
  const [loading, setLoading] = useState(true);

  const wrongQuestions = questions.filter((q) => {
    const ua = (userAnswers[q.id] ?? "").trim().toLowerCase();
    return ua !== q.correct_answer.trim().toLowerCase();
  });

  useEffect(() => {
    if (wrongQuestions.length === 0) { setLoading(false); return; }
    const load = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("generate-feedback", {
          body: {
            mode: "explanations",
            questions: wrongQuestions.map((q) => ({
              id: q.id,
              text: q.text,
              options: q.options,
              correct_answer: q.correct_answer,
              user_answer: userAnswers[q.id] ?? "Not answered",
              subject: q.subject,
            })),
          },
        });
        if (!error && data?.explanations) setExplanations(data.explanations);
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, []);

  const optionLabel = (q: Question, letter: string) => {
    if (q.options) {
      const i = letter.charCodeAt(0) - 65;
      return q.options[i] ? `${letter}. ${q.options[i]}` : letter;
    }
    return letter;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background overflow-auto">
      <div className="flex items-center justify-between border-b px-6 py-3">
        <h2 className="font-semibold text-lg">Review: {attempt.test_title}</h2>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="flex gap-4">
            <Card className="flex-1">
              <CardContent className="py-4 text-center">
                <CheckCircle2 className="mx-auto h-6 w-6 text-green-500 mb-1" />
                <p className="text-2xl font-bold text-green-600">{questions.length - wrongQuestions.length}</p>
                <p className="text-xs text-muted-foreground">Correct</p>
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardContent className="py-4 text-center">
                <XCircle className="mx-auto h-6 w-6 text-destructive mb-1" />
                <p className="text-2xl font-bold text-destructive">{wrongQuestions.length}</p>
                <p className="text-xs text-muted-foreground">Incorrect</p>
              </CardContent>
            </Card>
          </div>

          {wrongQuestions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-2" />
                <p className="font-medium">All answers were correct!</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-destructive">Incorrect Answers ({wrongQuestions.length})</h3>
              {wrongQuestions.map((q, idx) => {
                const explanation = explanations[q.id];
                return (
                  <Card key={q.id} className="border-destructive/30">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">Q{idx + 1}</Badge>
                        <Badge variant="secondary">{q.subject}</Badge>
                      </div>
                      <p className="font-medium mt-2">{q.text}</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3">
                        <p className="text-xs font-medium text-destructive mb-1">Your Answer:</p>
                        <p className="text-sm">{optionLabel(q, userAnswers[q.id] ?? "Not answered")}</p>
                      </div>
                      <div className="rounded-md border border-green-500/50 bg-green-500/5 p-3">
                        <p className="text-xs font-medium text-green-600 mb-1">Correct Answer:</p>
                        <p className="text-sm">{optionLabel(q, q.correct_answer)}</p>
                      </div>
                      {loading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> Generating explanation…
                        </div>
                      ) : explanation ? (
                        <div className="space-y-2">
                          <div className="rounded-md bg-muted p-3">
                            <p className="text-xs font-medium text-destructive mb-1">Why your answer is wrong:</p>
                            <p className="text-sm text-muted-foreground">{explanation.why_wrong}</p>
                          </div>
                          <div className="rounded-md bg-muted p-3">
                            <p className="text-xs font-medium text-green-600 mb-1">Why the correct answer is right:</p>
                            <p className="text-sm text-muted-foreground">{explanation.why_right}</p>
                          </div>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StudentResults() {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<(Attempt & { test_title: string; test_questions: Question[] })[]>([]);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [reviewAttempt, setReviewAttempt] = useState<(Attempt & { test_title: string; test_questions: Question[] }) | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [attRes, testRes] = await Promise.all([
        supabase.from("test_attempts").select("*").eq("student_id", user.id).order("created_at", { ascending: false }),
        supabase.from("tests").select("id, title, question_bank"),
      ]);
      const testMap = new Map((testRes.data ?? []).map((t) => [t.id, { title: t.title, questions: (t.question_bank as unknown as Question[]) ?? [] }]));
      setAttempts(
        (attRes.data ?? []).map((a) => ({
          ...a,
          test_title: testMap.get(a.test_id)?.title ?? "Unknown Test",
          test_questions: testMap.get(a.test_id)?.questions ?? [],
        }))
      );
    };
    load();
  }, [user]);

  const generateFeedback = async (attempt: Attempt & { test_title: string }) => {
    setGeneratingFor(attempt.id);
    try {
      const { data, error } = await supabase.functions.invoke("generate-feedback", {
        body: {
          testTitle: attempt.test_title,
          totalScore: attempt.total_score,
          passed: attempt.passed,
          scores: attempt.scores as Record<string, number>,
        },
      });
      if (error) throw error;
      const feedback = data?.feedback || "Unable to generate feedback.";
      await supabase.from("test_attempts").update({ feedback } as Record<string, unknown>).eq("id", attempt.id);
      setAttempts((prev) => prev.map((a) => a.id === attempt.id ? { ...a, feedback } : a));
    } catch { /* silently fail */ }
    setGeneratingFor(null);
  };

  if (reviewAttempt) {
    return (
      <ReviewModal
        attempt={reviewAttempt}
        questions={reviewAttempt.test_questions}
        onClose={() => setReviewAttempt(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Results</h1>
        <p className="text-muted-foreground">View your test scores and AI-powered feedback</p>
      </div>

      {attempts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No test results yet. Take a test to see your scores here.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {attempts.map((a) => {
            const scores = (a.scores as Record<string, number>) ?? {};
            return (
              <Card key={a.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Trophy className="h-4 w-4" />
                      {a.test_title}
                    </CardTitle>
                    <Badge variant={a.passed ? "default" : "destructive"}>
                      {a.passed ? "Passed" : "Failed"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-3xl font-bold">{a.total_score ?? 0}%</span>
                      <p className="text-xs text-muted-foreground">
                        Attempt #{a.attempt_number} · {a.completed_at ? format(new Date(a.completed_at), "MMM d, yyyy h:mm a") : "—"}
                      </p>
                    </div>
                    {a.test_questions.length > 0 && (
                      <Button variant="outline" size="sm" onClick={() => setReviewAttempt(a)}>
                        <Eye className="mr-1 h-4 w-4" /> Review
                      </Button>
                    )}
                  </div>

                  {Object.keys(scores).length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> Subject Breakdown
                      </h4>
                      {Object.entries(scores).map(([subject, score]) => (
                        <div key={subject} className="flex items-center justify-between">
                          <span className="text-sm">{subject}</span>
                          <div className="flex items-center gap-2">
                            <Progress value={score} className="h-2 w-32" />
                            <span className="text-sm font-medium w-10 text-right">{score}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {a.feedback ? (
                    <div className="rounded-lg border p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <h4 className="text-sm font-medium">AI Feedback</h4>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{a.feedback}</p>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateFeedback(a)}
                      disabled={generatingFor === a.id}
                    >
                      {generatingFor === a.id ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…</>
                      ) : (
                        <><Sparkles className="mr-2 h-4 w-4" /> Get AI Feedback</>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
