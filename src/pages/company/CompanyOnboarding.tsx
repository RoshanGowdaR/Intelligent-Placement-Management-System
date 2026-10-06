import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { askGemini } from "@/lib/gemini";
import { AnimatedBackground } from "@/components/3d/AnimatedBackground";
import { GlassCard } from "@/components/3d/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Building2, Upload, Sparkles, CheckCircle2, AlertCircle, Plus, Trash2,
  ArrowRight, ShieldCheck, FileText, Loader2, DollarSign, Users, Award,
  Clock, Globe, Phone, Mail, ChevronRight, Layers, HelpCircle
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const AVAILABLE_BRANCHES = [
  "Computer Science (CSE)",
  "Information Science (ISE)",
  "Electronics & Communication (ECE)",
  "Electrical & Electronics (EEE)",
  "Artificial Intelligence & Machine Learning (AIML)",
  "Artificial Intelligence & Data Science (AIDS)",
  "Mechanical Engineering (MECH)",
  "Civil Engineering (CIVIL)",
];

const SUGGESTED_SKILLS = [
  "Java", "Python", "C++", "Data Structures & Algorithms", "SQL",
  "React.js", "Node.js", "System Design", "Cloud (AWS/Azure)",
  "Machine Learning", "Problem Solving", "Object-Oriented Programming"
];

interface DriveRoundForm {
  id: string;
  name: string;
  type: "test" | "interview" | "group_discussion" | "other";
  durationMinutes: number;
  platform: string;
  passingCutoff: number;
}

