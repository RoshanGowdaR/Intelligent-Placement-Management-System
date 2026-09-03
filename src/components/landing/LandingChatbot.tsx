import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Volume2,
  VolumeX,
  RefreshCw,
  ChevronDown,
  ArrowUpRight,
  Shield,
  GraduationCap,
  Building2,
  Cpu,
  Mic,
  MicOff,
  Maximize2,
  Minimize2,
  MoveDiagonal2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { askGemini } from "@/lib/gemini";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const SYSTEM_CONTEXT = `You are "IPMS Concierge AI", the official intelligent AI guide on the landing page of the Intelligent Placement Management System (IPMS v3.0 Elite Edition).
Your mission is to welcome visitors, students, university leadership, and corporate recruiters, and clearly explain all the features and capabilities of our platform.

Key Knowledge Base:
1. WHAT IS IPMS:
   - A next-generation autonomous campus placement, AI assessment & recruitment intelligence ecosystem.
   - Eliminates manual spreadsheets and email chaos, bringing students, colleges, and visiting companies into one synchronized platform.

2. CORE CAPABILITIES:
   - For Students: Real-time automated eligibility screening, AI-proctored technical & aptitude exams (fullscreen lock, webcam multi-face & object anti-cheat, tab-switch monitoring), practice assessments, personalized Gemini AI career roadmap & improvement plans, notifications, and application tracking.
   - For University Administrators & Placement Officers: 3D glassmorphic recruitment command center, live telemetry stream of active test takers, proctoring cheat flags, tokenized recruiter email invitation engine via Gmail SMTP, test scheduling with registration deadlines and strict attend lockouts, automated candidate verification, audit logging, and exportable analytics.
   - For Visiting Companies & Recruiters: Dedicated recruiter portal (/company), self-service onboarding via invite tokens (/company/register), custom assessment builder (MCQ & coding rounds) with instant AI question generation, custom CGPA/backlog cutoff enforcement, access to verified candidate resumes, and forensic drive reports.
   - AI Innovation: Powered by Google Gemini 2.5 Flash for natural language database queries, AI question synthesis, and student coaching. Features voice speech-to-text (STT) and text-to-speech (TTS).
   - Tech Stack: React 18, TypeScript, Vite, Tailwind CSS, Supabase PostgreSQL, TensorFlow.js COCO-SSD computer vision, Nodemailer.

3. LINKS FOR VISITORS:
   - Student & General Signup: /signup
   - Login Portal: /login
   - Company Recruiter Registration: /company/register

Tone & Guidelines:
- Structure answers clearly with short paragraphs, numbered lists, bullet points, and emojis.
- Highlight key terms in bold.
- Suggest next steps (e.g. "Feel free to click Get Started Free or explore recruiter features").`;

const SUGGESTED_QUESTIONS = [
  "What is IPMS?",
  "How does AI proctoring work?",
  "What features are there for students?",
  "How can companies register?",
  "How does AI question generation work?",
];

