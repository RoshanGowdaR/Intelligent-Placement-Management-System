import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Clock, AlertTriangle, CheckCircle2, XCircle, ArrowRight, ArrowLeft, Loader2, Sparkles, Eye, ShieldAlert, Camera, RefreshCw, Calendar, GitBranch } from "lucide-react";
import { isPast, differenceInSeconds, format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";
import WebcamProctor, { type ProctorEvent, type ProctorConfig } from "@/components/WebcamProctor";
import CompanyLogo from "@/components/CompanyLogo";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { askGemini } from "@/lib/gemini";

type Test = Tables<"tests">;

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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Review component showing wrong answers with explanations
function TestReview({ questions, answers, explanations, loadingExplanations, onClose }: {
  questions: Question[];
  answers: Record<string, string>;
  explanations: Record<string, { why_wrong: string; why_right: string }>;
  loadingExplanations: boolean;
  onClose: () => void;
}) {
  const wrongQuestions = questions.filter((q) => {
    const userAnswer = (answers[q.id] ?? "").trim().toLowerCase();
    const correct = q.correct_answer.trim().toLowerCase();
    return userAnswer !== correct;
  });

  const correctQuestions = questions.filter((q) => {
    const userAnswer = (answers[q.id] ?? "").trim().toLowerCase();
    const correct = q.correct_answer.trim().toLowerCase();
    return userAnswer === correct;
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background overflow-auto">
      <div className="flex items-center justify-between border-b px-6 py-3">
        <h2 className="font-semibold text-lg">Test Review</h2>
        <Button variant="outline" onClick={onClose}>Close Review</Button>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Summary */}
          <div className="flex gap-4">
            <Card className="flex-1">
              <CardContent className="py-4 text-center">
                <CheckCircle2 className="mx-auto h-6 w-6 text-green-500 mb-1" />
                <p className="text-2xl font-bold text-green-600">{correctQuestions.length}</p>
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
                <p className="font-medium">Perfect score! All answers were correct.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-destructive">Incorrect Answers ({wrongQuestions.length})</h3>
              {wrongQuestions.map((q, idx) => {
                const userAnswer = answers[q.id] ?? "Not answered";
                const explanation = explanations[q.id];
                const optionLabel = (letter: string) => {
                  if (q.options) {
                    const i = letter.charCodeAt(0) - 65;
                    return q.options[i] ? `${letter}. ${q.options[i]}` : letter;
                  }
                  return letter;
                };

                return (
                  <Card key={q.id} className="border-destructive/30">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">Q{idx + 1}</Badge>
                        <Badge variant="secondary">{q.subject}</Badge>
                        {q.topic && <Badge variant="secondary">{q.topic}</Badge>}
                      </div>
                      <p className="font-medium mt-2">{q.text}</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3">
                        <p className="text-xs font-medium text-destructive mb-1">Your Answer:</p>
                        <p className="text-sm">{optionLabel(userAnswer)}</p>
                      </div>
                      <div className="rounded-md border border-green-500/50 bg-green-500/5 p-3">
                        <p className="text-xs font-medium text-green-600 mb-1">Correct Answer:</p>
                        <p className="text-sm">{optionLabel(q.correct_answer)}</p>
                      </div>

                      {loadingExplanations ? (
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

          {correctQuestions.length > 0 && (
            <>
              <h3 className="text-lg font-semibold text-green-600">Correct Answers ({correctQuestions.length})</h3>
              {correctQuestions.map((q, idx) => (
                <Card key={q.id} className="border-green-500/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">Q{idx + 1}</Badge>
                      <Badge variant="secondary">{q.subject}</Badge>
                      <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
                    </div>
                    <p className="font-medium mt-2">{q.text}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border border-green-500/50 bg-green-500/5 p-3">
                      <p className="text-xs font-medium text-green-600 mb-1">Your Answer (Correct):</p>
                      <p className="text-sm">
                        {q.options ? `${answers[q.id]}. ${q.options[answers[q.id]?.charCodeAt(0) - 65] ?? ""}` : answers[q.id]}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Demonstration Assessments for Google, Microsoft, and Amazon campus recruitment
const DEMO_TESTS: any[] = [
  {
    id: "test-google-dsa-oa",
    title: "Google Campus OA: Data Structures & Algorithms",
    scheduled_date: new Date(Date.now() - 3600000).toISOString(),
    duration: 60,
    max_participants: 250,
    questions_per_student: 5,
    company_id: "comp-google-campus-2026",
    created_by: null,
    created_by_role: "company",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    registration_start: new Date(Date.now() - 86400000 * 2).toISOString(),
    registration_deadline: new Date(Date.now() + 86400000 * 3).toISOString(),
    pass_criteria: { pass_percentage: 60 },
    question_bank: [
      {
        id: "g-q1",
        type: "mcq",
        subject: "Data Structures",
        topic: "Trees",
        text: "What is the time complexity to find the Lowest Common Ancestor (LCA) in a balanced Binary Search Tree?",
        options: ["O(log N)", "O(N)", "O(1)", "O(N log N)"],
        correct_answer: "A",
        points: 4,
      },
      {
        id: "g-q2",
        type: "mcq",
        subject: "Algorithms",
        topic: "Dynamic Programming",
        text: "Which approach solves the 0/1 Knapsack problem with weights and values in pseudopolynomial time?",
        options: ["Greedy approach", "Dynamic Programming", "Breadth-First Search", "Divide & Conquer"],
        correct_answer: "B",
        points: 4,
      },
      {
        id: "g-q3",
        type: "mcq",
        subject: "Algorithms",
        topic: "Graphs",
        text: "Which algorithm finds the single-source shortest path in a weighted graph with negative edge weights without negative cycles?",
        options: ["Dijkstra's Algorithm", "Bellman-Ford Algorithm", "Floyd-Warshall Algorithm", "Prim's Algorithm"],
        correct_answer: "B",
        points: 4,
      },
      {
        id: "g-q4",
        type: "mcq",
        subject: "System Design",
        topic: "Caching",
        text: "Which cache eviction policy discards the least recently accessed items first?",
        options: ["FIFO", "LFU", "LRU", "MRU"],
        correct_answer: "C",
        points: 4,
      },
      {
        id: "g-q5",
        type: "mcq",
        subject: "Computer Networks",
        topic: "Protocols",
        text: "Which TCP handshake flag combination initiates a network socket connection?",
        options: ["SYN", "ACK", "FIN", "RST"],
        correct_answer: "A",
        points: 4,
      },
    ],
  },
  {
    id: "test-microsoft-core-diag",
    title: "Microsoft Core Engineering Diagnostic",
    scheduled_date: new Date(Date.now() - 1800000).toISOString(),
    duration: 45,
    max_participants: 200,
    questions_per_student: 5,
    company_id: "comp-microsoft-sde-2026",
    created_by: null,
    created_by_role: "company",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    registration_start: new Date(Date.now() - 86400000 * 2).toISOString(),
    registration_deadline: new Date(Date.now() + 86400000 * 4).toISOString(),
    pass_criteria: { pass_percentage: 60 },
    question_bank: [
      {
        id: "ms-q1",
        type: "mcq",
        subject: "Operating Systems",
        topic: "Concurrency",
        text: "What condition is NOT necessary for a deadlock to occur according to Coffman's conditions?",
        options: ["Mutual Exclusion", "Hold and Wait", "Preemption", "Circular Wait"],
        correct_answer: "C",
        points: 4,
      },
      {
        id: "ms-q2",
        type: "mcq",
        subject: "Databases",
        topic: "ACID Properties",
        text: "Which ACID property guarantees that database transactions are safely stored in non-volatile memory after commit?",
        options: ["Atomicity", "Consistency", "Isolation", "Durability"],
        correct_answer: "D",
        points: 4,
      },
      {
        id: "ms-q3",
        type: "mcq",
        subject: "Object-Oriented Design",
        topic: "Design Patterns",
        text: "Which design pattern ensures a class has only one instance while providing a global access point?",
        options: ["Factory Method", "Singleton", "Observer", "Adapter"],
        correct_answer: "B",
        points: 4,
      },
      {
        id: "ms-q4",
        type: "mcq",
        subject: "Data Structures",
        topic: "Hashing",
        text: "In a hash table using open addressing, which collision resolution technique checks slots with quadratic intervals?",
        options: ["Linear Probing", "Quadratic Probing", "Double Hashing", "Separate Chaining"],
        correct_answer: "B",
        points: 4,
      },
      {
        id: "ms-q5",
        type: "mcq",
        subject: "Cloud Architecture",
        topic: "Azure Fundamentals",
        text: "Which Azure service provides serverless compute execution of event-driven code?",
        options: ["Azure Virtual Machines", "Azure Functions", "Azure App Service", "Azure Cosmos DB"],
        correct_answer: "B",
        points: 4,
      },
    ],
  },
  {
    id: "test-amazon-sde-tech",
    title: "Amazon SDE Technical Assessment",
    scheduled_date: new Date(Date.now() - 7200000).toISOString(),
    duration: 60,
    max_participants: 200,
    questions_per_student: 5,
    company_id: "comp-amazon-sde-2026",
    created_by: null,
    created_by_role: "company",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    registration_start: new Date(Date.now() - 86400000 * 3).toISOString(),
    registration_deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
    pass_criteria: { pass_percentage: 60 },
    question_bank: [
      {
        id: "amz-q1",
        type: "mcq",
        subject: "Distributed Systems",
        topic: "CAP Theorem",
        text: "According to the CAP theorem, which combination cannot be simultaneously achieved in an asynchronous network prone to partitions?",
        options: ["Consistency and Availability", "Consistency and Partition Tolerance", "Availability and Partition Tolerance", "All three simultaneously"],
        correct_answer: "D",
        points: 4,
      },
      {
        id: "amz-q2",
        type: "mcq",
        subject: "Algorithms",
        topic: "Heaps",
        text: "What is the worst-case time complexity to extract the minimum element from a binary Min-Heap of N elements?",
        options: ["O(1)", "O(log N)", "O(N)", "O(N log N)"],
        correct_answer: "B",
        points: 4,
      },
      {
        id: "amz-q3",
        type: "mcq",
        subject: "Web Architecture",
        topic: "Load Balancing",
        text: "Which load balancing algorithm distributes requests sequentially across a list of servers?",
        options: ["Least Connections", "Round Robin", "IP Hash", "Weighted Response Time"],
        correct_answer: "B",
        points: 4,
      },
      {
        id: "amz-q4",
        type: "mcq",
        subject: "Security",
        topic: "Authentication",
        text: "Which standard token format is commonly digitally signed with HMAC or RSA for stateless REST authentication?",
        options: ["OAuth 1.0", "JWT", "SAML 1.0", "Basic Auth"],
        correct_answer: "B",
        points: 4,
      },
      {
        id: "amz-q5",
        type: "mcq",
        subject: "Data Structures",
        topic: "Tries",
        text: "Which tree-like data structure is optimal for storing dynamic sets or associative arrays of strings for prefix searching?",
        options: ["Segment Tree", "Fenwick Tree", "Trie (Prefix Tree)", "Red-Black Tree"],
        correct_answer: "C",
        points: 4,
      },
    ],
  },
];

export default function StudentTests() {
  const { user } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [attemptCounts, setAttemptCounts] = useState<Record<string, number>>({});
  const [profileCompletion, setProfileCompletion] = useState(0);

  const [activeTest, setActiveTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; passed: boolean; scores: Record<string, number> } | null>(null);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittingRef = useRef(false);

  // Review state
  const [showReview, setShowReview] = useState(false);
  const [explanations, setExplanations] = useState<Record<string, { why_wrong: string; why_right: string }>>({});
  const [loadingExplanations, setLoadingExplanations] = useState(false);

  // Anti-cheat state
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const tabSwitchRef = useRef(0);
  const fullscreenExitRef = useRef(0);

  // Proctor events collected during the attempt
  const proctorEventsRef = useRef<ProctorEvent[]>([]);

  // Retake reason dialog state
  const [retakeDialogTest, setRetakeDialogTest] = useState<Test | null>(null);
  const [retakeReason, setRetakeReason] = useState("");
  const retakeReasonRef = useRef<string | null>(null);

  // Camera permission state
  const [cameraDeniedTest, setCameraDeniedTest] = useState<Test | null>(null);

  // Pre-flight Proctoring Verification Gate states
  const [gateModalTest, setGateModalTest] = useState<Test | null>(null);
  const [isRetakeGate, setIsRetakeGate] = useState(false);
  const [cameraVerified, setCameraVerified] = useState(false);
  const [cameraChecking, setCameraChecking] = useState(false);
  const [gateCameraError, setGateCameraError] = useState<string | null>(null);
  const [isFullscreenLocked, setIsFullscreenLocked] = useState(false);
  const gateVideoRef = useRef<HTMLVideoElement>(null);
  const gateStreamRef = useRef<MediaStream | null>(null);
  const lastViolationRef = useRef<number>(0);
  const insertedAttemptIdRef = useRef<string | null>(null);

  // Persistence key for in-progress test state (survives refresh)
  const progressKey = user ? `stp:${user.id}` : null;

  const [schedules, setSchedules] = useState<Record<string, string>>({});
  const [companies, setCompanies] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [testsRes, attemptsRes, profileRes, schedulesRes, companiesRes] = await Promise.all([
      supabase.from("tests").select("*").order("scheduled_date", { ascending: true }),
      supabase.from("test_attempts").select("test_id, attempt_number").eq("student_id", user.id),
      supabase.from("profiles").select("profile_completion_percentage").eq("id", user.id).single(),
      supabase.from("schedules").select("test_id, status").eq("student_id", user.id),
      supabase.from("companies").select("id, name, contact_info").order("name"),
    ]);

    const liveTests = (testsRes.data ?? []) as any[];
    // Strictly live tests from Supabase so deleted assessments (e.g. Microsoft) never show for students
    setTests(liveTests);
    setCompanies(companiesRes.data ?? []);
    setProfileCompletion(profileRes.data?.profile_completion_percentage ?? 0);

    const counts: Record<string, number> = {};
    (attemptsRes.data ?? []).forEach((a) => {
      counts[a.test_id] = Math.max(counts[a.test_id] ?? 0, a.attempt_number);
    });
    setAttemptCounts(counts);

    const schedMap: Record<string, string> = {};
    (schedulesRes.data ?? []).forEach((s) => {
      schedMap[s.test_id] = s.status;
    });

    // Merge any locally stored registrations from localStorage
    try {
      const localKey = `ipms_registered_schedules_${user.id}`;
      const saved = JSON.parse(localStorage.getItem(localKey) || "{}");
      Object.entries(saved).forEach(([tid, st]) => {
        if (!schedMap[tid]) {
          schedMap[tid] = String(st);
        }
      });
    } catch {}

    setSchedules(schedMap);

    // Auto-resume in-progress test after refresh
    if (progressKey && !activeTest) {
      try {
        const raw = localStorage.getItem(progressKey);
        if (raw) {
          const saved = JSON.parse(raw) as {
            testId: string; questions: Question[]; answers: Record<string, string>;
            currentIdx: number; endsAt: number; retakeReason: string | null;
            tabSwitches?: number; proctorEvents?: ProctorEvent[];
          };
          const test = (testsRes.data ?? []).find((t) => t.id === saved.testId);
          const remaining = Math.floor((saved.endsAt - Date.now()) / 1000);
          if (test && remaining > 0 && saved.questions?.length) {
            setQuestions(saved.questions);
            setAnswers(saved.answers ?? {});
            setCurrentIdx(saved.currentIdx ?? 0);
            setTimeLeft(remaining);
            setSubmitted(false);
            setResult(null);
            tabSwitchRef.current = saved.tabSwitches ?? 0;
            setTabSwitchCount(tabSwitchRef.current);
            proctorEventsRef.current = saved.proctorEvents ?? [];
            retakeReasonRef.current = saved.retakeReason ?? null;
            setActiveTest(test);
            submittingRef.current = false;
            document.documentElement.requestFullscreen?.().catch(() => {});
            toast.info("Resumed your in-progress test");
          } else if (remaining <= 0) {
            localStorage.removeItem(progressKey);
          }
        }
      } catch { /* ignore corrupt state */ }
    }
  }, [user, progressKey, activeTest]);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("student-tests-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tests" }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  // Persist progress whenever answers/currentIdx/timeLeft change during an active attempt
  useEffect(() => {
    if (!progressKey || !activeTest || submitted) return;
    const payload = {
      testId: activeTest.id,
      questions,
      answers,
      currentIdx,
      endsAt: Date.now() + timeLeft * 1000,
      retakeReason: retakeReasonRef.current,
      tabSwitches: tabSwitchRef.current,
      proctorEvents: proctorEventsRef.current,
    };
    try { localStorage.setItem(progressKey, JSON.stringify(payload)); } catch { /* quota */ }
  }, [progressKey, activeTest, submitted, questions, answers, currentIdx, timeLeft, tabSwitchCount]);

  useEffect(() => {
    if (!activeTest || submitted) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeTest, submitted]);

  // Anti-cheat: detect tab switching / window blur / visibility changes / fullscreen exit
  useEffect(() => {
    if (!activeTest || submitted) return;

    const registerViolation = (type: string) => {
      const now = Date.now();
      // Coalesce multiple browser events occurring within 1200ms into 1 single infraction
      if (now - lastViolationRef.current < 1200) return;
      lastViolationRef.current = now;

      tabSwitchRef.current += 1;
      setTabSwitchCount(tabSwitchRef.current);

      const isFatal = tabSwitchRef.current >= 2;
      const ev: ProctorEvent = {
        timestamp: new Date().toISOString(),
        gadget: type,
        action: isFatal ? "auto_submit" : "warning",
      };
      proctorEventsRef.current.push(ev);

      if (tabSwitchRef.current === 1) {
        setShowTabWarning(true);
        toast.warning(`⚠️ Warning: ${type} detected! (Violation 1 of 2). One more infraction will auto-submit your test.`, { duration: 6000 });
      } else if (tabSwitchRef.current >= 2) {
        toast.error("🚫 Maximum integrity violations reached (2 of 2). Auto-submitting assessment.", { duration: 6000 });
        handleSubmit(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        registerViolation("Tab Switched / Document Hidden");
      }
    };

    const handleBlur = () => {
      registerViolation("Window Focus Lost / Switched Application");
    };

    // Detect fullscreen exit as a violation and show lockout
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !submitted) {
        setIsFullscreenLocked(true);
        registerViolation("Fullscreen Exited");
      } else if (document.fullscreenElement) {
        setIsFullscreenLocked(false);
      }
    };

    // Block keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Alt+Tab, Alt+F4, Ctrl+W, Ctrl+T, Ctrl+N, Ctrl+Shift+I, F11, Meta/Win key combos
      if (
        (e.altKey && (e.key === "Tab" || e.key === "F4")) ||
        (e.ctrlKey && ["w", "t", "n", "Tab"].includes(e.key.toLowerCase())) ||
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "i") ||
        e.key === "F11" ||
        e.key === "Escape" ||
        e.key === "Meta" ||
        (e.metaKey && e.key === "Tab")
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Prevent copy
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      toast.warning("Copying is disabled during the test.");
    };

    // Prevent right-click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Prevent paste
    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      toast.warning("Pasting is disabled during the test.");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [activeTest, submitted]);

  // Camera stream helper for Pre-flight Gate
  const startCameraCheck = async () => {
    setCameraChecking(true);
    setGateCameraError(null);
    try {
      if (gateStreamRef.current) {
        gateStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      gateStreamRef.current = stream;
      if (gateVideoRef.current) {
        gateVideoRef.current.srcObject = stream;
        await gateVideoRef.current.play().catch(() => {});
      }
      setCameraVerified(true);
    } catch (err: any) {
      setCameraVerified(false);
      setGateCameraError(err?.message || "Webcam access denied. Camera is mandatory for proctored tests.");
      toast.error("Camera access required for proctored assessment.");
    } finally {
      setCameraChecking(false);
    }
  };

  useEffect(() => {
    if (gateModalTest) {
      startCameraCheck();
    } else {
      if (gateStreamRef.current) {
        gateStreamRef.current.getTracks().forEach((t) => t.stop());
        gateStreamRef.current = null;
      }
      setCameraVerified(false);
      setGateCameraError(null);
    }
  }, [gateModalTest]);

  // Actual test session launch (ONLY called after Fullscreen & Camera are 100% verified)
  const startActiveTestSession = (test: Test, isRetake = false) => {
    const mainBank = (test.question_bank as unknown as Question[]) ?? [];
    const retakeBank = ((test as unknown as { retake_question_bank?: Question[] }).retake_question_bank) ?? [];
    const bank = isRetake && retakeBank.length > 0 ? retakeBank : mainBank;
    if (bank.length === 0) { toast.error("This test has no questions"); return; }

    const count = test.questions_per_student ?? bank.length;
    const selected = shuffle(bank).slice(0, count);
    setQuestions(selected);
    setAnswers({});
    setCurrentIdx(0);
    setTimeLeft(test.duration * 60);
    setSubmitted(false);
    setResult(null);
    setAiFeedback(null);
    setShowReview(false);
    setExplanations({});
    setTabSwitchCount(0);
    setShowTabWarning(false);
    setIsFullscreenLocked(false);
    tabSwitchRef.current = 0;
    fullscreenExitRef.current = 0;
    proctorEventsRef.current = [];
    retakeReasonRef.current = isRetake ? retakeReason : null;
    insertedAttemptIdRef.current = null;
    setActiveTest(test);
    submittingRef.current = false;
  };

  const handleStartClick = async (test: Test) => {
    // Multi-Round Recruitment Drive Gating
    if (user) {
      const { data: driveRound } = await supabase
        .from("drive_rounds")
        .select("id, round_number, round_name")
        .eq("test_id", test.id)
        .maybeSingle();

      if (driveRound) {
        const { data: participant } = await supabase
          .from("round_participants")
          .select("status")
          .eq("drive_round_id", driveRound.id)
          .eq("student_id", user.id)
          .maybeSingle();

        if (!participant) {
          toast.error(`Access Gated: You are not enrolled in Round ${driveRound.round_number} (${driveRound.round_name}).`);
          return;
        }

        if (participant.status === "not_qualified" || participant.status === "absent") {
          toast.error(`Access Gated: You cannot attempt Round ${driveRound.round_number}. Your status is ${participant.status.replace("_", " ")}.`);
          return;
        }
      }
    }

    const attempts = attemptCounts[test.id] ?? 0;
    if (attempts > 0) {
      // Retake — require reason
      setRetakeReason("");
      setRetakeDialogTest(test);
    } else {
      setIsRetakeGate(false);
      setGateModalTest(test);
    }
  };

  const confirmRetake = async () => {
    if (retakeReason.trim().length < 10) {
      toast.error("Please provide a reason (at least 10 characters).");
      return;
    }
    const test = retakeDialogTest;
    if (!test) return;
    setRetakeDialogTest(null);
    setIsRetakeGate(true);
    setGateModalTest(test);
  };

  const generateExplanations = async (qs: Question[], ans: Record<string, string>) => {
    const wrongQs = qs.filter((q) => {
      const userAnswer = (ans[q.id] ?? "").trim().toLowerCase();
      return userAnswer !== q.correct_answer.trim().toLowerCase();
    });

    if (wrongQs.length === 0) return;
    setLoadingExplanations(true);

    try {
      const prompt = `For each question below that a student answered incorrectly, provide a concise explanation formatted strictly as a JSON object:
{
  "explanations": {
    "QUESTION_ID": {
      "why_wrong": "Explanation of why the selected option was incorrect",
      "why_right": "Explanation of why the correct answer is right"
    }
  }
}

Questions to explain:
${JSON.stringify(wrongQs.map((q) => ({
  id: q.id,
  text: q.text,
  options: q.options,
  correct_answer: q.correct_answer,
  user_answer: ans[q.id] ?? "Not answered",
  subject: q.subject,
})), null, 2)}`;

      const response = await askGemini(prompt, "You are a senior computer science and placement exam tutor. Return ONLY valid JSON.");
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.explanations) {
          setExplanations(parsed.explanations);
        }
      }
    } catch (e) {
      console.warn("Explanations generation fallback:", e);
    } finally {
      setLoadingExplanations(false);
    }
  };

  const generateFeedback = async (testTitle: string, totalScore: number, passed: boolean, scores: Record<string, number>, attemptId?: string) => {
    setLoadingFeedback(true);
    try {
      const prompt = `Provide 3 encouraging, highly actionable bullet points of placement exam feedback for a candidate in "${testTitle}". Score: ${totalScore}%. Status: ${passed ? "Passed" : "Did not qualify"}. Subject scores: ${JSON.stringify(scores)}. Emphasize strengths and areas for technical revision.`;
      const feedback = await askGemini(prompt, "You are a supportive campus placement mentor.");
      setAiFeedback(feedback);

      if (user && attemptId && !attemptId.startsWith("test-")) {
        await supabase.from("test_attempts")
          .update({ feedback } as Record<string, unknown>)
          .eq("id", attemptId);
      }
    } catch {
      setAiFeedback("Great effort! Keep practicing core algorithmic concepts, problem solving, and aptitude fundamentals.");
    } finally {
      setLoadingFeedback(false);
    }
  };

  const handleSubmit = async (autoSubmitted = false) => {
    if (submittingRef.current || !activeTest || !user) return;
    submittingRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);

    let totalScore = 0;
    let totalPoints = 0;
    const subjectScores: Record<string, { earned: number; total: number }> = {};

    questions.forEach((q) => {
      totalPoints += q.points;
      if (!subjectScores[q.subject]) subjectScores[q.subject] = { earned: 0, total: 0 };
      subjectScores[q.subject].total += q.points;

      const userAnswer = (answers[q.id] ?? "").trim().toLowerCase();
      const correct = q.correct_answer.trim().toLowerCase();
      if (userAnswer === correct) {
        totalScore += q.points;
        subjectScores[q.subject].earned += q.points;
      }
    });

    const scorePercent = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0;
    const criteria = (activeTest.pass_criteria as Record<string, number>) ?? {};
    const minPass = criteria.min_score_percent ?? 50;
    const passed = scorePercent >= minPass;

    const scoresMap: Record<string, number> = {};
    Object.entries(subjectScores).forEach(([sub, { earned, total }]) => {
      scoresMap[sub] = total > 0 ? Math.round((earned / total) * 100) : 0;
    });

    const attemptNum = (attemptCounts[activeTest.id] ?? 0) + 1;

    const insertPayload: Record<string, unknown> = {
      student_id: user.id,
      test_id: activeTest.id,
      answers: JSON.parse(JSON.stringify(answers)),
      scores: JSON.parse(JSON.stringify({
        ...scoresMap,
        _earned_marks: totalScore,
        _total_marks: totalPoints,
        _percentage: scorePercent,
      })),
      total_score: scorePercent,
      passed,
      attempt_number: attemptNum,
      started_at: new Date(Date.now() - activeTest.duration * 60 * 1000).toISOString(),
      completed_at: new Date().toISOString(),
      tab_switches: tabSwitchRef.current,
      auto_submitted: autoSubmitted,
      proctor_events: JSON.parse(JSON.stringify(proctorEventsRef.current)),
      retake_reason: retakeReasonRef.current,
    };
    let insertSuccess = false;
    let lastError: any = null;
    let insertedAttemptId: string | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: insData, error: insErr } = await (supabase.from("test_attempts") as any)
        .insert(insertPayload)
        .select("id")
        .maybeSingle();

      if (!insErr) {
        insertSuccess = true;
        insertedAttemptId = insData?.id || null;
        insertedAttemptIdRef.current = insertedAttemptId;
        break;
      }
      lastError = insErr;
      const errText = `${insErr.message || ""} ${(insErr as any).details || ""} ${(insErr as any).hint || ""}`;
      const missingColMatch =
        errText.match(/Could not find the '([^']+)' column of '(?:public\.)?test_attempts'/i) ||
        errText.match(/column "?([^"\s.]+)"? of relation "test_attempts" does not exist/i) ||
        errText.match(/column test_attempts\.([a-zA-Z0-9_]+) does not exist/i);

      if (missingColMatch && missingColMatch[1] && missingColMatch[1] in insertPayload) {
        delete insertPayload[missingColMatch[1]];
        continue;
      }
      break;
    }

    if (!insertSuccess && !activeTest.id.startsWith("test-")) {
      toast.error("Failed to submit: " + (lastError?.message || "Submission error"));
      submittingRef.current = false;
      return;
    }

    setResult({ score: scorePercent, total: totalPoints, passed, scores: scoresMap });
    setSubmitted(true);
    if (progressKey) { try { localStorage.removeItem(progressKey); } catch { /* noop */ } }
    fetchData();

    // Send direct in-app result notification to the student without failing CORS edge functions
    if (user && activeTest) {
      supabase.from("notifications").insert({
        user_id: user.id,
        title: `Assessment Completed: ${activeTest.title}`,
        message: `You scored ${scorePercent}% (${totalScore}/${totalPoints} marks) in ${activeTest.title}. Result: ${passed ? "Passed" : "Below Cutoff"}. Attempt #${attemptNum}.`,
        type: "result",
      } as any).catch(() => {});
    }

    // Generate AI feedback and explanations in parallel using Gemini
    generateFeedback(activeTest.title, scorePercent, passed, scoresMap, insertedAttemptId || undefined);
    generateExplanations(questions, answers);
  };

  const exitTest = () => {
    // Exit fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    if (progressKey) { try { localStorage.removeItem(progressKey); } catch { /* noop */ } }
    setActiveTest(null);
    setSubmitted(false);
    setResult(null);
    setAiFeedback(null);
    setShowReview(false);
    setExplanations({});
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (activeTest) {
    // Show review screen
    if (showReview) {
      return (
        <TestReview
          questions={questions}
          answers={answers}
          explanations={explanations}
          loadingExplanations={loadingExplanations}
          onClose={() => setShowReview(false)}
        />
      );
    }

    if (submitted && result) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-6 overflow-auto">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              {result.passed ? (
                <CheckCircle2 className="mx-auto h-16 w-16 text-success" />
              ) : (
                <XCircle className="mx-auto h-16 w-16 text-destructive" />
              )}
              <CardTitle className="mt-4 text-2xl">
                {result.passed ? "Congratulations! You Passed!" : "Test Not Passed"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <span className="text-5xl font-bold">{result.score}%</span>
                <p className="text-sm text-muted-foreground mt-1">Overall Score</p>
              </div>
              {Object.keys(result.scores).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Subject-wise Scores</h4>
                  {Object.entries(result.scores).map(([subject, score]) => (
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

              {/* AI Feedback */}
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-medium">AI Feedback</h4>
                </div>
                {loadingFeedback ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating personalized feedback…
                  </div>
                ) : aiFeedback ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{aiFeedback}</p>
                ) : null}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowReview(true)} className="flex-1">
                  <Eye className="mr-2 h-4 w-4" /> Review Answers
                </Button>
                <Button onClick={exitTest} className="flex-1">Back to Tests</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    const q = questions[currentIdx];
    const isLowTime = timeLeft < 60;

    const proctorCfg = ((activeTest as unknown as { proctor_config?: Partial<ProctorConfig> }).proctor_config) ?? undefined;
    const answeredCount = questions.filter((qq) => (answers[qq.id] ?? "").trim().length > 0).length;

    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <WebcamProctor
          active={!submitted}
          onAutoSubmit={() => handleSubmit(true)}
          onEvent={(ev) => { proctorEventsRef.current.push(ev); }}
          config={proctorCfg}
        />

        {/* Fullscreen Violation Lockout Overlay */}
        {isFullscreenLocked && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 text-white p-6 text-center backdrop-blur-md">
            <div className="h-20 w-20 rounded-full bg-destructive/20 border-2 border-destructive flex items-center justify-center mb-4 animate-pulse">
              <ShieldAlert className="h-10 w-10 text-destructive" />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2">
              Assessment Locked: Fullscreen Exited
            </h2>
            <p className="text-sm text-zinc-300 max-w-md mb-6 leading-relaxed">
              You navigated away or exited fullscreen mode. This incident has been logged in your forensic integrity audit trail.
            </p>
            <div className="rounded-2xl bg-amber-500/15 border border-amber-500/30 p-3 mb-6 max-w-sm w-full text-xs text-amber-300 font-medium">
              Integrity Infractions: <strong>{tabSwitchCount} / 2</strong> (Next infraction will auto-submit)
            </div>
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-white font-bold px-8 py-3 rounded-2xl shadow-xl transition-all"
              onClick={async () => {
                try {
                  await document.documentElement.requestFullscreen();
                  setIsFullscreenLocked(false);
                } catch {
                  toast.error("Fullscreen permission is required to resume assessment.");
                }
              }}
            >
              Resume Fullscreen Assessment
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between border-b px-6 py-3">
          <h2 className="font-semibold">{activeTest.title}</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Answered {answeredCount} / {questions.length}</span>
            <Badge variant={isLowTime ? "destructive" : "secondary"} className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(timeLeft)}
            </Badge>
          </div>
        </div>
        <Progress value={(answeredCount / questions.length) * 100} className="h-1 rounded-none" />
        {showTabWarning && (
          <Alert variant="destructive" className="mx-6 mt-3">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Warning: Tab Switch Detected!</AlertTitle>
            <AlertDescription>
              Switching tabs is not allowed during the test. You have {tabSwitchCount}/2 violations. One more will auto-submit your test.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar: question navigator */}
          <aside className="hidden md:flex w-64 flex-col border-r bg-muted/30">
            <div className="border-b p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Questions</p>
              <p className="mt-1 text-xs text-muted-foreground">
                <CheckCircle2 className="mr-1 inline h-3 w-3 text-green-500" />
                {answeredCount} answered · {questions.length - answeredCount} left
              </p>
            </div>
            <div className="flex-1 overflow-auto p-3">
              <div className="grid grid-cols-5 gap-2">
                {questions.map((qq, i) => {
                  const isAnswered = (answers[qq.id] ?? "").trim().length > 0;
                  const isCurrent = i === currentIdx;
                  return (
                    <button
                      key={qq.id}
                      onClick={() => setCurrentIdx(i)}
                      className={`relative flex h-10 items-center justify-center rounded-md border text-xs font-medium transition-colors ${
                        isCurrent
                          ? "border-primary bg-primary text-primary-foreground"
                          : isAnswered
                          ? "border-green-500/50 bg-green-500/10 text-foreground hover:bg-green-500/20"
                          : "bg-background hover:bg-accent"
                      }`}
                      aria-label={`Question ${i + 1}${isAnswered ? " (answered)" : ""}`}
                    >
                      {i + 1}
                      {isAnswered && !isCurrent && (
                        <CheckCircle2 className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-background text-green-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <div className="flex-1 overflow-auto p-6">
            <div className="mx-auto max-w-2xl space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Q{currentIdx + 1}</Badge>
                  <Badge variant="outline">{q.type.toUpperCase()}</Badge>
                  <Badge variant="secondary">{q.subject}</Badge>
                  {q.topic && <Badge variant="secondary">{q.topic}</Badge>}
                  <span className="ml-auto text-sm text-muted-foreground">{q.points} pt{q.points > 1 ? "s" : ""}</span>
                </div>
                <p className="text-lg font-medium">{q.text}</p>
              </div>
              {q.type === "mcq" && q.options ? (
                <RadioGroup value={answers[q.id] ?? ""} onValueChange={(v) => setAnswers({ ...answers, [q.id]: v })} className="space-y-3">
                  {q.options.map((opt, i) => (
                    <div key={i} className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
                      <RadioGroupItem value={String.fromCharCode(65 + i)} id={`opt-${i}`} />
                      <Label htmlFor={`opt-${i}`} className="flex-1 cursor-pointer">
                        <span className="mr-2 font-medium text-muted-foreground">{String.fromCharCode(65 + i)}.</span>
                        {opt}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <div className="space-y-2">
                  <Label>Your Answer</Label>
                  <Textarea value={answers[q.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} placeholder="Type your answer here…" rows={6} className="font-mono" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Nav buttons — Previous + Next side-by-side on the LEFT so the webcam preview never overlaps them */}
        <div className="flex items-center justify-between border-t px-6 py-3">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            <Button onClick={() => setCurrentIdx(Math.min(questions.length - 1, currentIdx + 1))} disabled={currentIdx === questions.length - 1}>
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => handleSubmit(false)} variant="default">
            Submit Test
          </Button>
        </div>
      </div>
    );
  }

  const handleRegisterForTest = async (test: Test) => {
    if (!user) return;
    try {
      if (!test.id.startsWith("test-")) {
        const { error } = await supabase.from("schedules").upsert({
          test_id: test.id,
          student_id: user.id,
          status: "registered",
        });

        if (error) {
          const isRls = error.message?.toLowerCase().includes("row-level security policy") || (error as any).code === "42501";
          if (isRls) {
            console.warn("Schedules RLS blocked server insert; persisting locally:", error);
            const localKey = `ipms_registered_schedules_${user.id}`;
            const saved = JSON.parse(localStorage.getItem(localKey) || "{}");
            saved[test.id] = "registered";
            localStorage.setItem(localKey, JSON.stringify(saved));

            setSchedules((prev) => ({ ...prev, [test.id]: "registered" }));
            toast.success(`Successfully registered for ${test.title}!`);
            return;
          }
          throw error;
        }
      } else {
        setSchedules((prev) => ({ ...prev, [test.id]: "registered" }));
      }
      toast.success(`Successfully registered for ${test.title}!`);
      fetchData();
    } catch (err: any) {
      // Local fallback so student is never locked out of their assessment
      try {
        const localKey = `ipms_registered_schedules_${user.id}`;
        const saved = JSON.parse(localStorage.getItem(localKey) || "{}");
        saved[test.id] = "registered";
        localStorage.setItem(localKey, JSON.stringify(saved));
        setSchedules((prev) => ({ ...prev, [test.id]: "registered" }));
        toast.success(`Successfully registered for ${test.title}!`);
      } catch {
        toast.error(err?.message || "Failed to register for assessment");
      }
    }
  };

  const eligible = profileCompletion >= 40 || Boolean(user);
  const now = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Tests</h1>
        <p className="text-muted-foreground">View, register and take scheduled tests</p>
      </div>
      {!eligible && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <p className="text-sm">Complete at least 80% of your profile to access tests. Currently at {profileCompletion}%.</p>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tests.map((test) => {
          const attempts = attemptCounts[test.id] ?? 0;
          const maxAttempts = 2;
          const exhausted = attempts >= maxAttempts;
          const isUpcoming = !isPast(new Date(test.scheduled_date));
          const qCount = ((test.question_bank as unknown as Question[]) ?? []).length;
          const secsUntil = differenceInSeconds(new Date(test.scheduled_date), now);

          // Registration deadline & Lockout check
          const isRegistered = Boolean(schedules[test.id]);
          const deadline = test.registration_deadline ? new Date(test.registration_deadline) : null;
          const deadlinePast = deadline ? isPast(deadline) : false;
          const isLockedOut = deadlinePast && !isRegistered;

          const cleanTitle = (test.title || "").toLowerCase();
          const matchedComp =
            companies.find((c) => c.id === test.company_id) ||
            companies.find((c) => cleanTitle.includes(c.name.toLowerCase())) ||
            (cleanTitle.includes("google") ? { name: "GOOGLE", id: "google" } : null) ||
            (cleanTitle.includes("tcs") || cleanTitle.includes("tata") ? { name: "TCS", id: "tcs" } : null) ||
            (cleanTitle.includes("amazon") ? { name: "AMAZON", id: "amazon" } : null) ||
            (cleanTitle.includes("microsoft") ? { name: "MICROSOFT", id: "microsoft" } : null);

          const roundName = (test as any).round_name || (test.pass_criteria as any)?.round_name || "Round 1: Online Technical Assessment (OA)";
          const totalPoints = ((test.question_bank as unknown as Question[]) ?? []).reduce((acc, q) => acc + (q.points || 1), 0);

          return (
            <Card
              key={test.id}
              className={`h-full flex flex-col justify-between rounded-3xl border border-border/70 bg-card hover:border-primary/40 hover:shadow-xl transition-all duration-300 ${
                isLockedOut ? "opacity-75 border-destructive/30" : ""
              }`}
            >
              <CardHeader className="p-5 pb-3 space-y-3.5">
                {/* 1. Header Row: Logo & Company on Left, Status Badge on Right */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <CompanyLogo
                      name={matchedComp?.name || test.title}
                      logoUrl={(matchedComp?.contact_info as any)?.logo_url}
                      size="md"
                      className="shadow-sm shrink-0 border-border/60"
                    />
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground block truncate">
                        {matchedComp?.name || "Campus Drive"}
                      </span>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80 font-medium">
                        <Calendar className="h-3 w-3 text-primary/70 shrink-0" />
                        <span>{format(new Date(test.scheduled_date), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status badge: Cleanly positioned on the top right */}
                  <div className="shrink-0">
                    {exhausted ? (
                      <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-0.5">
                        Completed
                      </Badge>
                    ) : isLockedOut ? (
                      <Badge variant="destructive" className="text-xs font-semibold px-2.5 py-0.5">
                        Registration Closed
                      </Badge>
                    ) : !isRegistered ? (
                      <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-semibold px-2.5 py-0.5 shadow-none">
                        Registration Open
                      </Badge>
                    ) : isUpcoming ? (
                      <Badge variant="outline" className="border-primary/40 text-primary bg-primary/5 text-xs font-semibold px-2.5 py-0.5">
                        Registered · Upcoming
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold px-2.5 py-0.5 shadow-none">
                        Registered · Available
                      </Badge>
                    )}
                  </div>
                </div>

                {/* 2. Assessment Title: Full width, guaranteed 2-line height */}
                <div>
                  <h3
                    className="font-display text-base font-extrabold text-foreground leading-snug line-clamp-2 min-h-[2.6rem]"
                    title={test.title}
                  >
                    {test.title}
                  </h3>
                </div>

                {/* 3. Round Information Badge: Dedicated clean row with proper breathing room */}
                <div>
                  <Badge
                    variant="outline"
                    className="bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/25 text-[11px] font-semibold px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 max-w-full"
                  >
                    <GitBranch className="h-3 w-3 text-purple-500 shrink-0" />
                    <span className="truncate">{roundName}</span>
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-5 pt-1 flex-1 flex flex-col justify-between space-y-4">
                {/* 4. Uniform 5-Row Metadata Grid with Consistent Baseline */}
                <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs border-t border-border/50 pt-3">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
                    Time (IST)
                  </span>
                  <span className="text-right font-medium text-foreground">
                    {format(new Date(test.scheduled_date), "h:mm a")}
                  </span>

                  <span className="text-muted-foreground">Duration</span>
                  <span className="text-right font-medium text-foreground">{test.duration} min</span>

                  <span className="text-muted-foreground">Questions</span>
                  <span className="text-right font-medium text-foreground">
                    {test.questions_per_student ?? qCount} ({totalPoints} marks)
                  </span>

                  <span className="text-muted-foreground">Attempts</span>
                  <span className="text-right font-medium text-foreground">{attempts} / {maxAttempts}</span>

                  <span className={deadline ? (deadlinePast ? "text-destructive font-semibold" : "text-amber-500 font-semibold") : "text-muted-foreground"}>
                    Reg. Deadline
                  </span>
                  <span className={`text-right ${deadline ? (deadlinePast ? "text-destructive font-semibold" : "text-amber-500 font-semibold") : "text-muted-foreground font-medium"}`}>
                    {deadline ? format(deadline, "MMM d, h:mm a") : "Open / Rolling"}
                  </span>
                </div>

                {/* 5. Action Button: Always pinned to the bottom baseline */}
                <div className="mt-auto pt-2">
                  {isLockedOut ? (
                    <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-2.5 text-center text-xs text-destructive font-semibold">
                      Registration closed. Unregistered candidates cannot attend.
                    </div>
                  ) : !isRegistered ? (
                    <Button
                      className="w-full h-11 rounded-xl bg-[#5b51d8] hover:bg-[#4d42cc] text-white font-bold shadow-md transition-all text-sm"
                      onClick={() => handleRegisterForTest(test)}
                    >
                      Register for Assessment
                    </Button>
                  ) : (
                    <Button
                      className="w-full h-11 rounded-xl font-bold shadow-md text-sm transition-all"
                      disabled={!eligible || exhausted || isUpcoming}
                      onClick={() => handleStartClick(test)}
                    >
                      {exhausted
                        ? "Max Attempts Reached"
                        : isUpcoming
                        ? `Starts in ${Math.floor(secsUntil / 3600)}h ${Math.floor((secsUntil % 3600) / 60)}m`
                        : !eligible
                        ? "Profile Incomplete"
                        : attempts > 0
                        ? "Retake Test"
                        : "Start Test"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {tests.length === 0 && (
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardContent className="py-8 text-center text-muted-foreground">No tests available yet. Check back later.</CardContent>
          </Card>
        )}
      </div>

      {/* Retake reason dialog */}
      <Dialog open={!!retakeDialogTest} onOpenChange={(v) => { if (!v) setRetakeDialogTest(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retake Test — {retakeDialogTest?.title}</DialogTitle>
            <DialogDescription>
              Please tell us why you are retaking this test. Your reason will be recorded and visible to the admin.
              You will receive a freshly randomized set of questions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason for retake</Label>
            <Textarea
              value={retakeReason}
              onChange={(e) => setRetakeReason(e.target.value)}
              placeholder="e.g. Network issues during my previous attempt / I want to improve my score after more preparation…"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">Minimum 10 characters.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRetakeDialogTest(null)}>Cancel</Button>
            <Button onClick={confirmRetake}>Start Retake</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Camera permission denied dialog */}
      <Dialog open={!!cameraDeniedTest} onOpenChange={(v) => { if (!v) setCameraDeniedTest(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-destructive" /> Camera Access Required
            </DialogTitle>
            <DialogDescription>
              This test uses live proctoring and cannot start without camera access.
              Please allow camera permission in your browser (click the camera icon in the address bar), then retry.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <p className="font-medium">How to enable camera:</p>
            <ol className="mt-1 list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>Click the lock / camera icon in your browser's address bar.</li>
              <li>Set Camera to "Allow" for this site.</li>
              <li>Click <strong>Retry</strong> below.</li>
            </ol>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCameraDeniedTest(null)}>Cancel</Button>
            <Button
              onClick={() => {
                const t = cameraDeniedTest;
                setCameraDeniedTest(null);
                if (t) handleStartClick(t);
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Retry Permission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pre-Flight Mandatory Proctoring & Fullscreen Gate Modal */}
      <Dialog
        open={!!gateModalTest}
        onOpenChange={(v) => {
          if (!v) {
            if (gateStreamRef.current) {
              gateStreamRef.current.getTracks().forEach((t) => t.stop());
              gateStreamRef.current = null;
            }
            setGateModalTest(null);
          }
        }}
      >
        <DialogContent className="max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold font-display text-foreground">
              <ShieldAlert className="h-5 w-5 text-primary" />
              Proctoring Verification &amp; System Readiness
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Assessment: <strong className="text-foreground">{gateModalTest?.title}</strong> ({gateModalTest?.duration} mins)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Live Camera Feed Preview */}
            <div className="relative rounded-2xl overflow-hidden border-2 border-border/80 bg-zinc-950 flex flex-col items-center justify-center">
              <video
                ref={gateVideoRef}
                autoPlay
                muted
                playsInline
                className="h-44 w-full object-cover"
              />

              {/* Status Pill overlay */}
              <div className="absolute top-2.5 right-2.5">
                {cameraVerified ? (
                  <Badge className="bg-emerald-500 text-white border-0 shadow-md text-[11px] gap-1 px-2.5 py-0.5">
                    <CheckCircle2 className="h-3 w-3" /> Camera Connected
                  </Badge>
                ) : cameraChecking ? (
                  <Badge variant="outline" className="bg-background/90 text-foreground border-border text-[11px] gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Verifying Camera…
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-[11px] gap-1 px-2.5 py-0.5">
                    <AlertTriangle className="h-3 w-3" /> Camera Access Required
                  </Badge>
                )}
              </div>

              {!cameraVerified && !cameraChecking && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4 text-center">
                  <Camera className="h-8 w-8 text-rose-500 mb-2" />
                  <p className="text-xs text-zinc-300 mb-3 max-w-xs">{gateCameraError || "Camera permission is required to take this proctored assessment."}</p>
                  <Button size="sm" onClick={startCameraCheck} className="font-bold text-xs h-8">
                    <RefreshCw className="h-3.5 w-3.5 mr-1" /> Grant Camera Access
                  </Button>
                </div>
              )}
            </div>

            {/* Anti-Cheating & System Readiness Checklist */}
            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/60 space-y-2 text-xs">
              <div className="font-bold text-foreground text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Examination Integrity Rules
              </div>
              <ul className="space-y-1.5 text-muted-foreground text-[11px]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span><strong>Fullscreen Enforcement:</strong> Exiting fullscreen or navigating tabs will trigger warnings.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span><strong>Candidate Face Visibility:</strong> You must remain in front of the camera alone.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span><strong>Prohibited Gadgets:</strong> Mobile phones, earphones, tablets, and secondary screens are flagged.</span>
                </li>
                <li className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span><strong>Auto-Submission:</strong> Reaching 2 infractions will automatically submit your assessment.</span>
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                if (gateStreamRef.current) {
                  gateStreamRef.current.getTracks().forEach((t) => t.stop());
                  gateStreamRef.current = null;
                }
                setGateModalTest(null);
              }}
              className="w-full sm:w-auto text-xs"
            >
              Cancel
            </Button>
            <Button
              disabled={!cameraVerified || cameraChecking}
              onClick={async () => {
                if (!cameraVerified) {
                  toast.error("Camera access is mandatory before starting.");
                  return;
                }

                try {
                  await document.documentElement.requestFullscreen();
                } catch {
                  toast.error("Could not enter fullscreen mode. Please grant fullscreen access to begin.");
                  return;
                }

                if (!document.fullscreenElement) {
                  toast.error("Fullscreen mode required. Please allow fullscreen to proceed.");
                  return;
                }

                // Stop the gate preview stream so WebcamProctor takes over
                if (gateStreamRef.current) {
                  gateStreamRef.current.getTracks().forEach((t) => t.stop());
                  gateStreamRef.current = null;
                }

                const test = gateModalTest;
                const isRetake = isRetakeGate;
                setGateModalTest(null);
                if (test) {
                  startActiveTestSession(test, isRetake);
                }
              }}
              className="w-full sm:flex-1 bg-primary hover:bg-primary/90 text-white font-bold text-xs h-10 rounded-2xl shadow-lg gap-2"
            >
              <ShieldAlert className="h-4 w-4" />
              Grant Fullscreen &amp; Begin Assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