export default function CompanyOnboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get("mode") === "edit";
  const { user } = useAuth();

  // Company details
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("Information Technology & Services");
  const [description, setDescription] = useState("");

  // HR recruiter info
  const [hrName, setHrName] = useState("");
  const [hrEmail, setHrEmail] = useState("");
  const [hrPhone, setHrPhone] = useState("");

  // Job & LPA package
  const [jobRole, setJobRole] = useState("Software Development Engineer (SDE)");
  const [jobLocation, setJobLocation] = useState("Bangalore / Hybrid");
  const [fixedLpa, setFixedLpa] = useState("12");
  const [variableLpa, setVariableLpa] = useState("2");
  const [totalLpa, setTotalLpa] = useState("14");

  // Eligibility cutoffs
  const [minCgpa, setMinCgpa] = useState("7.0");
  const [maxBacklogs, setMaxBacklogs] = useState("0");
  const [minTenthPct, setMinTenthPct] = useState("60");
  const [minTwelfthPct, setMinTwelfthPct] = useState("60");
  const [allowedBranches, setAllowedBranches] = useState<string[]>([
    "Computer Science (CSE)",
    "Information Science (ISE)",
    "Electronics & Communication (ECE)",
    "Artificial Intelligence & Machine Learning (AIML)"
  ]);

  // Skills
  const [skills, setSkills] = useState<string[]>([
    "Data Structures & Algorithms",
    "Java",
    "Python",
    "Problem Solving"
  ]);
  const [skillInput, setSkillInput] = useState("");

  // Rounds pipeline
  const [rounds, setRounds] = useState<DriveRoundForm[]>([
    {
      id: "1",
      name: "Round 1: Online Technical & Coding Assessment",
      type: "test",
      durationMinutes: 90,
      platform: "HackerRank / IPMS Platform",
      passingCutoff: 65,
    },
    {
      id: "2",
      name: "Round 2: Technical Interview (Core CS & Problem Solving)",
      type: "interview",
      durationMinutes: 45,
      platform: "Google Meet / Microsoft Teams",
      passingCutoff: 70,
    },
    {
      id: "3",
      name: "Round 3: Techno-Managerial & HR Fitment Round",
      type: "interview",
      durationMinutes: 30,
      platform: "Google Meet / In-Person",
      passingCutoff: 60,
    }
  ]);

  // Document upload & AI state
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [isExtractingAI, setIsExtractingAI] = useState(false);
  const [missingFieldsNotice, setMissingFieldsNotice] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Load existing company data if available
  useEffect(() => {
    async function loadCompanyData() {
      if (!user) return;
      try {
        const { data: comp } = await supabase
          .from("companies")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (comp) {
          setCompanyId(comp.id);
          if (comp.name) setCompanyName(comp.name);
          if (comp.website) setWebsite(comp.website);
          if (comp.industry) setIndustry(comp.industry);
          if (comp.description) setDescription(comp.description);
          if (comp.email) setHrEmail(comp.email);
          if (comp.job_role) setJobRole(comp.job_role);
          if (comp.job_location) setJobLocation(comp.job_location);
          if (comp.max_backlogs !== null) setMaxBacklogs(String(comp.max_backlogs));
          if (comp.allowed_branches && comp.allowed_branches.length > 0) {
            setAllowedBranches(comp.allowed_branches);
          }
          if (comp.skills_priority && Array.isArray(comp.skills_priority)) {
            setSkills(comp.skills_priority as string[]);
          }

          // Parse contact_info JSON
          const contact = (comp.contact_info as any) || {};
          if (contact.hr_name) setHrName(contact.hr_name);
          if (contact.hr_phone) setHrPhone(contact.hr_phone);
          if (contact.fixed_lpa) setFixedLpa(String(contact.fixed_lpa));
          if (contact.variable_lpa) setVariableLpa(String(contact.variable_lpa));
          if (contact.rounds_detail && Array.isArray(contact.rounds_detail)) {
            setRounds(contact.rounds_detail);
          }

          // Parse salary package
          if (comp.salary_package) {
            const raw = comp.salary_package.replace(/[^0-9.]/g, "");
            if (raw) setTotalLpa(raw);
          }

          // Parse eligibility criteria JSON
          const elig = (comp.eligibility_criteria as any) || {};
          if (elig.min_cgpa) setMinCgpa(String(elig.min_cgpa));
          if (elig.min_tenth_pct) setMinTenthPct(String(elig.min_tenth_pct));
          if (elig.min_twelfth_pct) setMinTwelfthPct(String(elig.min_twelfth_pct));
        } else {
          // Prefill email from auth user if available
          if (user.email) setHrEmail(user.email);
          if (user.user_metadata?.name) setHrName(user.user_metadata.name);
          if (user.user_metadata?.company_name) setCompanyName(user.user_metadata.company_name);
        }
      } catch (err) {
        console.error("Failed to load company profile:", err);
      } finally {
        setInitialLoading(false);
      }
    }

    loadCompanyData();
  }, [user]);

  // Recalculate total LPA whenever fixed or variable changes
  useEffect(() => {
    const f = parseFloat(fixedLpa) || 0;
    const v = parseFloat(variableLpa) || 0;
    if (f > 0 || v > 0) {
      setTotalLpa(String(f + v));
    }
  }, [fixedLpa, variableLpa]);

  // Handle document file selection & AI extraction
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocumentFile(file);
    setIsExtractingAI(true);
    setMissingFieldsNotice([]);

    try {
      // Read file content
      const text = await file.text();
      if (!text || text.trim().length < 20) {
        toast.error("Could not extract readable text from this file. Please paste or verify details manually.");
        setIsExtractingAI(false);
        return;
      }

      toast.info("Gemini AI is parsing your recruitment document...", { icon: "✨" });

      const prompt = `You are an expert University Placement Recruitment Document Parser.
Analyze the following company job description/placement brochure and extract all recruiting specifications into a clean JSON structure.

DOCUMENT CONTENT:
"""
${text.slice(0, 10000)}
"""

Extract the data and return ONLY a valid JSON object without markdown code blocks, backticks, or other text:
{
  "company_name": string or null,
  "website": string or null,
  "industry": string or null,
  "description": string or null,
  "hr_name": string or null,
  "hr_email": string or null,
  "hr_phone": string or null,
  "job_role": string or null,
  "job_location": string or null,
  "fixed_lpa": string or number or null,
  "variable_lpa": string or number or null,
  "total_lpa": string or number or null,
  "min_cgpa": number or null,
  "max_backlogs": number or null,
  "min_tenth_pct": number or null,
  "min_twelfth_pct": number or null,
  "allowed_branches": string[], // Choose relevant from: ["Computer Science (CSE)", "Information Science (ISE)", "Electronics & Communication (ECE)", "Electrical & Electronics (EEE)", "Artificial Intelligence & Machine Learning (AIML)", "Artificial Intelligence & Data Science (AIDS)", "Mechanical Engineering (MECH)", "Civil Engineering (CIVIL)"]
  "skills": string[], // technical skills required
  "rounds": [
    {
      "name": string,
      "type": "test" | "interview" | "group_discussion" | "other",
      "durationMinutes": number,
      "platform": string,
      "passingCutoff": number
    }
  ],
  "missing_critical_fields": string[] // list any fields that are NOT mentioned in the document (e.g., "HR Contact Phone", "Minimum CGPA Cutoff", "LPA Package Breakdown", "Platform for Assessments")
}`;

      const aiResponse = await askGemini(prompt);
      let parsed: any = null;

      try {
        const cleaned = aiResponse.replace(/```json/gi, "").replace(/```/g, "").trim();
        parsed = JSON.parse(cleaned);
      } catch (parseErr) {
        console.warn("JSON parse direct failed, attempting regex match:", parseErr);
        const match = aiResponse.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        }
      }

      if (!parsed) {
        throw new Error("Unable to parse AI extraction output");
      }

      // Autofill fields
      if (parsed.company_name) setCompanyName(parsed.company_name);
      if (parsed.website) setWebsite(parsed.website);
      if (parsed.industry) setIndustry(parsed.industry);
      if (parsed.description) setDescription(parsed.description);
      if (parsed.hr_name) setHrName(parsed.hr_name);
      if (parsed.hr_email) setHrEmail(parsed.hr_email);
      if (parsed.hr_phone) setHrPhone(parsed.hr_phone);
      if (parsed.job_role) setJobRole(parsed.job_role);
      if (parsed.job_location) setJobLocation(parsed.job_location);
      if (parsed.fixed_lpa) setFixedLpa(String(parsed.fixed_lpa));
      if (parsed.variable_lpa) setVariableLpa(String(parsed.variable_lpa));
      if (parsed.total_lpa) setTotalLpa(String(parsed.total_lpa));
      if (parsed.min_cgpa !== null && parsed.min_cgpa !== undefined) setMinCgpa(String(parsed.min_cgpa));
      if (parsed.max_backlogs !== null && parsed.max_backlogs !== undefined) setMaxBacklogs(String(parsed.max_backlogs));
      if (parsed.min_tenth_pct) setMinTenthPct(String(parsed.min_tenth_pct));
      if (parsed.min_twelfth_pct) setMinTwelfthPct(String(parsed.min_twelfth_pct));

      if (parsed.allowed_branches && Array.isArray(parsed.allowed_branches) && parsed.allowed_branches.length > 0) {
        setAllowedBranches(parsed.allowed_branches);
      }

      if (parsed.skills && Array.isArray(parsed.skills) && parsed.skills.length > 0) {
        setSkills(parsed.skills);
      }

      if (parsed.rounds && Array.isArray(parsed.rounds) && parsed.rounds.length > 0) {
        setRounds(
          parsed.rounds.map((r: any, idx: number) => ({
            id: String(idx + 1),
            name: r.name || `Round ${idx + 1}`,
            type: ["test", "interview", "group_discussion", "other"].includes(r.type) ? r.type : "interview",
            durationMinutes: Number(r.durationMinutes) || 60,
            platform: r.platform || "Online Video Conference / In-Person",
            passingCutoff: Number(r.passingCutoff) || 60,
          }))
        );
      }

      // Check for missing items
      const missingList: string[] = [];
      if (!parsed.company_name && !companyName) missingList.push("Company Name");
      if (!parsed.hr_phone && !hrPhone) missingList.push("HR Recruiter Phone");
      if (!parsed.fixed_lpa && !fixedLpa) missingList.push("Fixed LPA Package");
      if (!parsed.min_cgpa && !minCgpa) missingList.push("Minimum CGPA Cutoff");
      if (parsed.missing_critical_fields && Array.isArray(parsed.missing_critical_fields)) {
        parsed.missing_critical_fields.forEach((f: string) => {
          if (!missingList.includes(f)) missingList.push(f);
        });
      }

      if (missingList.length > 0) {
        setMissingFieldsNotice(missingList);
        toast.warning(`Document parsed! Please complete the ${missingList.length} missing fields highlighted below.`);
      } else {
        toast.success("Document analyzed & all fields autofilled successfully by Gemini AI!");
      }
    } catch (err: any) {
      console.error("AI extraction error:", err);
      toast.error("AI extraction encountered an issue. You can still fill in the details manually.");
    } finally {
      setIsExtractingAI(false);
    }
  };

  // Branch toggle
  const toggleBranch = (branch: string) => {
    setAllowedBranches((prev) =>
      prev.includes(branch) ? prev.filter((b) => b !== branch) : [...prev, branch]
    );
  };

  const selectAllBranches = () => setAllowedBranches([...AVAILABLE_BRANCHES]);
  const clearBranches = () => setAllowedBranches([]);

  // Skill management
  const addSkill = (skillToAdd: string) => {
    const trimmed = skillToAdd.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed]);
    }
    setSkillInput("");
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills((prev) => prev.filter((s) => s !== skillToRemove));
  };

  // Round management
  const addRound = () => {
    const nextNum = rounds.length + 1;
    setRounds((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: `Round ${nextNum}: Technical Evaluation`,
        type: "interview",
        durationMinutes: 45,
        platform: "Google Meet",
        passingCutoff: 60,
      }
    ]);
  };

  const updateRound = (id: string, field: keyof DriveRoundForm, value: any) => {
    setRounds((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const removeRound = (id: string) => {
    if (rounds.length <= 1) {
      toast.error("At least one selection round must be configured for the drive.");
      return;
    }
    setRounds((prev) => prev.filter((r) => r.id !== id));
  };

  // Form submission & DB persistence
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyName.trim()) {
      toast.error("Please enter company name");
      return;
    }
    if (!hrEmail.trim()) {
      toast.error("Please enter HR recruiter email");
      return;
    }
    if (!hrPhone.trim()) {
      toast.error("Please enter HR recruiter phone number");
      return;
    }
    if (!jobRole.trim()) {
      toast.error("Please specify the offered job role");
      return;
    }
    if (allowedBranches.length === 0) {
      toast.error("Please select at least one eligible engineering branch");
      return;
    }
    if (rounds.length === 0) {
      toast.error("Please configure at least one assessment or interview round");
      return;
    }

    setIsSaving(true);

    try {
      const activeUserId = user?.id;
      const salaryPackageStr = `${totalLpa || fixedLpa} LPA`;

      const eligibilityCriteriaObj = {
        min_cgpa: parseFloat(minCgpa) || 6.0,
        min_tenth_pct: parseFloat(minTenthPct) || 60,
        min_twelfth_pct: parseFloat(minTwelfthPct) || 60,
        max_backlogs: parseInt(maxBacklogs) || 0,
        allowed_branches: allowedBranches,
      };

      const contactInfoObj = {
        hr_name: hrName.trim(),
        hr_phone: hrPhone.trim(),
        website: website.trim(),
        fixed_lpa: fixedLpa.trim(),
        variable_lpa: variableLpa.trim(),
        rounds_detail: rounds,
        onboarding_completed: true,
      };

      const selectionProcessArr = rounds.map((r, i) => `${i + 1}. ${r.name} (${r.platform})`);

      let savedCompanyId = companyId;

      // 1. Check or Upsert Company Record
      if (savedCompanyId) {
        const { error: updateErr } = await supabase
          .from("companies")
          .update({
            name: companyName.trim(),
            email: hrEmail.trim().toLowerCase(),
            website: website.trim() || null,
            industry: industry.trim() || null,
            description: description.trim() || null,
            job_role: jobRole.trim(),
            job_location: jobLocation.trim() || null,
            salary_package: salaryPackageStr,
            max_backlogs: parseInt(maxBacklogs) || 0,
            allowed_branches: allowedBranches,
            skills_priority: skills,
            selection_process: selectionProcessArr,
            contact_info: contactInfoObj,
            eligibility_criteria: eligibilityCriteriaObj,
            user_id: activeUserId,
          })
          .eq("id", savedCompanyId);

        if (updateErr) throw updateErr;
      } else {
        const { data: newComp, error: insertErr } = await supabase
          .from("companies")
          .insert({
            name: companyName.trim(),
            email: hrEmail.trim().toLowerCase(),
            website: website.trim() || null,
            industry: industry.trim() || null,
            description: description.trim() || null,
            job_role: jobRole.trim(),
            job_location: jobLocation.trim() || null,
            salary_package: salaryPackageStr,
            max_backlogs: parseInt(maxBacklogs) || 0,
            allowed_branches: allowedBranches,
            skills_priority: skills,
            selection_process: selectionProcessArr,
            contact_info: contactInfoObj,
            eligibility_criteria: eligibilityCriteriaObj,
            user_id: activeUserId,
          })
          .select()
          .single();

        if (insertErr) throw insertErr;
        savedCompanyId = newComp.id;
        setCompanyId(newComp.id);
      }

      // 2. Sync Drive Rounds into drive_rounds table
      if (savedCompanyId) {
        try {
          // Delete existing rounds to rebuild accurately
          await supabase.from("drive_rounds").delete().eq("company_id", savedCompanyId);

          const roundsToInsert = rounds.map((r, idx) => ({
            company_id: savedCompanyId!,
            round_number: idx + 1,
            round_name: r.name,
            round_type: r.type,
            passing_logic: "cutoff_score" as const,
            passing_value: r.passingCutoff || 50,
            is_published: true,
            auto_progress: true,
            created_by: activeUserId,
          }));

          await supabase.from("drive_rounds").insert(roundsToInsert);
        } catch (roundErr) {
          console.warn("Drive rounds sync notice:", roundErr);
        }
      }

      // 3. Mark User Role as company in user_roles
      if (activeUserId) {
        await supabase.from("user_roles").upsert(
          { user_id: activeUserId, role: "company" as any, email: hrEmail.trim().toLowerCase() },
          { onConflict: "user_id,role" }
        );
      }

      // 4. Broadcast Notification to all Students
      try {
        const { data: students } = await supabase.from("profiles").select("id").limit(100);
        if (students && students.length > 0) {
          const notifs = students.map((s) => ({
            user_id: s.id,
            title: `🚀 New Campus Drive: ${companyName}`,
            message: `${companyName} has launched campus recruitment for ${jobRole} (${salaryPackageStr}). Minimum CGPA: ${minCgpa}. Check your eligibility and apply!`,
            type: "drive",
            read: false,
          }));
          await supabase.from("notifications").insert(notifs);
        }
      } catch (notifErr) {
        console.warn("Notification broadcast notice:", notifErr);
      }

      toast.success(
        isEditMode
          ? "Company profile and recruitment drive details updated successfully!"
          : "🎉 Welcome onboard! Your company drive has been activated on the campus portal."
      );

      navigate("/company", { replace: true });
    } catch (err: any) {
      console.error("Save company onboarding error:", err);
      toast.error(err?.message || "Failed to save company drive details");
    } finally {
      setIsSaving(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-9 w-9 animate-spin text-primary" />
          <p className="text-sm font-semibold text-muted-foreground">Loading recruitment onboarding...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background px-4 py-10 md:px-8">
      <AnimatedBackground />

      <div className="relative z-10 mx-auto max-w-5xl space-y-8">
        
        {/* Top Header Card */}
        <div className="rounded-3xl border border-border/80 bg-card/90 p-6 md:p-8 backdrop-blur-2xl shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_0_25px_rgba(108,92,231,0.5)]">
                <Building2 className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/20 text-primary border-primary/30 font-mono text-[11px] px-2.5">
                    {isEditMode ? "EDIT DRIVE SPECS" : "RECRUITER ONBOARDING"}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Verified Partner
                  </span>
                </div>
                <h1 className="mt-1 font-display text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                  {isEditMode ? "Update Company & Placement Drive" : "Company Recruitment & Drive Configuration"}
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                  {isEditMode
                    ? "Modify your company hiring parameters, compensation package, and selection rounds."
                    : "Upload your placement brochure/JD for instant AI autofill, or complete the specifications below."}
                </p>
              </div>
            </div>

            {isEditMode && (
              <Button asChild variant="outline" className="rounded-xl border-border/80 text-xs font-bold gap-2">
                <Link to="/company">
                  Back to Dashboard
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* AI Auto-Fill Document Banner */}
        <div className="rounded-3xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-purple-500/10 p-6 md:p-8 backdrop-blur-2xl shadow-lg relative overflow-hidden">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-xs font-bold text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Powered by Google Gemini AI
              </div>
              <h2 className="text-lg md:text-xl font-bold font-display text-foreground">
                Upload Job Description (JD) or Placement Brochure
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground">
                Upload your company's campus hiring document (.txt, .pdf, .docx). Our AI will instantly parse role requirements, LPA packages, eligibility cutoffs, and interview rounds.
              </p>
            </div>

            <div className="shrink-0 flex flex-col items-center sm:items-end gap-2">
              <label className="relative flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]">
                {isExtractingAI ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Extracting Specifications…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Upload &amp; Auto-fill with AI</span>
                  </>
                )}
                <input
                  type="file"
                  accept=".txt,.pdf,.docx,.doc"
                  className="sr-only"
                  onChange={handleFileUpload}
                  disabled={isExtractingAI}
                />
              </label>

              {documentFile && (
                <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                  <FileText className="h-3 w-3 text-primary" /> {documentFile.name}
                </span>
              )}
            </div>
          </div>

          {/* Missing fields alert notice */}
          <AnimatePresence>
            {missingFieldsNotice.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-5 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      Document parsed! Some specifications were missing in the uploaded file:
                    </span>
                    <ul className="mt-1.5 list-disc list-inside space-y-0.5 text-muted-foreground">
                      {missingFieldsNotice.map((field, i) => (
                        <li key={i}><span className="text-foreground font-medium">{field}</span></li>
                      ))}
                    </ul>
                    <p className="mt-2 text-muted-foreground">
                      Please review and complete the highlighted inputs below before launching your drive.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Section 1: Company Profile */}
          <div className="rounded-3xl border border-border/80 bg-card/90 p-6 md:p-8 backdrop-blur-2xl shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-border/60 pb-3">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <h3 className="text-base font-bold text-foreground">1. Company Profile</h3>
                <p className="text-xs text-muted-foreground">Basic organizational details for campus placement records</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="comp-name" className="text-xs font-semibold text-foreground">
                  Company Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="comp-name"
                  placeholder="e.g. Google, Microsoft, Accenture"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="comp-website" className="text-xs font-semibold text-foreground">
                  Official Website
                </Label>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="comp-website"
                    placeholder="https://company.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="h-11 pl-10 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="comp-industry" className="text-xs font-semibold text-foreground">
                  Industry / Domain
                </Label>
                <Input
                  id="comp-industry"
                  placeholder="e.g. FinTech, Cloud Computing, SaaS, Semiconductor"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="comp-desc" className="text-xs font-semibold text-foreground">
                  About Company / Work Culture
                </Label>
                <Textarea
                  id="comp-desc"
                  placeholder="Brief overview of company mission, culture, and engineering team..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-11 min-h-[44px] rounded-xl resize-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Recruiter / HR Contact Details */}
          <div className="rounded-3xl border border-border/80 bg-card/90 p-6 md:p-8 backdrop-blur-2xl shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-border/60 pb-3">
              <Users className="h-5 w-5 text-purple-500" />
              <div>
                <h3 className="text-base font-bold text-foreground">2. HR Recruiter Contact Coordinates</h3>
                <p className="text-xs text-muted-foreground">Placement cell officer point of contact</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="hr-name" className="text-xs font-semibold text-foreground">
                  Recruiter / HR Lead Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="hr-name"
                  placeholder="e.g. Sarah Jenkins"
                  value={hrName}
                  onChange={(e) => setHrName(e.target.value)}
                  required
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hr-email" className="text-xs font-semibold text-foreground">
                  Official HR Email <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="hr-email"
                    type="email"
                    placeholder="recruiter@company.com"
                    value={hrEmail}
                    onChange={(e) => setHrEmail(e.target.value)}
                    required
                    className="h-11 pl-10 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hr-phone" className="text-xs font-semibold text-foreground">
                  HR Contact / Phone Number <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="hr-phone"
                    placeholder="+91 98765 43210"
                    value={hrPhone}
                    onChange={(e) => setHrPhone(e.target.value)}
                    required
                    className="h-11 pl-10 rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Job Role & Compensation (LPA) */}
          <div className="rounded-3xl border border-border/80 bg-card/90 p-6 md:p-8 backdrop-blur-2xl shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-border/60 pb-3">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              <div>
                <h3 className="text-base font-bold text-foreground">3. Job Role &amp; Compensation Package (LPA)</h3>
                <p className="text-xs text-muted-foreground">Annual CTC breakdown and work locations</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="job-role" className="text-xs font-semibold text-foreground">
                  Offered Job Role / Designation <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="job-role"
                  placeholder="e.g. Associate Software Engineer, Cloud DevOps Specialist"
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                  required
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="job-loc" className="text-xs font-semibold text-foreground">
                  Job Location
                </Label>
                <Input
                  id="job-loc"
                  placeholder="e.g. Bangalore, Hyderabad, Pune / Hybrid"
                  value={jobLocation}
                  onChange={(e) => setJobLocation(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            {/* Compensation breakdown */}
            <div className="grid gap-4 sm:grid-cols-3 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="fixed-lpa" className="text-xs font-semibold text-foreground">
                  Fixed Component (LPA)
                </Label>
                <div className="relative">
                  <Input
                    id="fixed-lpa"
                    type="number"
                    step="0.1"
                    placeholder="12"
                    value={fixedLpa}
                    onChange={(e) => setFixedLpa(e.target.value)}
                    className="h-11 pr-14 rounded-xl"
                  />
                  <span className="absolute right-3.5 top-3 text-xs font-mono font-bold text-muted-foreground">LPA</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="var-lpa" className="text-xs font-semibold text-foreground">
                  Variable / Bonus (LPA)
                </Label>
                <div className="relative">
                  <Input
                    id="var-lpa"
                    type="number"
                    step="0.1"
                    placeholder="2"
                    value={variableLpa}
                    onChange={(e) => setVariableLpa(e.target.value)}
                    className="h-11 pr-14 rounded-xl"
                  />
                  <span className="absolute right-3.5 top-3 text-xs font-mono font-bold text-muted-foreground">LPA</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="total-lpa" className="text-xs font-semibold text-foreground">
                  Total Annual CTC (LPA) <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="total-lpa"
                    type="number"
                    step="0.1"
                    placeholder="14"
                    value={totalLpa}
                    onChange={(e) => setTotalLpa(e.target.value)}
                    required
                    className="h-11 pr-14 rounded-xl font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 border-emerald-500/30"
                  />
                  <span className="absolute right-3.5 top-3 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">LPA</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Student Eligibility Criteria */}
          <div className="rounded-3xl border border-border/80 bg-card/90 p-6 md:p-8 backdrop-blur-2xl shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-border/60 pb-3">
              <Award className="h-5 w-5 text-amber-500" />
              <div>
                <h3 className="text-base font-bold text-foreground">4. Student Eligibility Criteria</h3>
                <p className="text-xs text-muted-foreground">Automatic eligibility cutoffs applied to student profiles</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="min-cgpa" className="text-xs font-semibold text-foreground">
                  Min CGPA Cutoff (0-10)
                </Label>
                <Input
                  id="min-cgpa"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  placeholder="7.0"
                  value={minCgpa}
                  onChange={(e) => setMinCgpa(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="max-backlogs" className="text-xs font-semibold text-foreground">
                  Max Active Backlogs Allowed
                </Label>
                <Input
                  id="max-backlogs"
                  type="number"
                  min="0"
                  max="10"
                  placeholder="0"
                  value={maxBacklogs}
                  onChange={(e) => setMaxBacklogs(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="min-tenth" className="text-xs font-semibold text-foreground">
                  10th Std Min % Cutoff
                </Label>
                <Input
                  id="min-tenth"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="60"
                  value={minTenthPct}
                  onChange={(e) => setMinTenthPct(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="min-twelfth" className="text-xs font-semibold text-foreground">
                  12th / Diploma Min % Cutoff
                </Label>
                <Input
                  id="min-twelfth"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="60"
                  value={minTwelfthPct}
                  onChange={(e) => setMinTwelfthPct(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            {/* Allowed Branches selection */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">
                  Eligible Engineering Disciplines / Branches ({allowedBranches.length} selected) <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllBranches}
                    className="text-[11px] font-semibold text-primary hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-xs text-muted-foreground">•</span>
                  <button
                    type="button"
                    onClick={clearBranches}
                    className="text-[11px] font-semibold text-muted-foreground hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {AVAILABLE_BRANCHES.map((b) => {
                  const selected = allowedBranches.includes(b);
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => toggleBranch(b)}
                      className={`flex items-center justify-between rounded-xl border p-3 text-left text-xs font-semibold transition-all ${
                        selected
                          ? "border-primary/60 bg-primary/10 text-foreground shadow-sm"
                          : "border-border/60 bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted/60"
                      }`}
                    >
                      <span>{b}</span>
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        selected ? "bg-primary border-primary text-white" : "border-muted-foreground/40"
                      }`}>
                        {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 5: Technical Skills Required */}
          <div className="rounded-3xl border border-border/80 bg-card/90 p-6 md:p-8 backdrop-blur-2xl shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-border/60 pb-3">
              <Layers className="h-5 w-5 text-blue-500" />
              <div>
                <h3 className="text-base font-bold text-foreground">5. Required Technical &amp; Core Competencies</h3>
                <p className="text-xs text-muted-foreground">Skills tested during technical assessment rounds</p>
              </div>
            </div>

            {/* Current skill tags */}
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <Badge
                  key={skill}
                  className="bg-primary/15 text-primary border-primary/30 px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 rounded-xl"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="hover:text-destructive transition-colors ml-0.5"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>

            {/* Custom input */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Add custom skill (e.g. Next.js, Kubernetes, Docker) & press Enter"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill(skillInput);
                  }
                }}
                className="h-11 rounded-xl"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => addSkill(skillInput)}
                className="h-11 px-4 rounded-xl shrink-0 font-bold"
              >
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>

            {/* Suggestions */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-semibold text-muted-foreground">Quick Suggestions:</span>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_SKILLS.filter((s) => !skills.includes(s)).slice(0, 8).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addSkill(s)}
                    className="rounded-lg border border-border/70 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 6: Rounds Breakdown & Selection Pipeline */}
          <div className="rounded-3xl border border-border/80 bg-card/90 p-6 md:p-8 backdrop-blur-2xl shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-indigo-500" />
                <div>
                  <h3 className="text-base font-bold text-foreground">6. Selection Rounds &amp; Platform Breakdown</h3>
                  <p className="text-xs text-muted-foreground">
                    Number of rounds, evaluation duration, and platform specifications
                  </p>
                </div>
              </div>

              <Button
                type="button"
                onClick={addRound}
                variant="outline"
                size="sm"
                className="rounded-xl border-primary/40 text-primary hover:bg-primary/10 font-bold gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Add Round
              </Button>
            </div>

            <div className="space-y-4">
              {rounds.map((round, idx) => (
                <div
                  key={round.id}
                  className="rounded-2xl border border-border/80 bg-muted/20 p-5 space-y-4 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-primary flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/20 text-primary text-xs">
                        {idx + 1}
                      </span>
                      Round {idx + 1} Configuration
                    </span>

                    {rounds.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRound(round.id)}
                        className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs font-semibold text-foreground">Round Title</Label>
                      <Input
                        value={round.name}
                        onChange={(e) => updateRound(round.id, "name", e.target.value)}
                        placeholder="e.g. Online Coding Test"
                        className="h-10 rounded-xl"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-foreground">Round Type</Label>
                      <Select
                        value={round.type}
                        onValueChange={(val: any) => updateRound(round.id, "type", val)}
                      >
                        <SelectTrigger className="h-10 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="test">Online Assessment / Test</SelectItem>
                          <SelectItem value="interview">Technical Interview</SelectItem>
                          <SelectItem value="group_discussion">Group Discussion (GD)</SelectItem>
                          <SelectItem value="other">HR / Leadership Fit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-foreground">Duration (Minutes)</Label>
                      <Input
                        type="number"
                        min="15"
                        max="300"
                        value={round.durationMinutes}
                        onChange={(e) => updateRound(round.id, "durationMinutes", parseInt(e.target.value) || 60)}
                        className="h-10 rounded-xl"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs font-semibold text-foreground">
                        Platform / Location (e.g. HackerRank, Google Meet, On-Campus)
                      </Label>
                      <Input
                        value={round.platform}
                        onChange={(e) => updateRound(round.id, "platform", e.target.value)}
                        placeholder="e.g. HackerRank, Mettl, Zoom, Campus Lab 4"
                        className="h-10 rounded-xl"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs font-semibold text-foreground">
                        Passing Qualification Cutoff (%)
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={round.passingCutoff}
                          onChange={(e) => updateRound(round.id, "passingCutoff", parseInt(e.target.value) || 60)}
                          className="h-10 pr-10 rounded-xl"
                        />
                        <span className="absolute right-3.5 top-2.5 text-xs font-bold text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl border border-border/80 bg-card/90 p-6 backdrop-blur-2xl shadow-xl">
            <div className="text-xs text-muted-foreground text-center sm:text-left">
              <p className="font-semibold text-foreground">Ready to launch campus recruitment?</p>
              <p>You can edit and update these specifications anytime from your recruiter dashboard.</p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto h-12 px-8 rounded-2xl bg-primary text-white font-bold text-sm shadow-[0_0_25px_rgba(108,92,231,0.5)] gap-2 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Activating Campus Drive…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{isEditMode ? "Save Changes" : "Complete Onboarding & Launch Drive"}</span>
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
