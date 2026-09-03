import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSpeech } from "@/hooks/useSpeech";
import { askGemini } from "@/lib/gemini";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap, Mic, MicOff, Volume2, VolumeX, Send, Sparkles, Loader2,
  Trophy, CheckCircle2, AlertTriangle, BookOpen, Calendar, ChevronDown,
  RefreshCw, Bot, User, ArrowRight
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
  }, [messages, isOpen, isLoading]);

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
5. Keep responses concise, structured, motivating, and easy to read using markdown with bullet points and emojis.`;

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
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="mb-4 flex h-[580px] w-[92vw] max-w-[420px] flex-col overflow-hidden rounded-3xl border border-primary/30 bg-[#0e0e17]/95 shadow-[0_25px_80px_rgba(0,0,0,0.85)] backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-emerald-500/20 via-primary/20 to-transparent px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-primary text-white shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                  <GraduationCap className="h-5 w-5" />
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 border-2 border-[#0e0e17]" />
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-sm font-bold text-white tracking-wide">
                      Student Career AI Mentor
                    </h3>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0 font-mono">
                      Personalized
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400">Scoped to your tests & qualifications</p>
                </div>
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (ttsEnabled) stopSpeaking();
                    setTtsEnabled(!ttsEnabled);
                  }}
                  className={`h-8 w-8 rounded-lg text-slate-400 hover:text-white ${
                    ttsEnabled ? "text-primary bg-primary/10" : ""
                  }`}
                  title={ttsEnabled ? "Disable voice read-out" : "Enable voice read-out"}
                >
                  {ttsEnabled ? <Volume2 className="h-4 w-4 text-emerald-400" /> : <VolumeX className="h-4 w-4" />}
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleClear}
                  className="h-8 w-8 rounded-lg text-slate-400 hover:text-white"
                  title="Clear conversation"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 rounded-lg text-slate-400 hover:text-white"
                  title="Close mentor"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.sender === "assistant" && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mt-0.5">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[82%] rounded-2xl p-3.5 leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-gradient-to-r from-primary to-indigo-600 text-white rounded-tr-none shadow-[0_4px_15px_rgba(108,92,231,0.3)]"
                        : "bg-white/5 border border-white/10 text-slate-200 rounded-tl-none backdrop-blur-md"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                    <div
                      className={`mt-1.5 text-[9px] ${
                        msg.sender === "user" ? "text-white/70 text-right" : "text-slate-400"
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>

                  {msg.sender === "user" && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mt-0.5">
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
                  <div className="rounded-2xl rounded-tl-none border border-white/10 bg-white/5 px-4 py-2.5 text-slate-300">
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
                      <span className="ml-1.5 text-[11px] text-slate-400">Analyzing your assessment telemetry...</span>
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Chips */}
            <div className="border-t border-white/10 bg-white/[0.02] px-4 py-2 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                {quickPrompts.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleSend(q)}
                    disabled={isLoading}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-300 hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Bar */}
            <div className="border-t border-white/10 bg-[#0e0e17] p-3">
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
                      ? "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
                      : "text-slate-400 hover:text-white hover:bg-white/10"
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
                  className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />

                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isLoading}
                  className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all"
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
          <span className="pointer-events-none absolute right-16 top-2 hidden whitespace-nowrap rounded-xl border border-white/10 bg-[#0e0e17]/95 px-3 py-1.5 text-xs font-semibold text-white shadow-xl backdrop-blur-xl md:flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> AI Career Mentor
          </span>
        )}
      </motion.button>
    </div>
  );
}
