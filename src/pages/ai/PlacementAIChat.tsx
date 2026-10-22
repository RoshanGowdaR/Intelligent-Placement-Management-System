import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSpeech } from "@/hooks/useSpeech";
import { askGemini } from "@/lib/gemini";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  Cell
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Bot, Mic, MicOff, Volume2, VolumeX, Send, Sparkles, Loader2,
  PanelLeftClose, PanelLeftOpen, Plus, MessageSquare, Trash2,
  Copy, Check, User, ArrowUp, Lightbulb, BarChart3, Building2,
  GraduationCap, ClipboardList, ShieldCheck, ChevronRight, CornerDownLeft, RotateCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  isDeepThought?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export default function PlacementAIChat({ forcedRole }: { forcedRole?: "admin" | "company" | "student" }) {
  const { user, role: authRole } = useAuth();
  const role = forcedRole || authRole || "student";

  // Sidebar toggle state (like ChatGPT's [||] button)
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Sessions and Active Chat state
  const storageKey = `ipms_chat_history_${role}_${user?.id || "guest"}`;
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");

  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeepThinking, setIsDeepThinking] = useState(false);
  const [ttsActiveId, setTtsActiveId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    isListening,
    transcript,
    setTranscript,
    startListening,
    stopListening,
    isSpeaking,
    speak,
    stopSpeaking,
  } = useSpeech();

  // Load chat history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: ChatSession[] = JSON.parse(saved);
        setSessions(parsed);
        if (parsed.length > 0) {
          setCurrentSessionId(parsed[0].id);
          return;
        }
      }
    } catch (_) {}

    // Initialize with a blank default session
    const defaultId = "session_" + Date.now();
    const initSession: ChatSession = {
      id: defaultId,
      title: "New Chat",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    setSessions([initSession]);
    setCurrentSessionId(defaultId);
  }, [storageKey]);

  // Persist sessions to localStorage
  const saveSessions = (updated: ChatSession[]) => {
    setSessions(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (_) {}
  };

  // Current active session
  const currentSession = useMemo(() => {
    return sessions.find((s) => s.id === currentSessionId) || sessions[0];
  }, [sessions, currentSessionId]);

  // Sync speech recognition into input field
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession?.messages, isProcessing]);

  // Create a brand-new chat
  const handleNewChat = () => {
    const newId = "session_" + Date.now();
    const newSession: ChatSession = {
      id: newId,
      title: "New Chat",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    const updated = [newSession, ...sessions];
    saveSessions(updated);
    setCurrentSessionId(newId);
    setInput("");
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  // Delete a specific chat session
  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const filtered = sessions.filter((s) => s.id !== id);
    if (filtered.length === 0) {
      const newId = "session_" + Date.now();
      const fresh: ChatSession = {
        id: newId,
        title: "New Chat",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
      };
      saveSessions([fresh]);
      setCurrentSessionId(newId);
    } else {
      saveSessions(filtered);
      if (currentSessionId === id) {
        setCurrentSessionId(filtered[0].id);
      }
    }
    toast.success("Chat deleted");
  };

  // Gather live database context based on the current user's role
  const gatherRoleDatabaseContext = async (): Promise<string> => {
    try {
      if (role === "admin") {
        // Full database access for Placement Admin
        const [profilesRes, companiesRes, testsRes, attemptsRes, roundsRes, roundPartsRes] = await Promise.all([
          supabase.from("profiles").select("id, name, email, branch, cgpa, usn, backlogs, skills"),
          supabase.from("companies").select("id, name, job_role, salary_package, job_location, eligibility_criteria, allowed_branches, max_backlogs"),
          supabase.from("tests").select("id, title, scheduled_date, duration, registration_deadline, company_id, pass_criteria, questions_per_student, companies(name)"),
          supabase.from("test_attempts").select("id, student_id, test_id, total_score, passed, auto_submitted, tab_switches, proctor_events, started_at, completed_at, tests(id, title, company_id, pass_criteria, companies(name)), profiles(id, name, email, branch, cgpa, usn)"),
          supabase.from("drive_rounds").select("id, round_name, round_number, round_type, company_id, passing_logic, passing_value, is_published, companies(name)"),
          supabase.from("round_participants").select("id, drive_round_id, student_id, status, score, drive_rounds(company_id, round_number, round_name, round_type, companies(name)), profiles(id, name, email, branch, cgpa, usn)"),
        ]);

        const profiles = profilesRes.data ?? [];
        const companies = companiesRes.data ?? [];
        const tests = testsRes.data ?? [];
        const attempts = attemptsRes.data ?? [];
        const rounds = roundsRes.data ?? [];
        const roundParts = roundPartsRes.data ?? [];

        // Compute institutional placement & assessment KPIs
        const attempterIds = new Set(attempts.map((a) => a.student_id));
        const totalAttended = attempterIds.size;

        const passedAttempterIds = new Set(attempts.filter((a) => a.passed).map((a) => a.student_id));
        const totalPassed = passedAttempterIds.size;

        const failedAttempterIds = new Set(
          attempts
            .filter((a) => !a.passed)
            .map((a) => a.student_id)
            .filter((id) => !passedAttempterIds.has(id))
        );
        const totalFailed = failedAttempterIds.size;

        // Placed candidates: qualified final round participants or qualified in drive rounds
        const qualifiedParts = roundParts.filter((rp: any) => rp.status === "qualified");
        const placedIds = new Set(qualifiedParts.map((rp: any) => rp.student_id));
        const totalPlaced = placedIds.size;

        const passRate = attempts.length > 0
          ? Math.round((attempts.filter((a) => a.passed).length / attempts.length) * 100)
          : 0;

        // Branch breakdown
        const branchCounts: Record<string, number> = {};
        profiles.forEach((p) => {
          const b = p.branch || "General";
          branchCounts[b] = (branchCounts[b] || 0) + 1;
        });

        // Detailed student roster with company eligibility calculation
        const studentRoster = profiles.map((p) => {
          const eligibleCompanies = companies.filter((c) => {
            let minCgpa = 0;
            if (c.eligibility_criteria && typeof c.eligibility_criteria === "object") {
              minCgpa = Number((c.eligibility_criteria as any).min_cgpa ?? (c.eligibility_criteria as any).cgpa ?? 0);
            }
            const studentCgpa = p.cgpa ?? 0;
            const meetsCgpa = studentCgpa >= minCgpa;
            const allowed = (c.allowed_branches as string[]) ?? [];
            const meetsBranch = allowed.length === 0 || allowed.some((b) => !p.branch || b.toLowerCase().includes(p.branch.toLowerCase()));
            const meetsBacklogs = c.max_backlogs == null || (p.backlogs ?? 0) <= c.max_backlogs;
            return meetsCgpa && meetsBranch && meetsBacklogs;
          }).map((c) => c.name);

          return {
            name: p.name || "Student",
            usn: p.usn || "N/A",
            branch: p.branch || "General",
            cgpa: p.cgpa != null ? p.cgpa : "Not specified",
            backlogs: p.backlogs ?? 0,
            skills: (p.skills || []).join(", ") || "General",
            eligibleCompanies: eligibleCompanies.length > 0 ? eligibleCompanies : ["None (Criteria not met)"],
          };
        });

        // Detailed candidate attempts with Proctor Integrity breakdown
        const attemptsDetails = attempts.map((a) => {
          const p = a.profiles as any;
          const t = a.tests as any;
          const tabSwitches = a.tab_switches || 0;
          let gadgetDetected = false;
          const violationList: string[] = [];
          if (tabSwitches > 0) {
            violationList.push(`${tabSwitches} tab switches`);
          }
          if (Array.isArray(a.proctor_events)) {
            a.proctor_events.forEach((evt: any) => {
              const typeStr = (evt.type || evt.event || "").toLowerCase();
              if (typeStr.includes("device") || typeStr.includes("gadget") || typeStr.includes("phone") || evt.device_detected) {
                gadgetDetected = true;
                violationList.push("Digital gadget / phone detected");
              }
            });
          }
          if (a.auto_submitted) {
            violationList.push("Auto-submitted due to cheat violation threshold");
          }

          // Calculate Proctor Integrity Score (out of 100)
          let proctorScore = 100 - (tabSwitches * 15) - (gadgetDetected ? 40 : 0);
          if (a.auto_submitted) proctorScore = Math.min(proctorScore, 20);
          proctorScore = Math.max(0, Math.min(100, proctorScore));

          const proctorStatus = proctorScore >= 85 ? "Clean / Valid" : proctorScore >= 60 ? "Warning / Suspicious" : "Flagged Cheat / High Risk";

          return {
            candidateName: p?.name || "Candidate",
            usn: p?.usn || "N/A",
            branch: p?.branch || "General",
            cgpa: p?.cgpa != null ? p.cgpa : "N/A",
            testTitle: t?.title || "Assessment",
            company: t?.companies?.name || "Campus",
            scoreObtained: a.total_score ?? 0,
            passed: a.passed ? "Passed" : "Failed",
            tabSwitches,
            gadgetDetected,
            autoSubmitted: a.auto_submitted,
            proctorScore: `${proctorScore}/100`,
            proctorScoreNumeric: proctorScore,
            proctorStatus,
            violations: violationList.length > 0 ? violationList.join("; ") : "Clean (No violations)",
            completedAt: a.completed_at,
          };
        });

        // Placed candidates list
        const placedCandidates = qualifiedParts.map((rp: any) => ({
          name: (rp.profiles as any)?.name || "Candidate",
          usn: (rp.profiles as any)?.usn || "N/A",
          branch: (rp.profiles as any)?.branch || "General",
          company: (rp.drive_rounds as any)?.companies?.name || "Company",
          round: `R${(rp.drive_rounds as any)?.round_number || 1}: ${(rp.drive_rounds as any)?.round_name || "Round"}`,
          status: "Qualified / Placed",
        }));

        return `
ROLE: PLACEMENT ADMINISTRATION (FULL DATABASE ACCESS GRANTED)
You have verified, unredacted forensic access to the entire institution placement database:
- Total Registered Students: ${profiles.length}
- Students Attended Assessments: ${totalAttended}
- Students Passed Assessments: ${totalPassed}
- Students Failed Assessments: ${totalFailed}
- Students Placed: ${totalPlaced}
- Overall Test Submissions: ${attempts.length} (Overall Pass Rate: ${passRate}%)
- Registered Companies (${companies.length}): ${companies.map((c) => `${c.name} (${c.job_role || "Engineering"}, CTC: ${c.salary_package || "N/A"})`).join("; ")}
- Total Placement Tests Conducted: ${tests.length}
- Test List: ${tests.map((t) => `"${t.title}" (${(t.companies as any)?.name || "Campus"}, Scheduled: ${t.scheduled_date})`).join("; ")}
- Recruitment Drive Rounds: ${rounds.length} configured across companies.
- Branch Distribution: ${JSON.stringify(branchCounts)}

LIVE CANDIDATE ATTEMPTS & PROCTOR SCORES:
${JSON.stringify(attemptsDetails, null, 2)}

STUDENT ROSTER & COMPANY ELIGIBILITY:
${JSON.stringify(studentRoster, null, 2)}

REGISTERED COMPANIES & HIRING CRITERIA:
${JSON.stringify(companies.map(c => ({ name: c.name, role: c.job_role, ctc: c.salary_package, location: c.job_location, criteria: c.eligibility_criteria })), null, 2)}

PLACED CANDIDATES:
${JSON.stringify(placedCandidates, null, 2)}

CRITICAL RESPONSE & FORMATTING INSTRUCTIONS:
1. ALWAYS USE VISUAL KPI CARDS & CHARTS:
Whenever the user asks about:
- Placement summary or overview
- Attended students, passed, failed, or placed counts
- Exam results or candidates performance
You MUST include:
A) A visual \`\`\`kpi block:
\`\`\`kpi
[
  { "label": "Registered", "value": ${profiles.length}, "sub": "Total Students", "color": "#3b82f6" },
  { "label": "Attended", "value": ${totalAttended}, "sub": "Exam Takers", "color": "#6366f1" },
  { "label": "Passed", "value": ${totalPassed}, "sub": "${passRate}% Pass Rate", "color": "#10b981" },
  { "label": "Failed", "value": ${totalFailed}, "sub": "Failed", "color": "#ef4444" },
  { "label": "Placed", "value": ${totalPlaced}, "sub": "Placed Offers", "color": "#8b5cf6" }
]
\`\`\`
B) A visual comparative Bar Chart using \`\`\`chart:
\`\`\`chart
{
  "type": "bar",
  "title": "Institutional Placement & Exam Performance Metrics",
  "data": [
    { "name": "Registered", "value": ${profiles.length}, "color": "#3b82f6" },
    { "name": "Attended", "value": ${totalAttended}, "color": "#6366f1" },
    { "name": "Passed", "value": ${totalPassed}, "color": "#10b981" },
    { "name": "Failed", "value": ${totalFailed}, "color": "#ef4444" },
    { "name": "Placed", "value": ${totalPlaced}, "color": "#8b5cf6" }
  ]
}
\`\`\`
C) When specific candidate attempts are referenced (e.g. Hemanth), include their individual Proctor Score Card using \`\`\`proctor:
\`\`\`proctor
{
  "candidate": "Candidate Name",
  "score": 70,
  "tab_switches": 2,
  "violations": ["2 Tab Switches Detected"]
}
\`\`\`

2. COMPREHENSIVE MARKDOWN TABLES:
- When asked for candidates who attended exams or test results:
  Provide a complete Markdown table with columns:
  | Candidate Name | USN | Branch | CGPA | Test Title | Score | Result | Proctor Score | Proctor Notes / Integrity |
- When asked for eligible students:
  Provide a complete Markdown table using candidate profiles from the roster:
  | Candidate Name | USN | Branch | CGPA | Eligible Companies | Academic Status |
- When asked about placed students or companies:
  Provide clear Markdown tables. Always ensure tables have clean markdown headers (|---|---|).

3. ABSOLUTE DATA FIDELITY:
- NEVER claim that student profiles or companies are missing. All data is right here in your live context.
- Name candidates specifically (e.g. Hemanth, etc.) and state their exact test scores, tab switches, and pass/fail results.
- Keep the language clear, professional, executive, and encouraging.
        `.trim();
      } else if (role === "company") {
        // Scoped to Recruiter's Company
        const { data: companyRecord } = await supabase
          .from("companies")
          .select("id, name, job_role, salary_package, eligibility_criteria, allowed_branches")
          .eq("user_id", user?.id || "")
          .maybeSingle();

        const compId = companyRecord?.id;
        const [testsRes, attemptsRes, roundsRes] = await Promise.all([
          compId ? supabase.from("tests").select("id, title, duration, scheduled_date, pass_criteria").eq("company_id", compId) : { data: [] },
          compId ? supabase.from("test_attempts").select("id, student_id, test_id, total_score, passed, auto_submitted, tab_switches, proctor_events, completed_at, tests(title, company_id), profiles(id, name, branch, cgpa, usn)").order("completed_at", { ascending: false }) : { data: [] },
          compId ? supabase.from("drive_rounds").select("id, round_name, round_number, round_type, passing_logic, is_published, round_participants(id, student_id, status, score, profiles(name, usn, branch, cgpa))").eq("company_id", compId) : { data: [] },
        ]);

        const compTests = testsRes.data ?? [];
        const compTestIds = new Set(compTests.map((t) => t.id));
        const compAttempts = (attemptsRes.data ?? []).filter((a) => compTestIds.has(a.test_id));
        const rounds = roundsRes.data ?? [];

        return `
ROLE: ENTERPRISE RECRUITER (${companyRecord?.name || "Company Partner"})
Scoped exclusively to this company's hiring pipeline:
- Company Name: ${companyRecord?.name || "Your Company"}
- Hiring Role: ${companyRecord?.job_role || "Software Engineer"}
- CTC: ${companyRecord?.salary_package || "Competitive"}
- Assessments Created: ${compTests.length}
- Candidate Submissions: ${compAttempts.length}
- Active Drive Rounds: ${rounds.length}

CANDIDATE ATTEMPTS & PROCTOR LOGS:
${JSON.stringify(compAttempts, null, 2)}

INSTRUCTIONS:
Assist this recruiter in managing candidate evaluations, scoring, proctoring integrity audits, and multi-round recruitment drives. Format answers using markdown tables, bullet points, and visual KPI cards.
        `.trim();
      } else {
        // Student Assistant
        const [profileRes, myAttemptsRes, upcomingTestsRes] = await Promise.all([
          supabase.from("profiles").select("id, name, email, branch, cgpa, usn, backlogs, skills").eq("id", user?.id || "").maybeSingle(),
          supabase.from("test_attempts").select("id, total_score, passed, tab_switches, auto_submitted, completed_at, tests(id, title, scheduled_date, companies(name))").eq("student_id", user?.id || ""),
          supabase.from("tests").select("id, title, scheduled_date, duration, companies(name)").order("scheduled_date", { ascending: true }).limit(5),
        ]);

        const profile = profileRes.data;
        const myAttempts = myAttemptsRes.data ?? [];
        const upcoming = upcomingTestsRes.data ?? [];

        return `
ROLE: CANDIDATE CAREER & PLACEMENT MENTOR
Mentoring student: ${profile?.name || user?.email || "Student"}
- Branch: ${profile?.branch || "B.Tech"} | CGPA: ${profile?.cgpa || "N/A"}
- Skills: ${(profile?.skills || []).join(", ") || "General"}
- Completed Tests: ${myAttempts.length}
- Upcoming Drives: ${upcoming.map((u) => `${u.title} (${(u.companies as any)?.name || "Campus"})`).join("; ")}

INSTRUCTIONS:
Act as an expert placement tutor and interview coach. Help this student master technical and aptitude MCQs, practice coding challenges, optimize their resume, and build confidence for upcoming campus drives. Format responses cleanly with tables and code blocks.
        `.trim();
      }
    } catch (err) {
      console.warn("Telemetry context build notice:", err);
      return `ROLE: ${role.toUpperCase()} ASSISTANT`;
    }
  };

    // Submit Prompt to Gemini AI
  const handleSendMessage = async (textToSend?: string) => {
    const messageText = (textToSend || input).trim();
    if (!messageText || isProcessing) return;

    if (isListening) stopListening();

    // Create user message
    const userMsg: ChatMessage = {
      id: "msg_" + Date.now(),
      sender: "user",
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    // Auto-derive title from first message
    let updatedTitle = currentSession.title;
    if (currentSession.messages.length === 0 || currentSession.title === "New Chat") {
      updatedTitle = messageText.length > 28 ? messageText.slice(0, 28) + "…" : messageText;
    }

    const newMessages = [...currentSession.messages, userMsg];
    const updatedSessions = sessions.map((s) => {
      if (s.id === currentSession.id) {
        return {
          ...s,
          title: updatedTitle,
          updatedAt: new Date().toISOString(),
          messages: newMessages,
        };
      }
      return s;
    });

    saveSessions(updatedSessions);
    setInput("");
    setIsProcessing(true);

    try {
      const systemContext = await gatherRoleDatabaseContext();
      const thinkingPrefix = isDeepThinking
        ? "Perform step-by-step deep architectural reasoning before presenting your final structured answer.\n"
        : "";

      const aiResponseText = await askGemini(
        `${thinkingPrefix}${messageText}`,
        systemContext
      );

      const assistantMsg: ChatMessage = {
        id: "msg_" + (Date.now() + 1),
        sender: "assistant",
        text: aiResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isDeepThought: isDeepThinking,
      };

      const finalSessions = updatedSessions.map((s) => {
        if (s.id === currentSession.id) {
          return {
            ...s,
            messages: [...newMessages, assistantMsg],
          };
        }
        return s;
      });

      saveSessions(finalSessions);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: "msg_" + (Date.now() + 1),
        sender: "assistant",
        text: `⚠️ **Error querying Placement AI:** ${err?.message || "Failed to reach AI Engine. Please verify internet connection."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      const errorSessions = updatedSessions.map((s) => {
        if (s.id === currentSession.id) {
          return {
            ...s,
            messages: [...newMessages, errorMsg],
          };
        }
        return s;
      });

      saveSessions(errorSessions);
      toast.error("Failed to generate response");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSpeech = (id: string, text: string) => {
    if (isSpeaking && ttsActiveId === id) {
      stopSpeaking();
      setTtsActiveId(null);
    } else {
      stopSpeaking();
      speak(text);
      setTtsActiveId(id);
    }
  };

  const handleRegenerate = async (targetMsg?: ChatMessage) => {
    if (isProcessing || !currentSession || currentSession.messages.length === 0) return;
    const lastUserIdx = [...currentSession.messages].reverse().findIndex((m) => m.sender === "user");
    if (lastUserIdx === -1) return;
    const actualIdx = currentSession.messages.length - 1 - lastUserIdx;
    const lastUserMsg = currentSession.messages[actualIdx];

    const trimmedMessages = currentSession.messages.slice(0, actualIdx + 1);
    const updatedSessions = sessions.map((s) => {
      if (s.id === currentSession.id) {
        return { ...s, messages: trimmedMessages };
      }
      return s;
    });
    saveSessions(updatedSessions);
    setIsProcessing(true);

    try {
      const systemContext = await gatherRoleDatabaseContext();
      const thinkingPrefix = isDeepThinking
        ? "Perform step-by-step deep architectural reasoning before presenting your final structured answer.\n"
        : "";
      const aiResponseText = await askGemini(
        `${thinkingPrefix}${lastUserMsg.text}`,
        systemContext
      );
      const assistantMsg: ChatMessage = {
        id: "msg_" + Date.now(),
        sender: "assistant",
        text: aiResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isDeepThought: isDeepThinking,
      };
      const finalSessions = updatedSessions.map((s) => {
        if (s.id === currentSession.id) {
          return { ...s, messages: [...trimmedMessages, assistantMsg] };
        }
        return s;
      });
      saveSessions(finalSessions);
    } catch (err: any) {
      toast.error("Failed to regenerate response");
    } finally {
      setIsProcessing(false);
    }
  };

  // User display name for ChatGPT greeting: "Good to see you, [Name]."
  const userName =
    user?.user_metadata?.name ||
    user?.email?.split("@")[0]?.replace(/[._-]/g, " ") ||
    "User";

  const formattedName =
    userName.charAt(0).toUpperCase() + userName.slice(1);

  // Role-specific starter prompts
  const starterPrompts = useMemo(() => {
    if (role === "admin") {
      return [
        {
          icon: BarChart3,
          title: "Drive & Placement Report",
          prompt: "Generate a comprehensive recruitment drive report with student qualification rates and company velocity.",
        },
        {
          icon: GraduationCap,
          title: "Top Candidate Podiums",
          prompt: "Show the top cohort academic performers by CGPA and branch distribution.",
        },
        {
          icon: Building2,
          title: "Company Drive Analytics",
          prompt: "Analyze past company recruitment drives, average test scores, and candidate clearance pipelines.",
        },
        {
          icon: ShieldCheck,
          title: "Proctoring Integrity Audit",
          prompt: "Review candidate test attempts, proctoring violation logs, and flagged integrity issues.",
        },
      ];
    } else if (role === "company") {
      return [
        {
          icon: ClipboardList,
          title: "My Drive Assessments",
          prompt: "Summarize all tests created for my company and candidate registration statuses.",
        },
        {
          icon: BarChart3,
          title: "Candidate Performance",
          prompt: "Evaluate candidate test submission scores and recommend passing cutoffs for Round 1.",
        },
        {
          icon: GraduationCap,
          title: "Campus Talent Pool",
          prompt: "Filter the eligible campus talent pool matching our engineering requirements.",
        },
        {
          icon: Lightbulb,
          title: "Round Structure Tips",
          prompt: "How should I structure our 3-round campus drive (Online Assessment -> Technical Interview -> HR)?",
        },
      ];
    } else {
      return [
        {
          icon: Lightbulb,
          title: "Practice Technical MCQs",
          prompt: "Give me 5 challenging Data Structures and Algorithm questions with detailed explanations.",
        },
        {
          icon: GraduationCap,
          title: "Optimize My Resume",
          prompt: "What are the top skills recruiters look for in Computer Science and Engineering placements?",
        },
        {
          icon: ClipboardList,
          title: "Upcoming Test Prep",
          prompt: "What topics should I prepare for upcoming company online assessments?",
        },
        {
          icon: Sparkles,
          title: "Mock Interview Questions",
          prompt: "Conduct a mock technical interview with me for a Software Development Engineer role.",
        },
      ];
    }
  }, [role]);

  return (
    <div className="flex h-[calc(100vh-80px)] w-full overflow-hidden bg-background text-foreground relative rounded-3xl border border-border/70 shadow-sm">
      
      {/* 1. Collapsible ChatGPT Sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            key="chatgpt-sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="h-full bg-card/95 border-r border-border/70 flex flex-col justify-between shrink-0 overflow-hidden select-none z-20"
          >
            {/* Sidebar Top: Header & New Chat */}
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between px-2 pt-1">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-[#5b51d8] flex items-center justify-center text-white shadow-sm">
                    <Sparkles className="h-4 w-4 fill-white" />
                  </div>
                  <span className="font-display font-extrabold text-sm tracking-tight">Placement AI</span>
                </div>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSidebarOpen(false)}
                        className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                      >
                        <PanelLeftClose className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Close sidebar</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* New Chat Button */}
              <Button
                onClick={handleNewChat}
                className="w-full justify-start gap-2.5 h-10 rounded-xl bg-muted/60 hover:bg-muted text-foreground font-semibold text-xs border border-border/60 shadow-none transition-all"
              >
                <Plus className="h-4 w-4 text-primary" />
                <span>New chat</span>
              </Button>
            </div>

            {/* Middle: Chat History Thread List */}
            <div className="flex-1 overflow-y-auto px-3 space-y-1 scrollbar-thin">
              <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground px-2 py-1.5">
                Recent Chats
              </div>

              {sessions.map((sess) => {
                const isActive = sess.id === currentSessionId;
                return (
                  <div
                    key={sess.id}
                    onClick={() => {
                      setCurrentSessionId(sess.id);
                      if (window.innerWidth < 768) setSidebarOpen(false);
                    }}
                    className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs font-medium transition-all ${
                      isActive
                        ? "bg-primary/15 text-primary font-bold border border-primary/20"
                        : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 truncate">
                      <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />
                      <span className="truncate">{sess.title}</span>
                    </div>

                    <button
                      onClick={(e) => handleDeleteSession(e, sess.id)}
                      className="opacity-0 group-hover:opacity-100 hover:text-destructive p-1 rounded transition-opacity"
                      title="Delete chat"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Bottom User Bar */}
            <div className="p-3 border-t border-border/60 bg-muted/30">
              <div className="flex items-center gap-3 px-2 py-1.5 rounded-xl">
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#5b51d8] to-[#8075ff] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground truncate">{formattedName}</p>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 capitalize text-muted-foreground">
                    {role === "admin" ? "Placement Admin" : role === "company" ? "Recruiter" : "Candidate"}
                  </Badge>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* 2. Main ChatGPT Conversation Panel */}
      <main className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
        
        {/* Top Floating Action Bar (Open Sidebar button when closed) */}
        <div className="h-12 border-b border-border/40 px-4 flex items-center justify-between shrink-0 bg-background/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSidebarOpen(true)}
                      className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                    >
                      <PanelLeftOpen className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Open sidebar</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {!sidebarOpen && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNewChat}
                className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" /> New chat
              </Button>
            )}

            <div className="flex items-center gap-2 ml-1">
              <span className="font-display font-bold text-xs text-foreground truncate max-w-[200px] md:max-w-md">
                {currentSession?.title || "New Chat"}
              </span>
              {role === "admin" && (
                <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30 text-[10px]">
                  Full Database Access
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewChat}
              className="h-8 px-2.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground text-xs gap-1.5 font-medium"
              title="New chat"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New chat</span>
            </Button>
          </div>
        </div>

        {/* Chat Thread Container */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 scrollbar-thin">
          
          {/* EMPTY STATE: ChatGPT Centered Greeting */}
          {(!currentSession || currentSession.messages.length === 0) ? (
            <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center px-4 -mt-8 space-y-8">
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-2"
              >
                <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                  Good to see you, {formattedName}.
                </h1>
                <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                  {role === "admin"
                    ? "Ask me anything about candidate performance, previous tests, company drives, or request a complete placement report with live database forensic accuracy."
                    : role === "company"
                    ? "Manage candidate test submissions, evaluate scoring percentiles, and orchestrate multi-round recruitment drives."
                    : "Your dedicated placement mentor for technical MCQs, coding interviews, resume improvement, and drive schedule prep."}
                </p>
              </motion.div>

              {/* Starter Suggestion Grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left"
              >
                {starterPrompts.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSendMessage(item.prompt)}
                    className="group p-4 rounded-2xl bg-card border border-border/70 hover:border-primary/50 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transform group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                        {item.prompt}
                      </p>
                    </div>
                  </div>
                ))}
              </motion.div>

            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-8 pb-8">
              {currentSession.messages.map((msg) => {
                const isUser = msg.sender === "user";

                if (isUser) {
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-end"
                    >
                      <div className="rounded-[22px] bg-[#2f2f2f] text-white px-5 py-3 text-[14.5px] leading-relaxed max-w-[85%] md:max-w-[75%] shadow-sm whitespace-pre-wrap selection:bg-primary/30">
                        {msg.text}
                      </div>
                    </motion.div>
                  );
                }

                // Assistant message: direct clean typography on canvas with NO card box
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-start w-full group"
                  >
                    <div className="prose dark:prose-invert max-w-none w-full text-[15px] leading-7 break-words text-foreground font-normal selection:bg-primary/30">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ children }) => (
                            <h1 className="text-xl font-bold text-foreground mt-5 mb-2.5 tracking-tight border-b border-border pb-1">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-lg font-bold text-foreground mt-4 mb-2 tracking-tight">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-base font-bold text-foreground mt-3 mb-1.5">
                              {children}
                            </h3>
                          ),
                          p: ({ children }) => (
                            <p className="mb-3 leading-7 text-foreground/90 font-normal">
                              {children}
                            </p>
                          ),
                          ul: ({ children }) => (
                            <ul className="my-2.5 space-y-1.5 pl-5 list-disc marker:text-primary">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="my-2.5 space-y-1.5 pl-5 list-decimal marker:text-primary">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => (
                            <li className="leading-relaxed pl-1">
                              {children}
                            </li>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold text-foreground">
                              {children}
                            </strong>
                          ),
                          table: ({ node, ...props }) => (
                            <div className="overflow-x-auto my-4 rounded-xl border border-border shadow-sm not-prose bg-card">
                              <table className="min-w-full divide-y divide-border text-xs text-left" {...props} />
                            </div>
                          ),
                          th: ({ node, ...props }) => (
                            <th className="bg-muted/80 px-4 py-3 font-bold text-foreground text-xs uppercase tracking-wider text-left border-b border-border" {...props} />
                          ),
                          td: ({ node, ...props }) => (
                            <td className="px-4 py-2.5 border-t border-border/60 text-foreground/90 text-xs whitespace-normal leading-relaxed" {...props} />
                          ),
                          code: ({ node, inline, className, children, ...props }: any) => {
                            const match = /language-(\w+)/.exec(className || "");
                            const lang = match ? match[1] : "";
                            const codeContent = String(children).replace(/\n$/, "");

                            if (inline) {
                              return (
                                <code className="bg-muted/80 text-foreground px-1.5 py-0.5 rounded text-xs font-mono border border-border/40 font-semibold" {...props}>
                                  {children}
                                </code>
                              );
                            }

                            // Interactive KPI Metric Cards
                            if (lang === "kpi") {
                              try {
                                const kpis = JSON.parse(codeContent);
                                if (Array.isArray(kpis)) {
                                  return (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 my-4 w-full not-prose">
                                      {kpis.map((kpi: any, idx: number) => (
                                        <div
                                          key={idx}
                                          className="p-3.5 rounded-xl bg-card border border-border/80 shadow-sm flex flex-col justify-between hover:border-primary/50 transition-all"
                                        >
                                          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                            {kpi.label}
                                          </div>
                                          <div className="text-2xl font-black mt-1 font-mono tracking-tight" style={{ color: kpi.color || "inherit" }}>
                                            {kpi.value}
                                          </div>
                                          {kpi.sub && (
                                            <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                                              {kpi.sub}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  );
                                }
                              } catch {
                                // Fallback
                              }
                            }

                            // Interactive Telemetry Bar Chart
                            if (lang === "chart") {
                              try {
                                const chartConfig = JSON.parse(codeContent);
                                const data = chartConfig.data || [];
                                const title = chartConfig.title || "Institutional Placement Telemetry Chart";
                                return (
                                  <div className="my-4 p-4 rounded-2xl bg-card border border-border/80 shadow-sm w-full not-prose">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <BarChart3 className="h-4 w-4 text-primary" />
                                        <h4 className="text-sm font-semibold text-foreground tracking-tight">{title}</h4>
                                      </div>
                                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">Live Chart</span>
                                    </div>
                                    <div className="h-56 w-full pt-2">
                                      <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                          <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                                          <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                                          <RechartsTooltip
                                            contentStyle={{
                                              backgroundColor: "rgba(15, 23, 42, 0.95)",
                                              borderColor: "rgba(255, 255, 255, 0.1)",
                                              borderRadius: "8px",
                                              color: "#fff",
                                              fontSize: "12px",
                                            }}
                                            itemStyle={{ color: "#fff" }}
                                          />
                                          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                            {data.map((entry: any, index: number) => (
                                              <Cell
                                                key={`cell-${index}`}
                                                fill={entry.color || (index === 0 ? "#3b82f6" : index === 1 ? "#6366f1" : index === 2 ? "#10b981" : index === 3 ? "#ef4444" : "#8b5cf6")}
                                              />
                                            ))}
                                          </Bar>
                                        </BarChart>
                                      </ResponsiveContainer>
                                    </div>
                                  </div>
                                );
                              } catch {
                                // Fallback
                              }
                            }

                            // Interactive Proctor Integrity Gauge Card
                            if (lang === "proctor") {
                              try {
                                const pData = JSON.parse(codeContent);
                                const score = Number(pData.score ?? 100);
                                const candidate = pData.candidate || "Candidate";
                                const tabSwitches = pData.tab_switches ?? 0;
                                const violations = Array.isArray(pData.violations) ? pData.violations : [];
                                const status = score >= 85 ? "Clean / Valid" : score >= 60 ? "Warning / Suspicious" : "Flagged Cheat / High Risk";
                                const badgeColor = score >= 85 ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" : score >= 60 ? "text-amber-500 bg-amber-500/10 border-amber-500/20" : "text-rose-500 bg-rose-500/10 border-rose-500/20";

                                return (
                                  <div className="my-4 p-4 rounded-2xl bg-card border border-border shadow-sm w-full not-prose">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <ShieldCheck className="h-4 w-4 text-primary" />
                                        <span className="font-semibold text-sm text-foreground">Proctor Integrity Report: {candidate}</span>
                                      </div>
                                      <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${badgeColor}`}>
                                        {status}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-4 mt-3">
                                      <div className="text-3xl font-extrabold font-mono text-foreground">
                                        {score}<span className="text-sm text-muted-foreground font-normal">/100</span>
                                      </div>
                                      <div className="flex-1">
                                        <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                                          <div
                                            className={`h-full rounded-full transition-all duration-500 ${score >= 85 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-rose-500"}`}
                                            style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                                          />
                                        </div>
                                        <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                                          <span>Tab switches: {tabSwitches}</span>
                                          <span>Violations: {violations.length > 0 ? violations.join(", ") : "None detected"}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              } catch {
                                // Fallback
                              }
                            }

                            return (
                              <div className="relative my-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-100 overflow-hidden shadow-md">
                                <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 text-[11px] text-zinc-400 font-mono">
                                  <span>{lang || "Code"}</span>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(codeContent);
                                      toast.success("Code copied to clipboard!");
                                    }}
                                    className="flex items-center gap-1.5 hover:text-white transition-colors"
                                  >
                                    <Copy className="h-3 w-3" />
                                    <span>Copy code</span>
                                  </button>
                                </div>
                                <pre className="p-4 overflow-x-auto text-xs leading-relaxed font-mono" {...props}>
                                  {children}
                                </pre>
                              </div>
                            );
                          },
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>

                    {/* ChatGPT minimal toolbar beneath assistant message */}
                    <div className="flex items-center gap-1 mt-2 -ml-1 text-muted-foreground opacity-90 transition-opacity">
                      <button
                        onClick={() => copyText(msg.id, msg.text)}
                        className="p-1.5 rounded-lg hover:bg-muted hover:text-foreground transition-colors"
                        title="Copy"
                      >
                        {copiedId === msg.id ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                      </button>

                      <button
                        onClick={() => toggleSpeech(msg.id, msg.text)}
                        className="p-1.5 rounded-lg hover:bg-muted hover:text-foreground transition-colors"
                        title="Read aloud"
                      >
                        {ttsActiveId === msg.id && isSpeaking ? (
                          <VolumeX className="h-4 w-4 text-primary animate-pulse" />
                        ) : (
                          <Volume2 className="h-4 w-4" />
                        )}
                      </button>

                      <button
                        onClick={() => handleRegenerate(msg)}
                        className="p-1.5 rounded-lg hover:bg-muted hover:text-foreground transition-colors"
                        title="Regenerate response"
                      >
                        <RotateCw className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}

              {/* Typing / Generating Indicator */}
              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2.5 py-4 text-muted-foreground"
                >
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                  </span>
                  <span className="text-sm font-medium animate-pulse">
                    {isDeepThinking ? "Thinking deeply and cross-referencing database signals…" : "Thinking…"}
                  </span>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

        </div>

        {/* 3. Bottom ChatGPT Floating Input Bar */}
        <div className="p-4 md:pb-6 bg-gradient-to-t from-background via-background to-transparent shrink-0">
          <div className="max-w-3xl mx-auto">
            
            <div className="relative flex items-center rounded-[28px] bg-muted/50 dark:bg-[#212121] border border-border/80 shadow-md focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 transition-all p-2 pl-3">
              
              {/* Left Action / Attach button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => handleSendMessage("Generate a complete placement drive report")}
                      className="h-9 w-9 rounded-full hover:bg-background/80 text-muted-foreground hover:text-foreground flex items-center justify-center shrink-0 transition-colors"
                      title="Quick prompt"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Quick Placement Actions</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                rows={1}
                className="flex-1 max-h-32 min-h-[36px] resize-none bg-transparent py-2 px-3 text-sm focus:outline-none placeholder:text-muted-foreground text-foreground leading-normal"
              />

              {/* Right Action Icons: Think, Mic, Send */}
              <div className="flex items-center gap-1.5 shrink-0 pr-1">
                {/* Think Pill Toggle */}
                <button
                  type="button"
                  onClick={() => setIsDeepThinking(!isDeepThinking)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isDeepThinking
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-background/60 hover:bg-background border border-border/70 text-muted-foreground hover:text-foreground"
                  }`}
                  title="Deep reasoning mode"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>Think</span>
                </button>

                {/* Voice Input Mic */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={isListening ? stopListening : startListening}
                        className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
                          isListening
                            ? "bg-destructive text-white animate-pulse"
                            : "hover:bg-background/80 text-muted-foreground hover:text-foreground"
                        }`}
                        title={isListening ? "Stop listening" : "Voice input"}
                      >
                        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{isListening ? "Stop listening" : "Voice input"}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Send Button: circular button with up arrow */}
                <button
                  type="button"
                  disabled={!input.trim() || isProcessing}
                  onClick={() => handleSendMessage()}
                  className="h-8 w-8 rounded-full bg-foreground text-background flex items-center justify-center disabled:opacity-30 hover:opacity-90 transition-all shadow-sm"
                  title="Send message"
                >
                  <ArrowUp className="h-4 w-4 stroke-[2.5]" />
                </button>
              </div>

            </div>

            <p className="text-[11px] text-center text-muted-foreground/80 mt-2 font-normal">
              Placement AI can make mistakes. Verify critical placement statistics and forensic audit logs before publishing.
            </p>

          </div>
        </div>

      </main>

    </div>
  );
}
