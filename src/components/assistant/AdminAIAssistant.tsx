import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSpeech } from "@/hooks/useSpeech";
import { askGemini } from "@/lib/gemini";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from "recharts";
import {
  Bot, Mic, MicOff, Volume2, VolumeX, Send, Sparkles, Loader2,
  Database, UserCheck, ShieldAlert, Building2, ClipboardList, BarChart3,
  X, ChevronRight, CornerDownLeft, RefreshCw, Maximize2, Minimize2,
  MoveDiagonal2, ChevronDown, ShieldCheck, ArrowUpRight, HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  thought?: string | null;
  data?: any;
  timestamp: string;
}

// Parses <think>...</think> tags if Think mode was active
function parseThinkTags(raw: string): { thought: string | null; cleanText: string } {
  const match = raw.match(/<think>([\s\S]*?)<\/think>/i);
  if (match) {
    const thought = match[1].trim();
    const cleanText = raw.replace(/<think>[\s\S]*?<\/think>/i, "").trim();
    return { thought, cleanText };
  }
  return { thought: null, cleanText: raw };
}

export function AdminAIAssistant() {
  const { role, user } = useAuth();
  if (role !== "admin") return null;

  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 480, height: 620 });
  const [isDragging, setIsDragging] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "👋 Hello Admin! I am your **Placement Intelligence Oracle**.\n\nI have complete administrative-level read access to institutional records, candidate test results, proctoring violation logs, and visiting company drives. How may I assist you?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeepThinking, setIsDeepThinking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [expandedThoughtId, setExpandedThoughtId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (transcript) setInput(transcript);
  }, [transcript]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isProcessing]);

  // Corner resize handler (top-left)
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = dimensions.width;
    const startHeight = dimensions.height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = startX - moveEvent.clientX;
      const deltaY = startY - moveEvent.clientY;
      const maxWidth = typeof window !== "undefined" ? window.innerWidth * 0.94 : 950;
      const maxHeight = typeof window !== "undefined" ? window.innerHeight * 0.90 : 880;

      const newWidth = Math.min(Math.max(startWidth + deltaX, 380), maxWidth);
      const newHeight = Math.min(Math.max(startHeight + deltaY, 460), maxHeight);
      setDimensions({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const quickPrompts = [
    "📊 Overall Placement & Pass Rate Summary",
    "⭐ Top 5 Candidates by CGPA",
    "🚨 Proctoring & Tab Switch Integrity Logs",
    "🏢 Active Company Drives & Requirements",
  ];

  // Fetch complete institutional database context
  const executeQuery = async (queryText: string) => {
    try {
      const [
        studentsRes,
        companiesRes,
        testsRes,
        attemptsRes,
        roundPartsRes,
        statsRes
      ] = await Promise.all([
        supabase.from("profiles").select("id, name, email, usn, branch, cgpa, backlogs, skills, year_of_passing").order("cgpa", { ascending: false }).limit(60),
        supabase.from("companies").select("id, name, job_role, salary_package, job_location, max_backlogs, allowed_branches, eligibility_criteria, contact_info").order("created_at", { ascending: false }).limit(25),
        supabase.from("tests").select("id, title, scheduled_date, duration, registration_deadline, pass_criteria, company_id, companies(name)").order("scheduled_date", { ascending: true }).limit(25),
        supabase.from("test_attempts").select("id, student_id, total_score, passed, tab_switches, auto_submitted, proctor_events, completed_at, tests(title), profiles(name, usn, branch, cgpa)").order("completed_at", { ascending: false }).limit(40),
        supabase.from("round_participants").select("id, status, student_id, score, drive_rounds(company_id, round_number, round_name, round_type, companies(name)), profiles(name, usn, branch, cgpa)").limit(50),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);

      const profiles = studentsRes.data ?? [];
      const companies = companiesRes.data ?? [];
      const tests = testsRes.data ?? [];
      const attempts = attemptsRes.data ?? [];
      const roundParts = roundPartsRes.data ?? [];

      const attempterIds = new Set(attempts.map((a: any) => a.student_id));
      const totalAttended = attempterIds.size;
      const passedAttempts = attempts.filter((a: any) => a.passed);
      const totalPassed = new Set(passedAttempts.map((a: any) => a.student_id)).size;
      const totalFailed = Math.max(0, totalAttended - totalPassed);
      const qualifiedParts = roundParts.filter((rp: any) => rp.status === "qualified");
      const totalPlaced = new Set(qualifiedParts.map((rp: any) => rp.student_id)).size;
      const passRate = attempts.length > 0 ? Math.round((passedAttempts.length / attempts.length) * 100) : 0;

      const attemptsWithProctor = attempts.map((a: any) => {
        const tabSwitches = a.tab_switches || 0;
        let gadgetDetected = false;
        if (Array.isArray(a.proctor_events)) {
          gadgetDetected = a.proctor_events.some((e: any) => {
            const t = (e.type || e.event || e.gadget || "").toLowerCase();
            return t.includes("device") || t.includes("gadget") || t.includes("phone") || e.device_detected;
          });
        }
        let pScore = 100 - (tabSwitches * 15) - (gadgetDetected ? 40 : 0);
        if (a.auto_submitted) pScore = Math.min(pScore, 20);
        pScore = Math.max(0, Math.min(100, pScore));

        return {
          candidate: a.profiles?.name || "Candidate",
          usn: a.profiles?.usn || "N/A",
          branch: a.profiles?.branch || "General",
          cgpa: a.profiles?.cgpa ?? "N/A",
          test: a.tests?.title || "Assessment",
          score: a.total_score ?? 0,
          passed: a.passed ? "Passed" : "Failed",
          tab_switches: tabSwitches,
          gadgetDetected,
          auto_submitted: a.auto_submitted,
          proctor_score: pScore + "/100",
          proctor_status: pScore >= 85 ? "Clean" : pScore >= 60 ? "Warning / Suspicious" : "Flagged Cheat",
        };
      });

      const dbContext = {
        totalRegisteredStudents: statsRes.count ?? profiles.length,
        totalStudentsAttended: totalAttended,
        totalStudentsPassed: totalPassed,
        totalStudentsFailed: totalFailed,
        totalStudentsPlaced: totalPlaced,
        platformPassRate: passRate + "%",
        candidateProfiles: profiles.map((p: any) => ({
          name: p.name || "Student",
          usn: p.usn || "N/A",
          branch: p.branch || "General",
          batch: p.year_of_passing || "N/A",
          cgpa: p.cgpa,
          backlogs: p.backlogs ?? 0,
          skills: p.skills || [],
        })),
        visitingRecruiters: companies.map((c: any) => ({
          name: c.name,
          role: c.job_role,
          ctc: c.salary_package,
          location: c.job_location,
          criteria: c.eligibility_criteria,
          allowed_branches: c.allowed_branches,
        })),
        scheduledAssessments: tests,
        candidateAttemptsAndProctor: attemptsWithProctor,
        qualifiedDriveParticipants: qualifiedParts.map((rp: any) => ({
          name: rp.profiles?.name,
          usn: rp.profiles?.usn,
          company: rp.drive_rounds?.companies?.name,
          status: "Qualified",
        })),
      };

      const thinkDirective = isDeepThinking
        ? "CRITICAL: You are in DEEP THINK MODE. Encapsulate your comprehensive step-by-step reasoning, query decomposition, and forensic database cross-referencing inside <think>...</think> tags. After </think>, output your clean, final executive response.\n\n"
        : "Output your clean, executive response directly without <think> tags.\n\n";

      const chartDirective = "CRITICAL CHARTS POLICY:\n" +
        "- ONLY output a ```chart block IF AND ONLY IF the user explicitly asks for a chart, graph, diagram, plot, or visual representation (e.g. 'show a chart', 'graph the results', 'plot scores').\n" +
        "- DO NOT produce ```chart blocks for regular text questions, tables, eligibility lookups, or summaries unless specifically requested.\n\n";

      const systemPrompt = `You are the 'Placement Intelligence Oracle', the high-level executive recruitment intelligence system for university administrators.
You have administrative-level read access to the complete placement and assessment database:
${JSON.stringify(dbContext, null, 2)}

${thinkDirective}
${chartDirective}
Instructions:
1. Provide precise, executive-level insights, candidate statistics, company drive statuses, and proctoring audit summaries.
2. When asked about placement summary, student attendance, pass/fail counts, or eligible candidates:
   - Provide summary numbers: Registered, Attended, Passed, Failed, Placed.
   - Output structured Markdown tables with clear columns:
     Candidate Attendance & Results: | Candidate Name | USN | Branch | CGPA | Test Title | Score | Result | Proctor Score | Proctor Notes |
     Eligible Candidates: | Candidate Name | USN | Branch | CGPA | Eligible Companies |
3. Specifically name candidates (e.g. Hemanth, Roshan, etc.), their USN, CGPA, branch, and proctor score (e.g. 70/100 for 2 tab switches).
4. Detail proctoring anomalies (tab switches, auto-submissions, gadgets) when answering about exam integrity.
5. Format responses cleanly using bold headers, bullet points, and markdown tables.`;

      const geminiResponse = await askGemini(queryText, systemPrompt);
      const { thought, cleanText } = parseThinkTags(geminiResponse);

      return { text: cleanText, thought, data: dbContext };
    } catch (err: any) {
      console.warn("Admin AI Assistant query fallback:", err);
      return {
        text: `🤖 **Placement Oracle Analysis** for *"${queryText}"*:\n\n` +
          `• **Database Snapshot**: Active campus recruitment cycle with registered candidate profiles and scheduled technical drives.\n` +
          `• **AI Guidance**: Filter candidates by minimum CGPA cutoffs and monitor live proctoring integrity streams during active tests.`,
        thought: null,
      };
    }
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isProcessing) return;

    setInput("");
    setTranscript("");
    stopSpeaking();
    if (isListening) stopListening();

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      const result = await executeQuery(query);
      const botMsgId = (Date.now() + 1).toString();

      const botMsg: Message = {
        id: botMsgId,
        sender: "assistant",
        text: result.text,
        thought: result.thought,
        data: result.data,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
      if (result.thought) {
        setExpandedThoughtId(botMsgId);
      }

      if (ttsEnabled) {
        speak(result.text);
      }
    } catch {
      toast.error("Failed to generate response");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    stopSpeaking();
    setMessages([
      {
        id: "cleared",
        sender: "assistant",
        text: "Chat cleared! Ask me anything about candidate rankings, company drives, proctoring violations, or student eligibility.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{
              width: isMaximized ? "min(94vw, 880px)" : `${dimensions.width}px`,
              height: isMaximized ? "min(88vh, 800px)" : `${dimensions.height}px`,
            }}
            className="relative mb-4 flex flex-col overflow-hidden rounded-3xl border border-primary/40 bg-card/95 text-foreground shadow-[0_25px_90px_rgba(0,0,0,0.4)] backdrop-blur-3xl transition-all duration-150"
          >
            {/* Draggable Corner Resize Handle (Top-Left) */}
            {!isMaximized && (
              <div
                onMouseDown={handleResizeStart}
                className="group absolute top-0 left-0 z-30 flex h-6 w-6 cursor-nwse-resize items-center justify-center rounded-br-xl bg-muted/40 hover:bg-primary/20 border-r border-b border-border transition-colors"
                title="Drag to resize assistant window"
              >
                <MoveDiagonal2 className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors rotate-90" />
              </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-primary/15 via-purple-500/10 to-transparent px-5 py-4 pl-8">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#5b51d8] to-purple-600 text-white shadow-[0_0_20px_rgba(91,81,216,0.5)]">
                  <Bot className="h-5 w-5" />
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-sm font-bold text-foreground tracking-wide">
                      Placement Oracle AI
                    </h3>
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] px-1.5 py-0 font-mono">
                      Admin Intelligence
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Full unredacted institutional database context</p>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-1">
                {/* Maximize / Restore */}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                  title={isMaximized ? "Restore standard size" : "Expand window"}
                >
                  {isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </Button>

                {/* Voice Readout Toggle */}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (ttsEnabled) stopSpeaking();
                    setTtsEnabled(!ttsEnabled);
                  }}
                  className={`h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground ${
                    ttsEnabled ? "text-primary bg-primary/10" : ""
                  }`}
                  title={ttsEnabled ? "Mute voice readout" : "Enable voice readout"}
                >
                  {ttsEnabled ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4" />}
                </Button>

                {/* Clear Chat */}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleClear}
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                  title="Clear conversation"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>

                {/* Close Drawer */}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                  title="Minimize assistant"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs scrollbar-thin">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col gap-1.5 ${msg.sender === "user" ? "items-end" : "items-start"}`}
                >
                  {/* Collapsible Deep Thought Accordion if present */}
                  {msg.thought && (
                    <div className="w-full max-w-[92%] mb-1 rounded-2xl border border-primary/20 bg-primary/5 overflow-hidden">
                      <button
                        onClick={() => setExpandedThoughtId(expandedThoughtId === msg.id ? null : msg.id)}
                        className="flex w-full items-center justify-between px-3.5 py-2 text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3 text-amber-500 animate-pulse" />
                          Forensic Reasoning &amp; Thought Process
                        </span>
                        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${expandedThoughtId === msg.id ? "rotate-180" : ""}`} />
                      </button>
                      {expandedThoughtId === msg.id && (
                        <div className="px-3.5 pb-2.5 pt-1 text-[11px] text-muted-foreground font-mono whitespace-pre-wrap border-t border-primary/10 leading-relaxed">
                          {msg.thought}
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`flex gap-2 max-w-full ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.sender === "assistant" && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/25 mt-0.5 shadow-sm">
                        <Bot className="h-3.5 w-3.5" />
                      </div>
                    )}

                    <div
                      className={`max-w-[88%] rounded-2xl p-4 leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-none shadow-md text-xs font-medium"
                          : "bg-muted/40 border border-border text-foreground rounded-tl-none shadow-sm"
                      }`}
                    >
                      {msg.sender === "assistant" ? (
                        <div className="prose dark:prose-invert max-w-none text-xs leading-relaxed space-y-2">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ children }) => <p className="mb-2 leading-relaxed text-[13px] text-foreground/90 last:mb-0">{children}</p>,
                              strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                              h1: ({ children }) => <h1 className="text-base font-bold text-foreground mb-2 mt-3 border-b border-border pb-1">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-sm font-bold text-primary mb-1.5 mt-2.5">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-xs font-bold text-foreground mb-1 mt-2">{children}</h3>,
                              ul: ({ children }) => <ul className="my-2 space-y-1 pl-4 list-disc marker:text-primary">{children}</ul>,
                              ol: ({ children }) => <ol className="my-2 space-y-1 pl-4 list-decimal marker:text-primary">{children}</ol>,
                              li: ({ children }) => <li className="text-[12.5px] text-foreground/90 leading-normal pl-0.5">{children}</li>,
                              table: ({ node, ...props }) => (
                                <div className="overflow-x-auto my-3 rounded-xl border border-border/80 shadow-sm not-prose bg-card">
                                  <table className="min-w-full divide-y divide-border text-[11px] text-left" {...props} />
                                </div>
                              ),
                              th: ({ node, ...props }) => (
                                <th className="bg-muted/70 px-3 py-2 font-bold text-foreground text-[10px] uppercase tracking-wider text-left border-b border-border" {...props} />
                              ),
                              td: ({ node, ...props }) => (
                                <td className="px-3 py-2 border-t border-border/60 text-foreground/90 text-[11px] whitespace-normal leading-relaxed font-mono" {...props} />
                              ),
                              code: ({ node, inline, className, children, ...props }: any) => {
                                const match = /language-(\w+)/.exec(className || "");
                                const lang = match ? match[1] : "";
                                const codeContent = String(children).replace(/\n$/, "");

                                if (inline) {
                                  return (
                                    <code className="bg-muted text-primary px-1.5 py-0.5 rounded font-mono text-[11px] border border-border/50" {...props}>
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
                                        <div className="grid grid-cols-2 gap-2 my-2.5 w-full not-prose">
                                          {kpis.map((kpi: any, idx: number) => (
                                            <div key={idx} className="p-2.5 rounded-xl bg-card border border-border/80 shadow-sm flex flex-col justify-between">
                                              <div className="text-[10px] font-medium text-muted-foreground uppercase">{kpi.label}</div>
                                              <div className="text-xl font-extrabold mt-0.5 font-mono" style={{ color: kpi.color || "inherit" }}>{kpi.value}</div>
                                              {kpi.sub && <div className="text-[10px] text-muted-foreground mt-0.5">{kpi.sub}</div>}
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    }
                                  } catch { /* fallback */ }
                                }

                                // Interactive Telemetry Bar Chart (ONLY if user asked)
                                if (lang === "chart") {
                                  try {
                                    const chartConfig = JSON.parse(codeContent);
                                    const data = chartConfig.data || [];
                                    const title = chartConfig.title || "Placement Telemetry";
                                    return (
                                      <div className="my-2.5 p-3 rounded-2xl bg-card border border-border/80 shadow-sm w-full not-prose">
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-xs font-semibold text-foreground">{title}</span>
                                          <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary">Live Chart</span>
                                        </div>
                                        <div className="h-44 w-full pt-1">
                                          <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                              <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                                              <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                                              <RechartsTooltip />
                                              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                                {data.map((entry: any, index: number) => (
                                                  <Cell key={`cell-${index}`} fill={entry.color || "#5b51d8"} />
                                                ))}
                                              </Bar>
                                            </BarChart>
                                          </ResponsiveContainer>
                                        </div>
                                      </div>
                                    );
                                  } catch { /* fallback */ }
                                }

                                // Proctor Integrity Card
                                if (lang === "proctor") {
                                  try {
                                    const pData = JSON.parse(codeContent);
                                    const score = Number(pData.score ?? 100);
                                    return (
                                      <div className="my-2.5 p-3 rounded-2xl bg-card border border-border shadow-sm w-full not-prose">
                                        <div className="flex items-center justify-between mb-1 text-xs font-bold text-foreground">
                                          <span>Proctor Audit: {pData.candidate}</span>
                                          <span className="font-mono text-primary">{score}/100</span>
                                        </div>
                                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-1.5">
                                          <div
                                            className={`h-full rounded-full ${score >= 85 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-rose-500"}`}
                                            style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                                          />
                                        </div>
                                      </div>
                                    );
                                  } catch { /* fallback */ }
                                }

                                return (
                                  <pre className="bg-zinc-950 text-zinc-100 p-3 rounded-xl overflow-x-auto text-[11px] font-mono">
                                    <code>{children}</code>
                                  </pre>
                                );
                              },
                            }}
                          >
                            {msg.text}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        msg.text
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isProcessing && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-muted/40 border border-border w-fit text-xs text-muted-foreground animate-pulse">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>{isDeepThinking ? "Thinking deeply and cross-referencing database signals…" : "Consulting placement database…"}</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Starters Carousel */}
            {messages.length <= 2 && (
              <div className="px-4 py-2 border-t border-border/50 bg-muted/20 flex gap-1.5 overflow-x-auto scrollbar-none">
                {quickPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(p)}
                    className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium bg-card border border-border/70 hover:border-primary/50 text-muted-foreground hover:text-foreground transition-all"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <div className="p-3 border-t border-border bg-card">
              <div className="flex items-center gap-1.5 rounded-2xl bg-muted/40 border border-border/80 px-2.5 py-1.5 focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                {/* Think Mode Toggle Pill */}
                <button
                  type="button"
                  onClick={() => setIsDeepThinking(!isDeepThinking)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold transition-all ${
                    isDeepThinking
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-background border border-border/70 text-muted-foreground hover:text-foreground"
                  }`}
                  title="Toggle Deep Step-by-Step Reasoning"
                >
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  <span>Think</span>
                </button>

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask database..."
                  className="flex-1 bg-transparent px-2 text-xs focus:outline-none placeholder:text-muted-foreground text-foreground"
                />

                {/* Voice Mic Button */}
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${
                    isListening ? "bg-destructive text-white animate-pulse" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Voice input"
                >
                  {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                </button>

                {/* Send Button */}
                <button
                  type="button"
                  disabled={!input.trim() || isProcessing}
                  onClick={() => handleSend()}
                  className="h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 hover:opacity-90 transition-all shadow-sm"
                  title="Send"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Trigger Pill on Admin Pages */}
      {!isOpen && (
        <motion.button
          onClick={() => setIsOpen(true)}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="group relative flex items-center gap-2.5 rounded-full bg-gradient-to-r from-[#5b51d8] to-purple-600 p-2.5 pr-4 text-white shadow-[0_8px_30px_rgba(91,81,216,0.5)] hover:shadow-[0_12px_40px_rgba(91,81,216,0.6)] transition-all cursor-pointer border border-white/20"
        >
          <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md">
            <Bot className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 border border-[#5b51d8]" />
            </span>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-extrabold tracking-wide leading-tight flex items-center gap-1">
              Admin AI <Sparkles className="h-3 w-3 text-amber-300" />
            </span>
            <span className="text-[9.5px] text-white/80 font-medium leading-tight">Placement Oracle</span>
          </div>
        </motion.button>
      )}
    </div>
  );
}
