import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSpeech } from "@/hooks/useSpeech";
import { askGemini } from "@/lib/gemini";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap, Mic, MicOff, Volume2, VolumeX, Send, Sparkles, Loader2,
  Trophy, CheckCircle2, AlertTriangle, BookOpen, Calendar, ChevronDown,
  RefreshCw, Bot, User, ArrowRight, Maximize2, Minimize2, MoveDiagonal2,
  ArrowUpRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
}

export function StudentAIAssistant() {
  const { user, role } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 440, height: 600 });
  const [isDragging, setIsDragging] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "👋 Hi there! I'm your **Personal Placement & Career AI Mentor**.\n\nI have access to your personal assessment scores, CGPA, and registered drives. Ask me how you performed in your tests, which companies you're eligible for, or what technical topics to review next!",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
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

  // Sync speech transcript
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  // Auto scroll
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMaximized, isLoading]);

  // Drag to resize handler (top-left corner)
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

      const maxWidth = typeof window !== "undefined" ? window.innerWidth * 0.94 : 900;
      const maxHeight = typeof window !== "undefined" ? window.innerHeight * 0.88 : 850;

      const newWidth = Math.min(Math.max(startWidth + deltaX, 350), maxWidth);
      const newHeight = Math.min(Math.max(startHeight + deltaY, 440), maxHeight);

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

  // Don't render for non-students
  if (role !== "student" || !user) return null;

  const quickPrompts = [
    "📈 Analyze my test performance & scores",
    "🎯 Which visiting companies am I eligible for?",
    "💡 What technical topics should I practice?",
    "📅 What are my upcoming test schedules?",
  ];

  const handleSend = async (customQuery?: string) => {
    const query = (customQuery || input).trim();
    if (!query || isLoading) return;

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
    setIsLoading(true);

    try {
      // 1. Fetch strictly THIS student's data ONLY (scoped strictly by user.id)
      const [profileRes, attemptsRes, schedulesRes, companiesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("name, email, usn, branch, cgpa, backlogs, skills")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("test_attempts")
          .select("id, total_score, passed, tab_switches, auto_submitted, completed_at, test_id, tests(title, duration, pass_percentage)")
          .eq("student_id", user.id)
          .order("completed_at", { ascending: false }),
        supabase
          .from("schedules")
          .select("id, test_id, registered_at, tests(title, scheduled_date, registration_deadline, duration, pass_percentage)")
          .eq("student_id", user.id),
        supabase
          .from("companies")
          .select("name, job_role, salary_package, min_cgpa, max_backlogs, allowed_branches, test_date")
          .order("created_at", { ascending: false }),
      ]);

      const studentProfile = profileRes.data || { name: user.email, email: user.email };
      const testAttempts = attemptsRes.data || [];
      const schedules = schedulesRes.data || [];
      const companies = companiesRes.data || [];

      // Calculate eligible companies for this specific student
      const studentCgpa = Number(studentProfile.cgpa || 0);
      const studentBacklogs = Number(studentProfile.backlogs || 0);
      const studentBranch = (studentProfile.branch || "").toUpperCase();

      const eligibleCompanies = companies.filter((c) => {
        const minCgpa = Number(c.min_cgpa || 0);
        const maxBacklogs = c.max_backlogs !== null ? Number(c.max_backlogs) : 99;
        const branches = c.allowed_branches || [];

        const cgpaOk = studentCgpa >= minCgpa;
        const backlogOk = studentBacklogs <= maxBacklogs;
        const branchOk = branches.length === 0 || branches.map((b: string) => b.toUpperCase()).includes(studentBranch);

        return cgpaOk && backlogOk && branchOk;
      });

      // Assemble strict student context
      const studentContext = {
        student: {
          name: studentProfile.name,
          email: studentProfile.email,
          usn: studentProfile.usn,
          branch: studentProfile.branch,
          cgpa: studentProfile.cgpa,
          backlogs: studentProfile.backlogs,
          skills: studentProfile.skills,
        },
        assessmentHistory: testAttempts.map((a: any) => ({
          testTitle: a.tests?.title || "Assessment",
          scorePercentage: `${a.total_score}%`,
          passed: a.passed,
          proctoringIntegrity: a.tab_switches > 0 ? `${a.tab_switches} tab switches detected` : "Clean fullscreen verified",
          autoSubmitted: a.auto_submitted,
          date: a.completed_at ? new Date(a.completed_at).toLocaleDateString() : "In progress",
        })),
        registeredUpcomingTests: schedules.map((s: any) => ({
          testTitle: s.tests?.title || "Assessment",
          scheduledDate: s.tests?.scheduled_date ? new Date(s.tests.scheduled_date).toLocaleString() : "TBD",
          registeredOn: s.registered_at ? new Date(s.registered_at).toLocaleDateString() : "Registered",
        })),
        eligibleVisitingCompanies: eligibleCompanies.map((c) => ({
          company: c.name,
          role: c.job_role,
          package: c.salary_package,
          minCgpaRequired: c.min_cgpa,
          maxBacklogsAllowed: c.max_backlogs,
        })),
        totalCompaniesVisiting: companies.length,
      };

      const systemPrompt = `You are the dedicated Personal AI Career & Placement Mentor for student ${studentProfile.name || "Student"} (USN: ${studentProfile.usn || "N/A"}, Branch: ${studentProfile.branch || "General"}).
You have access strictly to THIS student's academic profile and assessment records:
${JSON.stringify(studentContext, null, 2)}

Instructions:
1. Address the student warmly and directly.
2. When answering about test performance, cite their exact scores, tests taken, pass/fail status, and whether any proctoring tab switches occurred.
3. If their scores are low in any test, provide specific, encouraging advice on core topics to revise (Data Structures, Algorithms, Aptitude, Core CS concepts).
4. When answering about company eligibility, clearly list the visiting companies they qualify for based on their CGPA (${studentProfile.cgpa || 0}) and backlogs.
5. Format responses cleanly using bold headers, bullet points, and emojis.`;

      // Call Google Gemini AI
      const aiResponse = await askGemini(query, systemPrompt);

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: aiResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);

      if (ttsEnabled) {
        speak(aiResponse);
      }
    } catch (err: any) {
      console.error("Student AI Assistant error:", err);
      const fallbackMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: `🎓 **Career Guidance for ${user.email}**:\n\n` +
          `• Keep your CGPA above company cutoffs and maintain 0 active backlogs.\n` +
          `• Practice technical and aptitude MCQs under the **My Tests** tab.\n` +
          `• Register for visiting company assessments before the registration deadlines!`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    stopSpeaking();
    setMessages([
      {
        id: "cleared",
        sender: "assistant",
        text: "Chat cleared! Ask me anything about your test performance, eligibility, or preparation tips.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* 1. Chat Drawer / Dialog */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{
              width: isMaximized ? "min(94vw, 840px)" : `${dimensions.width}px`,
              height: isMaximized ? "min(88vh, 780px)" : `${dimensions.height}px`,
            }}
            className="relative mb-4 flex flex-col overflow-hidden rounded-3xl border border-emerald-500/30 bg-card/95 text-foreground shadow-[0_25px_90px_rgba(0,0,0,0.35)] backdrop-blur-3xl transition-all duration-150"
          >
            {/* Draggable Corner Resize Handle (Top-Left) */}
            {!isMaximized && (
              <div
                onMouseDown={handleResizeStart}
                className="group absolute top-0 left-0 z-30 flex h-6 w-6 cursor-nwse-resize items-center justify-center rounded-br-xl bg-muted/40 hover:bg-emerald-500/20 border-r border-b border-border transition-colors"
                title="Drag to resize mentor window"
              >
                <MoveDiagonal2 className="h-3 w-3 text-muted-foreground group-hover:text-emerald-400 transition-colors rotate-90" />
              </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-emerald-500/20 via-primary/20 to-transparent px-5 py-4 pl-8">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-primary text-white shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                  <GraduationCap className="h-5 w-5" />
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-sm font-bold text-foreground tracking-wide">
                      Student Career AI Mentor
                    </h3>
                    <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0 font-mono">
                      Personalized
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Scoped to your tests & qualifications</p>
                </div>
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-1">
                {/* Maximize / Restore */}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                  title={isMaximized ? "Restore standard size" : "Expand screen"}
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
                    ttsEnabled ? "text-emerald-500 bg-emerald-500/10" : ""
                  }`}
                  title={ttsEnabled ? "Disable voice read-out" : "Enable voice read-out"}
                >
                  {ttsEnabled ? <Volume2 className="h-4 w-4 text-emerald-500" /> : <VolumeX className="h-4 w-4" />}
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

                {/* Minimize / Close */}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                  title="Close mentor"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.sender === "assistant" && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mt-0.5 shadow-sm">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[88%] rounded-2xl p-4 leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-none shadow-[0_4px_15px_rgba(16,185,129,0.3)] text-xs"
                        : "bg-muted/40 border border-border text-foreground rounded-tl-none shadow-sm"
                    }`}
                  >
                    {msg.sender === "assistant" ? (
                      <div className="prose dark:prose-invert max-w-none text-xs leading-relaxed space-y-2">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => (
                              <p className="mb-2 leading-relaxed text-[13px] text-foreground/90 last:mb-0">
                                {children}
                              </p>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-bold text-foreground bg-emerald-500/20 px-1.5 py-0.5 rounded text-[12.5px] border border-emerald-500/30">
                                {children}
                              </strong>
                            ),
                            h1: ({ children }) => (
                              <h1 className="font-display text-base font-bold text-foreground mb-2 mt-3 flex items-center gap-1.5 border-b border-border pb-1">
                                {children}
                              </h1>
                            ),
                            h2: ({ children }) => (
                              <h2 className="font-display text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-1.5 mt-2.5 flex items-center gap-1">
                                {children}
                              </h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="font-display text-xs font-bold text-foreground mb-1 mt-2">
                                {children}
                              </h3>
                            ),
                            ul: ({ children }) => (
                              <ul className="my-2 space-y-1.5 pl-4 list-disc marker:text-emerald-500">
                                {children}
                              </ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="my-2 space-y-1.5 pl-4 list-decimal marker:text-emerald-500">
                                {children}
                              </ol>
                            ),
                            li: ({ children }) => (
                              <li className="text-[12.5px] text-foreground/90 leading-normal pl-0.5">
                                {children}
                              </li>
                            ),
                            code: ({ children }) => (
                              <code className="bg-muted text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-mono text-xs border border-border">
                                {children}
                              </code>
                            ),
                            a: ({ href, children }) => (
                              <Link
                                to={href || "#"}
                                className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 hover:underline underline-offset-4 bg-emerald-500/10 px-2 py-0.5 rounded-md hover:bg-emerald-500/20 transition-all text-xs"
                              >
                                {children} <ArrowUpRight className="h-3 w-3" />
                              </Link>
                            ),
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    )}

                    <div
                      className={`mt-2 text-[9px] ${
                        msg.sender === "user" ? "text-white/70 text-right" : "text-muted-foreground"
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>

                  {msg.sender === "user" && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 mt-0.5">
                      <User className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              ))}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Sparkles className="h-3.5 w-3.5 animate-spin" />
                  </div>
                  <div className="rounded-2xl rounded-tl-none border border-border bg-muted/40 px-4 py-2.5 text-muted-foreground shadow-sm">
                    <span className="flex items-center gap-1 text-[11px]">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" />
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce"
                        style={{ animationDelay: "0.4s" }}
                      />
                      <span className="ml-1.5 text-[11px] text-muted-foreground">Analyzing your assessment telemetry...</span>
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Chips */}
            <div className="border-t border-border bg-muted/20 px-4 py-2 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                {quickPrompts.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleSend(q)}
                    disabled={isLoading}
                    className="rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Bar */}
            <div className="border-t border-border bg-card p-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                {/* Voice Microphone (STT) */}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={isListening ? stopListening : startListening}
                  className={`h-10 w-10 shrink-0 rounded-xl transition-all ${
                    isListening
                      ? "bg-destructive text-destructive-foreground animate-pulse"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                  title={isListening ? "Listening... click to stop" : "Speak to AI"}
                >
                  {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </Button>

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about your scores, eligibility, or tests..."
                  disabled={isLoading}
                  className="flex-1 rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />

                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isLoading}
                  className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Floating Circular Launcher Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="group relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-600 to-primary text-white shadow-[0_10px_35px_rgba(16,185,129,0.5)] border border-white/25 transition-all"
        aria-label="Toggle Student Career Mentor"
      >
        {/* Ambient Ring Glow */}
        <span className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 opacity-50 blur-lg group-hover:opacity-100 transition-opacity" />

        <div className="relative flex items-center justify-center">
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <ChevronDown className="h-6 w-6" />
              </motion.div>
            ) : (
              <motion.div
                key="open"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="relative"
              >
                <GraduationCap className="h-6 w-6" />
                <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Floating Tooltip hint when closed */}
        {!isOpen && (
          <span className="pointer-events-none absolute right-16 top-2 hidden whitespace-nowrap rounded-xl border border-border bg-card/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-xl backdrop-blur-xl md:flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" /> AI Career Mentor
          </span>
        )}
      </motion.button>
    </div>
  );
}