export function LandingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 440, height: 600 });
  const [isDragging, setIsDragging] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "👋 **Welcome to IPMS!**\n\nI'm your **AI Guide**. Ask me anything about our campus placement ecosystem, AI-proctored tests, student eligibility screening, or visiting recruiter features!",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMaximized]);

  // Speech Recognition (STT) setup
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
          handleSend(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
    }
  }, []);

  // Top-left corner drag to resize handler
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = dimensions.width;
    const startHeight = dimensions.height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      // Pinned to bottom-right, so moving left increases width, moving up increases height
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

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const speakText = (text: string) => {
    if (!speechEnabled || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    // Clean markdown for speech
    const cleanText = text.replace(/[*#_`~\[\]]/g, "").replace(/https?:\/\/\S+/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (customText?: string) => {
    const textToSend = (customText || input).trim();
    if (!textToSend || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const aiResponse = await askGemini(textToSend, SYSTEM_CONTEXT);

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMessage]);
      if (speechEnabled) {
        speakText(aiResponse);
      }
    } catch (err: any) {
      console.error("Chatbot query error:", err);
      const fallbackMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "✨ **Intelligent Placement Management System (IPMS)** provides an end-to-end placement suite:\n\n" +
          "• **Automated Eligibility Screening**: Cross-references student CGPAs, branches, and backlogs against company cutoffs instantly.\n" +
          "• **AI Proctoring**: Dual multi-face and hardware anti-cheat detection during online assessments.\n" +
          "• **Recruiter Portal**: Visiting companies can schedule tests, set registration deadlines, and recruit top candidates.\n\n" +
          "👉 Click **Get Started Free** above to create an account!",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setMessages([
      {
        id: "welcome-cleared",
        role: "assistant",
        content: "Chat cleared! Ask me anything about IPMS features, tests, or recruiter access.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* 1. Chat Dialog Box */}
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
            className="relative mb-4 flex flex-col overflow-hidden rounded-3xl border border-white/20 bg-[#0e0e17]/95 shadow-[0_25px_90px_rgba(0,0,0,0.9)] backdrop-blur-3xl transition-all duration-150"
          >
            {/* Draggable Corner Resize Handle (Top-Left) */}
            {!isMaximized && (
              <div
                onMouseDown={handleResizeStart}
                className="group absolute top-0 left-0 z-30 flex h-6 w-6 cursor-nwse-resize items-center justify-center rounded-br-xl bg-white/5 hover:bg-primary/20 border-r border-b border-white/10 transition-colors"
                title="Drag to resize chatbot"
              >
                <MoveDiagonal2 className="h-3 w-3 text-slate-400 group-hover:text-primary transition-colors rotate-90" />
              </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-primary/20 via-purple-600/15 to-transparent px-5 py-4 pl-8">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-purple-500 text-white shadow-[0_0_20px_rgba(108,92,231,0.6)]">
                  <Bot className="h-5 w-5" />
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 border-2 border-[#0e0e17]" />
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-sm font-bold text-white tracking-wide">
                      IPMS Placement AI
                    </h3>
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] px-1.5 py-0 font-mono">
                      Gemini 2.5
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400">Ask about features, drives & portals</p>
                </div>
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-1">
                {/* Maximize / Restore Toggle */}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="h-8 w-8 rounded-lg text-slate-400 hover:text-white"
                  title={isMaximized ? "Restore standard size" : "Expand screen"}
                >
                  {isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </Button>

                {/* Voice Readout Toggle */}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (speechEnabled && "speechSynthesis" in window) {
                      window.speechSynthesis.cancel();
                      setIsSpeaking(false);
                    }
                    setSpeechEnabled(!speechEnabled);
                  }}
                  className={`h-8 w-8 rounded-lg text-slate-400 hover:text-white ${
                    speechEnabled ? "text-primary bg-primary/10" : ""
                  }`}
                  title={speechEnabled ? "Mute audio read-out" : "Enable voice read-out"}
                >
                  {speechEnabled ? <Volume2 className="h-4 w-4 text-emerald-400" /> : <VolumeX className="h-4 w-4" />}
                </Button>

                {/* Clear Chat */}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleClear}
                  className="h-8 w-8 rounded-lg text-slate-400 hover:text-white"
                  title="Clear conversation"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>

                {/* Minimize / Close */}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 rounded-lg text-slate-400 hover:text-white"
                  title="Close chat"
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
                  className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30 mt-0.5 shadow-sm">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[88%] rounded-2xl p-4 leading-relaxed ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-primary to-indigo-600 text-white rounded-tr-none shadow-[0_4px_15px_rgba(108,92,231,0.3)] text-xs"
                        : "bg-white/[0.04] border border-white/10 text-slate-100 rounded-tl-none backdrop-blur-md shadow-md"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-invert max-w-none text-xs leading-relaxed space-y-2">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => (
                              <p className="mb-2 leading-relaxed text-[13px] text-slate-200 last:mb-0">
                                {children}
                              </p>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-bold text-white bg-primary/25 px-1.5 py-0.5 rounded text-[12.5px] border border-primary/30">
                                {children}
                              </strong>
                            ),
                            h1: ({ children }) => (
                              <h1 className="font-display text-base font-bold text-white mb-2 mt-3 flex items-center gap-1.5 border-b border-white/10 pb-1">
                                {children}
                              </h1>
                            ),
                            h2: ({ children }) => (
                              <h2 className="font-display text-sm font-bold text-primary mb-1.5 mt-2.5 flex items-center gap-1">
                                {children}
                              </h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="font-display text-xs font-bold text-purple-300 mb-1 mt-2">
                                {children}
                              </h3>
                            ),
                            ul: ({ children }) => (
                              <ul className="my-2 space-y-1.5 pl-4 list-disc marker:text-primary">
                                {children}
                              </ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="my-2 space-y-1.5 pl-4 list-decimal marker:text-primary">
                                {children}
                              </ol>
                            ),
                            li: ({ children }) => (
                              <li className="text-[12.5px] text-slate-300 leading-normal pl-0.5">
                                {children}
                              </li>
                            ),
                            code: ({ children }) => (
                              <code className="bg-white/10 text-purple-300 px-1.5 py-0.5 rounded font-mono text-xs border border-white/10">
                                {children}
                              </code>
                            ),
                            a: ({ href, children }) => (
                              <Link
                                to={href || "#"}
                                className="inline-flex items-center gap-1 font-bold text-primary hover:text-white underline underline-offset-4 bg-primary/10 px-2 py-0.5 rounded-md hover:bg-primary/25 transition-all text-xs"
                              >
                                {children} <ArrowUpRight className="h-3 w-3" />
                              </Link>
                            ),
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}

                    <div
                      className={`mt-2 text-[9px] ${
                        msg.role === "user" ? "text-white/70 text-right" : "text-slate-400"
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>

                  {msg.role === "user" && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mt-0.5">
                      <User className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              ))}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30">
                    <Sparkles className="h-3.5 w-3.5 animate-spin" />
                  </div>
                  <div className="rounded-2xl rounded-tl-none border border-white/10 bg-white/5 px-4 py-2.5 text-slate-300 shadow-sm">
                    <span className="flex items-center gap-1 text-[11px]">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce"
                        style={{ animationDelay: "0.4s" }}
                      />
                      <span className="ml-1.5 text-[11px] text-slate-400">Thinking...</span>
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Chips */}
            <div className="border-t border-white/10 bg-white/[0.02] px-4 py-2 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleSend(q)}
                    disabled={isLoading}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-300 hover:border-primary/50 hover:bg-primary/10 hover:text-white transition-all active:scale-95 disabled:opacity-50"
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
                {/* Voice Dictation (STT) */}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={toggleListening}
                  className={`h-10 w-10 shrink-0 rounded-xl transition-all ${
                    isListening
                      ? "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
                      : "text-slate-400 hover:text-white hover:bg-white/10"
                  }`}
                  title={isListening ? "Listening... click to stop" : "Voice input"}
                >
                  {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </Button>

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question about IPMS..."
                  disabled={isLoading}
                  className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />

                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isLoading}
                  className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-r from-primary to-indigo-600 text-white shadow-[0_0_15px_rgba(108,92,231,0.5)] hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all"
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
        className="group relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary via-indigo-600 to-purple-600 text-white shadow-[0_10px_35px_rgba(108,92,231,0.55)] border border-white/25 transition-all"
        aria-label="Toggle IPMS Chatbot"
      >
        {/* Ambient Ring Glow */}
        <span className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary to-purple-600 opacity-50 blur-lg group-hover:opacity-100 transition-opacity" />

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
                <X className="h-6 w-6" />
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
                <Bot className="h-6 w-6" />
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
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Ask IPMS AI
          </span>
        )}
      </motion.button>
    </div>
  );
}
