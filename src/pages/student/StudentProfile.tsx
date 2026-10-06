import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Upload, FileText, Loader2, CheckCircle2, Check,
  Sparkles, ExternalLink, Download, UserCheck, ShieldCheck,
  Eye, Copy, Plus, Trash2, ArrowRight, Github, Linkedin, Globe,
  Briefcase, GraduationCap, Award, Languages, Settings2, Code, Link2
} from "lucide-react";
import { formatExternalUrl } from "@/lib/utils";

interface MarksCardEntry {
  semester: number;
  path: string;
  sgpa: number | null;
  verified: boolean;
  uploadedAt: string;
}

export default function StudentProfile() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState("01");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form State
  const [form, setForm] = useState({
    name: "",
    title: "",
    summary: "",
    email: "",
    phone: "",
    location: "",
    website: "",
    linkedin: "",
    github: "",
    twitter: "",
    leetcode: "",
    hackerrank: "",
    skills: [] as string[],
    newSkill: "",
    experiences: [] as { role: string; company: string; duration: string; description: string }[],
    projects: [] as { title: string; link: string; repo_url?: string; live_url?: string; stack: string; description: string }[],
    education: [] as { degree: string; institution: string; year: string; score: string }[],
    certifications: [] as { name: string; issuer: string; link?: string; issue_date?: string; credential_id?: string }[],
    achievements: [] as string[],
    languages: [] as string[],
    usn: "",
    branch: "",
    yearOfPassing: "",
    jobPreferences: {
      roles: "Full-Stack Developer, Backend Engineer, SDE-1",
      workMode: "hybrid",
      employmentType: "full_time",
      locations: "Bengaluru, Remote",
      noticePeriod: "immediate",
      expectedCtc: "₹8–12 LPA",
    },
  });

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [cloudResumeInput, setCloudResumeInput] = useState("");
  const [isLateralEntry, setIsLateralEntry] = useState<boolean | null>(null);
  const [currentSemester, setCurrentSemester] = useState<number | null>(null);
  const [marksCards, setMarksCards] = useState<MarksCardEntry[]>([]);
  const [cgpa, setCgpa] = useState<number | null>(null);

  // Modals for Adding Information (like LinkedIn)
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({ title: "", description: "", stack: "", repo_url: "", live_url: "" });

  const [certModalOpen, setCertModalOpen] = useState(false);
  const [newCert, setNewCert] = useState({ name: "", issuer: "", issue_date: "", credential_id: "", link: "" });

  const [expModalOpen, setExpModalOpen] = useState(false);
  const [newExp, setNewExp] = useState({ role: "", company: "", duration: "", description: "" });

  const [achModalOpen, setAchModalOpen] = useState(false);
  const [newAch, setNewAch] = useState({ title: "", description: "" });

  const [eduModalOpen, setEduModalOpen] = useState(false);
  const [newEdu, setNewEdu] = useState({ degree: "", institution: "", year: "", score: "" });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
      if (data) {
        const d = data as Record<string, any>;
        setForm(prev => ({
          ...prev,
          name: d.name ?? "",
          title: d.headline ?? "",
          summary: d.bio ?? "",
          email: user.email ?? "",
          phone: d.phone ?? "",
          location: d.location ?? "",
          website: d.portfolio_url ?? "",
          linkedin: d.linkedin_url ?? "",
          github: d.github_url ?? "",
          twitter: d.twitter_url ?? "",
          leetcode: d.leetcode_url ?? "",
          hackerrank: d.hackerrank_url ?? "",
          skills: Array.isArray(d.skills) ? d.skills : [],
          experiences: Array.isArray(d.experience) ? d.experience : [],
          projects: Array.isArray(d.projects) ? d.projects : [],
          education: Array.isArray(d.education) ? d.education : [],
          certifications: Array.isArray(d.certifications) ? d.certifications : [],
          achievements: Array.isArray(d.achievements) ? d.achievements : [],
          languages: Array.isArray(d.languages) ? d.languages : [],
          usn: d.usn ?? "",
          branch: d.branch ?? "",
          yearOfPassing: d.year_of_passing ? String(d.year_of_passing) : "",
          jobPreferences: d.job_preferences ? {
            roles: d.job_preferences.roles ?? prev.jobPreferences.roles,
            workMode: d.job_preferences.workMode ?? prev.jobPreferences.workMode,
            employmentType: d.job_preferences.employmentType ?? prev.jobPreferences.employmentType,
            locations: d.job_preferences.locations ?? prev.jobPreferences.locations,
            noticePeriod: d.job_preferences.noticePeriod ?? prev.jobPreferences.noticePeriod,
            expectedCtc: d.job_preferences.expectedCtc ?? prev.jobPreferences.expectedCtc,
          } : prev.jobPreferences,
        }));

        setAvatarUrl(d.avatar_url ?? null);
        setResumeUrl(d.resume_url ?? null);
        if (d.resume_url) setCloudResumeInput(d.resume_url);
        setIsLateralEntry(d.is_lateral_entry ?? null);
        setCurrentSemester(d.current_semester ?? null);
        setMarksCards((d.marks_cards as MarksCardEntry[]) ?? []);

        const sgpas = (d.sgpas as Record<string, number>) ?? {};
        const sgpaValues = Object.values(sgpas);
        if (sgpaValues.length > 0) {
          setCgpa(parseFloat((sgpaValues.reduce((a, b) => a + b, 0) / sgpaValues.length).toFixed(2)));
        } else {
          setCgpa(d.cgpa ?? null);
        }
      }
    });
  }, [user]);

  // Readiness Calculation
  const calculateReadiness = () => {
    let score = 0;
    if (form.name.trim()) score += 10;
    if (form.title.trim()) score += 10;
    if (form.summary.trim()) score += 10;
    if (form.usn.trim()) score += 10;
    if (form.skills.length > 0) score += 15;
    if (form.projects.length > 0 || form.experiences.length > 0) score += 15;
    if (resumeUrl) score += 15;
    if (marksCards.length > 0) score += 15;
    return Math.min(score, 100);
  };

  const readinessPercentage = calculateReadiness();

  const handleRightScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollPosition = container.scrollTop + 120;
    for (const sec of sections) {
      const el = document.getElementById(`section-${sec.id}`);
      if (el) {
        const top = el.offsetTop;
        const height = el.offsetHeight;
        if (scrollPosition >= top && scrollPosition < top + height) {
          setActiveSection(sec.id);
          break;
        }
      }
    }
  };

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(`section-${id}`);
    const container = document.getElementById("profile-scroll-container");
    if (el && container) {
      container.scrollTo({
        top: el.offsetTop - 20,
        behavior: "smooth"
      });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Profile picture must be under 2MB"); return; }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });

      if (uploadError) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          setAvatarUrl(base64);
          await supabase.from("profiles").update({ avatar_url: base64 }).eq("id", user.id);
          window.dispatchEvent(new CustomEvent("profile-updated", { detail: { avatar_url: base64 } }));
          toast.success("Profile photo updated");
        };
        reader.readAsDataURL(file);
      } else {
        const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
        const freshUrl = `${publicUrl}?t=${Date.now()}`;
        setAvatarUrl(freshUrl);
        await supabase.from("profiles").update({ avatar_url: freshUrl }).eq("id", user.id);
        window.dispatchEvent(new CustomEvent("profile-updated", { detail: { avatar_url: freshUrl } }));
        toast.success("Profile photo updated");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed uploading photo");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        name: form.name,
        headline: form.title,
        bio: form.summary,
        phone: form.phone,
        location: form.location,
        portfolio_url: formatExternalUrl(form.website) || null,
        linkedin_url: formatExternalUrl(form.linkedin) || null,
        github_url: formatExternalUrl(form.github) || null,
        twitter_url: formatExternalUrl(form.twitter) || null,
        leetcode_url: formatExternalUrl(form.leetcode) || null,
        hackerrank_url: formatExternalUrl(form.hackerrank) || null,
        skills: form.skills,
        experience: form.experiences,
        projects: form.projects,
        education: form.education,
        certifications: form.certifications,
        achievements: form.achievements,
        languages: form.languages,
        usn: form.usn,
        branch: form.branch,
        year_of_passing: parseInt(form.yearOfPassing) || null,
        profile_completion_percentage: readinessPercentage,
        avatar_url: avatarUrl,
        resume_url: resumeUrl ? formatExternalUrl(resumeUrl) : null,
        job_preferences: form.jobPreferences,
      };

      let currentPayload = { ...payload };
      let savedSuccessfully = false;
      const removedColumns: string[] = [];

      for (let attempt = 0; attempt < 15; attempt++) {
        const { error } = await supabase
          .from("profiles")
          .update(currentPayload)
          .eq("id", user.id);

        if (!error) {
          savedSuccessfully = true;
          break;
        }

        const missingColMatch = error.message?.match(/Could not find the '([^']+)' column of 'profiles'/i);
        if (missingColMatch && missingColMatch[1]) {
          const col = missingColMatch[1];
          delete currentPayload[col];
          removedColumns.push(col);
          continue;
        }

        throw error;
      }

      if (savedSuccessfully) {
        window.dispatchEvent(new CustomEvent("profile-updated", { detail: { avatar_url: avatarUrl } }));
        if (removedColumns.length > 0) {
          toast.warning(
            `Profile saved! Note: Database missing column(s): ${removedColumns.join(", ")}. Please run the complete SQL migration.`,
            { duration: 7000 }
          );
        } else {
          toast.success("Profile saved successfully");
        }
      } else {
        throw new Error("Failed to save profile after retrying.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAddSkill = () => {
    if (!form.newSkill.trim()) return;
    if (!form.skills.includes(form.newSkill.trim())) {
      setForm(prev => ({
        ...prev,
        skills: [...prev.skills, prev.newSkill.trim()],
        newSkill: "",
      }));
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setForm(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skillToRemove),
    }));
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("File must be under 10MB"); return; }
    if (!file.name.endsWith(".pdf")) { toast.error("Only PDF files are accepted"); return; }

    setUploading(true);
    const fileName = `${form.usn.trim() || "CANDIDATE"}_${form.name.trim().replace(/\s+/g, "_") || "Resume"}.pdf`;
    const path = `${user.id}/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage.from("resumes").upload(path, file, { upsert: true });
      if (uploadError) {
        if (uploadError.message?.toLowerCase().includes("bucket not found") || (uploadError as any).statusCode === "404") {
          toast.error("Supabase Storage bucket 'resumes' not found. Please create the public 'resumes' bucket in Supabase Storage, or link your Google Drive resume URL below!", { duration: 8000 });
        } else {
          toast.error("Upload failed: " + uploadError.message);
        }
        setUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from("resumes").getPublicUrl(path);
      setResumeUrl(publicUrl);
      setCloudResumeInput(publicUrl);

      await supabase.from("profiles").update({
        resume_url: publicUrl,
        profile_completion_percentage: readinessPercentage,
      }).eq("id", user.id);

      toast.success("Résumé PDF uploaded successfully!");
    } catch (err: any) {
      toast.error("Upload error: " + (err.message || "Failed uploading resume"));
    } finally {
      setUploading(false);
    }
  };

  const handleSaveCloudResume = async () => {
    if (!cloudResumeInput.trim()) {
      toast.error("Please enter a valid Google Drive or Cloud URL");
      return;
    }
    const formatted = formatExternalUrl(cloudResumeInput.trim());
    setResumeUrl(formatted);
    try {
      await supabase.from("profiles").update({
        resume_url: formatted,
        profile_completion_percentage: readinessPercentage,
      }).eq("id", user?.id);
      toast.success("Résumé link saved successfully! Recruiters and admins can now view and download your resume.");
    } catch (err: any) {
      toast.error("Failed saving link: " + err.message);
    }
  };

  // Add Project Modal Handler
  const handleAddProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.title.trim()) { toast.error("Please enter project title"); return; }
    if (!newProject.repo_url.trim()) { toast.error("Please enter GitHub or Repository URL"); return; }

    const formattedRepo = formatExternalUrl(newProject.repo_url.trim());
    const formattedLive = newProject.live_url.trim() ? formatExternalUrl(newProject.live_url.trim()) : undefined;

    setForm(prev => ({
      ...prev,
      projects: [
        ...prev.projects,
        {
          title: newProject.title.trim(),
          description: newProject.description.trim(),
          stack: newProject.stack.trim(),
          repo_url: formattedRepo,
          link: formattedRepo,
          live_url: formattedLive,
        }
      ]
    }));

    setNewProject({ title: "", description: "", stack: "", repo_url: "", live_url: "" });
    setProjectModalOpen(false);
    toast.success("Project added successfully! Click 'Save Changes' to update your profile.");
  };

  // Add Certificate Modal Handler
  const handleAddCertSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCert.name.trim()) { toast.error("Please enter certificate name"); return; }
    if (!newCert.issuer.trim()) { toast.error("Please enter issuing organization"); return; }

    const formattedLink = newCert.link.trim() ? formatExternalUrl(newCert.link.trim()) : undefined;

    setForm(prev => ({
      ...prev,
      certifications: [
        ...prev.certifications,
        {
          name: newCert.name.trim(),
          issuer: newCert.issuer.trim(),
          issue_date: newCert.issue_date.trim() || undefined,
          credential_id: newCert.credential_id.trim() || undefined,
          link: formattedLink,
        }
      ]
    }));

    setNewCert({ name: "", issuer: "", issue_date: "", credential_id: "", link: "" });
    setCertModalOpen(false);
    toast.success("Certificate added successfully! Click 'Save Changes' to update your profile.");
  };

  // Add Experience Modal Handler
  const handleAddExpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExp.role.trim() || !newExp.company.trim()) {
      toast.error("Please enter role title and company name");
      return;
    }

    setForm(prev => ({
      ...prev,
      experiences: [
        ...prev.experiences,
        {
          role: newExp.role.trim(),
          company: newExp.company.trim(),
          duration: newExp.duration.trim(),
          description: newExp.description.trim(),
        }
      ]
    }));

    setNewExp({ role: "", company: "", duration: "", description: "" });
    setExpModalOpen(false);
    toast.success("Experience added successfully! Click 'Save Changes' to update your profile.");
  };

  // Add Achievement Modal Handler
  const handleAddAchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAch.title.trim()) { toast.error("Please enter achievement title"); return; }

    const fullAch = newAch.description.trim()
      ? `${newAch.title.trim()} — ${newAch.description.trim()}`
      : newAch.title.trim();

    setForm(prev => ({
      ...prev,
      achievements: [...prev.achievements, fullAch]
    }));

    setNewAch({ title: "", description: "" });
    setAchModalOpen(false);
    toast.success("Achievement added successfully! Click 'Save Changes' to update your profile.");
  };

  // Add Education Modal Handler
  const handleAddEduSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEdu.degree.trim() || !newEdu.institution.trim()) {
      toast.error("Please enter degree and institution");
      return;
    }

    setForm(prev => ({
      ...prev,
      education: [
        ...prev.education,
        {
          degree: newEdu.degree.trim(),
          institution: newEdu.institution.trim(),
          year: newEdu.year.trim() || form.yearOfPassing || "2026",
          score: newEdu.score.trim(),
        }
      ]
    }));

    setNewEdu({ degree: "", institution: "", year: "", score: "" });
    setEduModalOpen(false);
    toast.success("Education added successfully! Click 'Save Changes' to update your profile.");
  };

  const userInitial = form.name ? form.name.charAt(0).toUpperCase() : (user?.email?.charAt(0).toUpperCase() || "A");

  // 10 Navigation Sections
  const sections = [
    { id: "01", label: "Basics" },
    { id: "02", label: "Links & accounts" },
    { id: "03", label: "Skills" },
    { id: "04", label: "Experience" },
    { id: "05", label: "Projects" },
    { id: "06", label: "Education" },
    { id: "07", label: "Certifications" },
    { id: "08", label: "Achievements" },
    { id: "09", label: "Languages" },
    { id: "10", label: "Job preferences" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Top Studio Action Ribbon */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Button size="sm" className="rounded-xl bg-foreground text-background text-xs font-bold gap-1.5 h-9 px-4 shadow-sm hover:bg-foreground/90">
            <Sparkles className="h-3.5 w-3.5 fill-current" /> Studio
          </Button>
          <Button size="sm" variant="ghost" className="rounded-xl text-muted-foreground text-xs font-semibold gap-1.5 h-9 px-3 hover:text-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-500" /> Verified Evidence
          </Button>
          <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/10 text-[10px] py-1 px-2.5 font-bold gap-1">
            <Sparkles className="h-3 w-3" /> AI Builder PRO
          </Badge>
          <Badge variant="outline" className="border-border text-muted-foreground text-[10px] py-1 px-2 font-semibold">
            JD Tailor PRO+
          </Badge>
          <Badge variant="outline" className="border-border text-muted-foreground text-[10px] py-1 px-2 font-semibold">
            Export PRO
          </Badge>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-[#5b51d8] hover:bg-[#4d43cc] text-white text-xs font-bold h-9 px-5 gap-1.5 shrink-0 shadow-md"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
          Save Changes
        </Button>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Fixed Navigation & Progress (4 Cols) */}
        <div className="lg:col-span-4 lg:sticky lg:top-0 self-start space-y-6 shrink-0">
          <div className="p-6 rounded-3xl bg-card border border-border/60 shadow-sm space-y-6">
            
            {/* Readiness Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="uppercase text-[10px] tracking-wider text-muted-foreground">Profile Readiness</span>
                <span className="font-display text-sm text-foreground">{readinessPercentage}%</span>
              </div>
              <Progress value={readinessPercentage} className="h-1.5 bg-muted [&>div]:bg-[#5b51d8]" />
            </div>

            {/* Step Selector List */}
            <div className="space-y-1">
              {sections.map((sec) => {
                const isActive = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => scrollToSection(sec.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                      isActive
                        ? "bg-foreground text-background font-bold shadow-sm"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <span className={`font-mono text-[11px] ${isActive ? "text-primary dark:text-primary" : "text-muted-foreground"}`}>
                      {sec.id}
                    </span>
                    <span>{sec.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Resume Link Info */}
            <div className="pt-4 border-t border-border/60 space-y-2.5">
              {resumeUrl ? (
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="w-full h-9 rounded-xl text-xs font-bold gap-2 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10"
                >
                  <a href={formatExternalUrl(resumeUrl)} target="_blank" rel="noreferrer">
                    <Eye className="h-3.5 w-3.5" /> View Active Résumé
                  </a>
                </Button>
              ) : (
                <p className="text-[11px] text-muted-foreground text-center">
                  Attach your résumé in Section 01 Basics.
                </p>
              )}
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: Continuous Scrolling Form Workspace (8 Cols) */}
        <div
          id="profile-scroll-container"
          onScroll={handleRightScroll}
          className="lg:col-span-8 lg:h-[calc(100vh-160px)] lg:overflow-y-auto pr-1 space-y-6 scroll-smooth"
        >
          
          {/* Blue Check Verification Banner */}
          <div className="p-6 rounded-3xl bg-blue-500/10 dark:bg-blue-950/30 text-foreground border border-blue-500/20 shadow-sm relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="h-10 w-10 rounded-2xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400">Verified Candidate</div>
                  <h3 className="font-display text-lg font-bold text-foreground mt-0.5">Earn your blue check</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Verified profiles rank higher in company placement shortlists and recruiters trust them more.
                  </p>
                </div>
              </div>

              <Button size="sm" className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shrink-0 gap-1.5 h-9 px-4">
                View evidence <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Check Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-5 border-t border-border/80 mt-5">
              <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-500/30 text-[10px] gap-1 py-1 px-2.5">
                <Check className="h-3 w-3" /> Identity
              </Badge>
              <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-500/30 text-[10px] gap-1 py-1 px-2.5">
                <Check className="h-3 w-3" /> Email verified
              </Badge>
              <Badge variant="outline" className="text-muted-foreground border-border text-[10px] py-1 px-2.5">
                Skills verified
              </Badge>
              <Badge variant="outline" className="text-muted-foreground border-border text-[10px] py-1 px-2.5">
                Project reviewed
              </Badge>
              <Badge variant="outline" className="text-muted-foreground border-border text-[10px] py-1 px-2.5">
                Assessment passed
              </Badge>
            </div>
          </div>

          {/* SECTION 01: BASICS */}
          <div id="section-01" className="scroll-mt-24 p-6 md:p-8 rounded-3xl bg-card border border-border/60 shadow-sm space-y-6">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#5b51d8]">
                <span>01</span>
                <span>Basics</span>
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mt-1">Identity &amp; Profile Summary</h3>
              <p className="text-xs text-muted-foreground">Identity, headline, and summary — the first thing a recruiter reads.</p>
            </div>

            {/* Photo Area */}
            <div className="flex items-center gap-4 pt-2">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-[#5b51d8] to-[#8075ff] text-white font-display font-extrabold text-2xl flex items-center justify-center shadow-md shrink-0 overflow-hidden relative border border-border/40">
                {uploadingAvatar ? (
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                ) : avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={form.name || "Student profile photo"}
                    className="h-full w-full object-cover rounded-2xl"
                  />
                ) : (
                  <span>{userInitial}</span>
                )}
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">Profile photo</h4>
                <p className="text-[11px] text-muted-foreground">A clear headshot. Used on your public profile and top navbar.</p>
                <label className="cursor-pointer inline-block mt-2">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    className="hidden"
                    disabled={uploadingAvatar}
                    onChange={handleAvatarUpload}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    asChild
                    className="h-7 text-[11px] rounded-lg border-border"
                    disabled={uploadingAvatar}
                  >
                    <span>
                      {uploadingAvatar ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Upload className="h-3 w-3 mr-1" />
                      )}
                      {uploadingAvatar ? "Uploading..." : avatarUrl ? "Change photo" : "Upload photo"}
                    </span>
                  </Button>
                </label>
              </div>
            </div>

            {/* Resume / CV Document Area (Dual Option: PDF Upload & Cloud Link) */}
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-foreground">Official Résumé / Curriculum Vitae</h4>
                      {resumeUrl ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] py-0 px-2 font-bold">
                          Attached &amp; Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-[10px] py-0 px-2">
                          Not Attached Yet
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Recruiters and admins can preview and download this PDF when reviewing your candidate profile.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <label className="cursor-pointer inline-block">
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      disabled={uploading}
                      onChange={handleResumeUpload}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant={resumeUrl ? "outline" : "default"}
                      asChild
                      className={`h-8 text-xs rounded-xl ${!resumeUrl ? "bg-[#5b51d8] hover:bg-[#4d43cc] text-white" : "border-border"}`}
                      disabled={uploading}
                    >
                      <span>
                        {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
                        {uploading ? "Uploading PDF..." : resumeUrl ? "Replace File" : "Upload PDF"}
                      </span>
                    </Button>
                  </label>

                  {resumeUrl && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => window.open(formatExternalUrl(resumeUrl), "_blank")}
                        className="h-8 text-xs rounded-xl gap-1.5"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        asChild
                        className="h-8 text-xs rounded-xl gap-1.5"
                      >
                        <a href={formatExternalUrl(resumeUrl)} download={`${form.name || "Student"}_Resume.pdf`} target="_blank" rel="noreferrer">
                          <Download className="h-3.5 w-3.5" /> Download
                        </a>
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Cloud Resume Link Option (Zero Supabase Bucket Limit) */}
              <div className="pt-2 border-t border-border/40 flex flex-col sm:flex-row items-center gap-2">
                <div className="text-[11px] text-muted-foreground shrink-0 flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5 text-primary" />
                  <span>Or paste Google Drive / Cloud Link:</span>
                </div>
                <div className="flex items-center gap-2 w-full">
                  <Input
                    value={cloudResumeInput}
                    onChange={(e) => setCloudResumeInput(e.target.value)}
                    placeholder="https://drive.google.com/file/d/... or OneDrive / cloud link"
                    className="h-8 text-xs rounded-xl bg-card border-border flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveCloudResume}
                    className="h-8 text-xs rounded-xl bg-[#5b51d8] hover:bg-[#4d43cc] text-white shrink-0 font-bold"
                  >
                    Save Link
                  </Button>
                </div>
              </div>
            </div>

            {/* Input Fields */}
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Full Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Roshan Gowda"
                  className="h-10 rounded-xl bg-muted/30 border-border"
                />
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">University Seat Number (USN) *</Label>
                  <Input
                    value={form.usn}
                    onChange={(e) => setForm({ ...form, usn: e.target.value })}
                    placeholder="e.g. 1RV21CS001"
                    className="h-10 rounded-xl bg-muted/30 border-border uppercase font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Engineering Branch</Label>
                  <Select value={form.branch} onValueChange={(v) => setForm({ ...form, branch: v })}>
                    <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-border text-xs">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Computer Science">Computer Science</SelectItem>
                      <SelectItem value="Information Science">Information Science</SelectItem>
                      <SelectItem value="Electronics & Communication">Electronics &amp; Communication</SelectItem>
                      <SelectItem value="Mechanical">Mechanical</SelectItem>
                      <SelectItem value="Civil">Civil</SelectItem>
                      <SelectItem value="Electrical">Electrical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* EDITABLE GRADUATING YEAR */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Graduating Class / Passing Year *</Label>
                  <Input
                    type="number"
                    value={form.yearOfPassing}
                    onChange={(e) => setForm({ ...form, yearOfPassing: e.target.value })}
                    placeholder="e.g. 2026"
                    min="2020"
                    max="2035"
                    className="h-10 rounded-xl bg-muted/30 border-border font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Professional Title / Headline</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Full Stack Developer | Distributed Systems"
                  className="h-10 rounded-xl bg-muted/30 border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Professional Summary</Label>
                <Textarea
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  placeholder="2–3 lines on what you build and what you're looking for in your next role."
                  className="rounded-xl bg-muted/30 border-border min-h-[90px] text-xs"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Email</Label>
                  <Input
                    disabled
                    value={form.email}
                    className="h-10 rounded-xl bg-muted/50 border-border text-muted-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="h-10 rounded-xl bg-muted/30 border-border"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Location</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Bengaluru, Karnataka"
                  className="h-10 rounded-xl bg-muted/30 border-border"
                />
              </div>
            </div>
          </div>

          {/* SECTION 02: LINKS & ACCOUNTS */}
          <div id="section-02" className="scroll-mt-24 p-6 md:p-8 rounded-3xl bg-card border border-border/60 shadow-sm space-y-6">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#5b51d8]">
                <span>02</span>
                <span>Links &amp; accounts</span>
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mt-1">Social &amp; Coding Portfolios</h3>
              <p className="text-xs text-muted-foreground">Where recruiters find your work. Links are validated and opened directly in new tabs.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Website / Portfolio</Label>
                <Input
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https://yourportfolio.me"
                  className="h-10 rounded-xl bg-muted/30 border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">LinkedIn</Label>
                <Input
                  value={form.linkedin}
                  onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
                  placeholder="https://linkedin.com/in/username"
                  className="h-10 rounded-xl bg-muted/30 border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">GitHub</Label>
                <Input
                  value={form.github}
                  onChange={(e) => setForm({ ...form, github: e.target.value })}
                  placeholder="https://github.com/username"
                  className="h-10 rounded-xl bg-muted/30 border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Twitter / X</Label>
                <Input
                  value={form.twitter}
                  onChange={(e) => setForm({ ...form, twitter: e.target.value })}
                  placeholder="https://x.com/username"
                  className="h-10 rounded-xl bg-muted/30 border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">LeetCode</Label>
                <Input
                  value={form.leetcode}
                  onChange={(e) => setForm({ ...form, leetcode: e.target.value })}
                  placeholder="https://leetcode.com/u/username"
                  className="h-10 rounded-xl bg-muted/30 border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">HackerRank</Label>
                <Input
                  value={form.hackerrank}
                  onChange={(e) => setForm({ ...form, hackerrank: e.target.value })}
                  placeholder="https://hackerrank.com/profile/username"
                  className="h-10 rounded-xl bg-muted/30 border-border"
                />
              </div>
            </div>
          </div>

          {/* SECTION 03: SKILLS */}
          <div id="section-03" className="scroll-mt-24 p-6 md:p-8 rounded-3xl bg-card border border-border/60 shadow-sm space-y-6">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#5b51d8]">
                <span>03</span>
                <span>Skills</span>
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mt-1">Technical Skills &amp; Proficiencies</h3>
              <p className="text-xs text-muted-foreground">Add languages, frameworks, databases, and DevOps tools you are proficient in.</p>
            </div>

            <div className="flex items-center gap-2">
              <Input
                placeholder="Type a skill and press Enter or Add (e.g. React, Python, PostgreSQL)..."
                value={form.newSkill}
                onChange={(e) => setForm({ ...form, newSkill: e.target.value })}
                className="h-10 rounded-xl bg-muted/30 border-border"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSkill(); } }}
              />
              <Button onClick={handleAddSkill} className="rounded-xl bg-[#5b51d8] text-white text-xs font-bold px-4 h-10">
                <Plus className="h-4 w-4 mr-1" /> Add skill
              </Button>
            </div>

            {form.skills.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-2">
                {form.skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-xs font-semibold"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>{skill}</span>
                    <button onClick={() => handleRemoveSkill(skill)} className="hover:text-rose-500 text-muted-foreground ml-1">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground pt-1">No skills added yet. Add your core competencies above.</p>
            )}
          </div>

          {/* SECTION 04: EXPERIENCE */}
          <div id="section-04" className="scroll-mt-24 p-6 md:p-8 rounded-3xl bg-card border border-border/60 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#5b51d8]">
                  <span>04</span>
                  <span>Experience</span>
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mt-1">Work &amp; Internships</h3>
                <p className="text-xs text-muted-foreground">Roles, companies, and impact you've delivered.</p>
              </div>

              <Button
                onClick={() => setExpModalOpen(true)}
                className="rounded-xl bg-[#5b51d8] hover:bg-[#4d43cc] text-white text-xs font-bold h-9 px-4 gap-1.5"
              >
                <Plus className="h-4 w-4" /> Add a role
              </Button>
            </div>

            {form.experiences.length > 0 ? (
              <div className="space-y-3">
                {form.experiences.map((exp, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{exp.role} {exp.company ? `@ ${exp.company}` : ""}</h4>
                        {exp.duration && <p className="text-xs text-muted-foreground">{exp.duration}</p>}
                      </div>
                      <button
                        onClick={() => setForm({ ...form, experiences: form.experiences.filter((_, i) => i !== idx) })}
                        className="text-muted-foreground hover:text-rose-500 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {exp.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{exp.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl border border-dashed border-border/60 text-xs text-muted-foreground space-y-2">
                <Briefcase className="h-8 w-8 mx-auto text-muted-foreground/60" />
                <p className="font-medium text-foreground">No work experience or internships listed yet.</p>
                <p>Click "Add a role" to record internships or freelancing work.</p>
              </div>
            )}
          </div>

          {/* SECTION 05: PROJECTS */}
          <div id="section-05" className="scroll-mt-24 p-6 md:p-8 rounded-3xl bg-card border border-border/60 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#5b51d8]">
                  <span>05</span>
                  <span>Projects</span>
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mt-1">Featured Projects</h3>
                <p className="text-xs text-muted-foreground">Showcase your best builds with repository source code and optional live demo links.</p>
              </div>

              <Button
                onClick={() => setProjectModalOpen(true)}
                className="rounded-xl bg-[#5b51d8] hover:bg-[#4d43cc] text-white text-xs font-bold h-9 px-4 gap-1.5"
              >
                <Plus className="h-4 w-4" /> Add a project
              </Button>
            </div>

            {form.projects.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {form.projects.map((proj, idx) => {
                  const repoUrl = formatExternalUrl(proj.repo_url || proj.link);
                  const liveUrl = proj.live_url ? formatExternalUrl(proj.live_url) : null;

                  return (
                    <div key={idx} className="p-4 rounded-2xl bg-muted/20 border border-border/60 flex flex-col justify-between space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-foreground">{proj.title}</h4>
                          <button
                            onClick={() => setForm({ ...form, projects: form.projects.filter((_, i) => i !== idx) })}
                            className="text-muted-foreground hover:text-rose-500 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {proj.description && (
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                            {proj.description}
                          </p>
                        )}
                        {proj.stack && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {proj.stack.split(",").map((s, sIdx) => (
                              <span key={sIdx} className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-semibold text-muted-foreground">
                                {s.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                        {repoUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                            className="h-7 text-[11px] rounded-lg gap-1.5 font-bold border-border"
                          >
                            <a href={repoUrl} target="_blank" rel="noreferrer">
                              <Github className="h-3 w-3" /> Code
                            </a>
                          </Button>
                        )}
                        {liveUrl && (
                          <Button
                            size="sm"
                            variant="secondary"
                            asChild
                            className="h-7 text-[11px] rounded-lg gap-1.5 font-bold bg-[#5b51d8]/10 text-[#5b51d8] hover:bg-[#5b51d8]/20"
                          >
                            <a href={liveUrl} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-3 w-3" /> Live Demo
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl border border-dashed border-border/60 text-xs text-muted-foreground space-y-2">
                <Code className="h-8 w-8 mx-auto text-muted-foreground/60" />
                <p className="font-medium text-foreground">No featured projects added yet.</p>
                <p>Click "Add a project" to add your GitHub repositories and applications.</p>
              </div>
            )}
          </div>

          {/* SECTION 06: EDUCATION */}
          <div id="section-06" className="scroll-mt-24 p-6 md:p-8 rounded-3xl bg-card border border-border/60 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#5b51d8]">
                  <span>06</span>
                  <span>Education</span>
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mt-1">Academic Credentials</h3>
                <p className="text-xs text-muted-foreground">Degrees, institutions, and marks verified by college placement office.</p>
              </div>

              <Button
                onClick={() => setEduModalOpen(true)}
                className="rounded-xl bg-[#5b51d8] hover:bg-[#4d43cc] text-white text-xs font-bold h-9 px-4 gap-1.5"
              >
                <Plus className="h-4 w-4" /> Add education
              </Button>
            </div>

            {/* Current Enrolled Degree Box */}
            <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-foreground">Bachelor of Engineering (B.E / B.Tech)</div>
                {cgpa !== null && (
                  <Badge className="bg-[#5b51d8]/15 text-[#5b51d8] border-[#5b51d8]/30 font-mono text-xs">
                    CGPA: {cgpa}
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3">
                <span>Branch: <span className="font-semibold text-foreground">{form.branch || "Not Specified"}</span></span>
                <span>•</span>
                <span>Graduating Class: <span className="font-semibold text-foreground">{form.yearOfPassing || "2026"}</span></span>
              </div>
            </div>

            {/* Additional Education Entries */}
            {form.education.length > 0 && (
              <div className="space-y-3">
                {form.education.map((edu, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-muted/20 border border-border/60 flex items-center justify-between gap-3">
                    <div className="text-xs space-y-0.5">
                      <div className="font-bold text-foreground">{edu.degree}</div>
                      <div className="text-muted-foreground">{edu.institution} {edu.year ? `• Class of ${edu.year}` : ""}</div>
                      {edu.score && <div className="text-[#5b51d8] font-bold">{edu.score}</div>}
                    </div>
                    <button
                      onClick={() => setForm({ ...form, education: form.education.filter((_, i) => i !== idx) })}
                      className="text-muted-foreground hover:text-rose-500 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 07: CERTIFICATIONS */}
          <div id="section-07" className="scroll-mt-24 p-6 md:p-8 rounded-3xl bg-card border border-border/60 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#5b51d8]">
                  <span>07</span>
                  <span>Certifications</span>
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mt-1">Credentials &amp; Badges</h3>
                <p className="text-xs text-muted-foreground">Courses, professional licenses, and verified skill badges.</p>
              </div>

              <Button
                onClick={() => setCertModalOpen(true)}
                className="rounded-xl bg-[#5b51d8] hover:bg-[#4d43cc] text-white text-xs font-bold h-9 px-4 gap-1.5"
              >
                <Plus className="h-4 w-4" /> Add a certificate
              </Button>
            </div>

            {form.certifications.length > 0 ? (
              <div className="space-y-3">
                {form.certifications.map((cert, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-muted/20 border border-border/60 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="font-bold text-xs text-foreground">{cert.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {cert.issuer} {cert.issue_date ? `• Issued ${cert.issue_date}` : ""}
                        {cert.credential_id ? ` • ID: ${cert.credential_id}` : ""}
                      </div>
                      {cert.link && (
                        <a
                          href={formatExternalUrl(cert.link)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-[#5b51d8] hover:underline font-bold mt-1"
                        >
                          Verify credential <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => setForm({ ...form, certifications: form.certifications.filter((_, i) => i !== idx) })}
                      className="text-muted-foreground hover:text-rose-500 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl border border-dashed border-border/60 text-xs text-muted-foreground space-y-2">
                <Award className="h-8 w-8 mx-auto text-muted-foreground/60" />
                <p className="font-medium text-foreground">No certifications added yet.</p>
                <p>Click "Add a certificate" to record your industry credentials.</p>
              </div>
            )}
          </div>

          {/* SECTION 08: ACHIEVEMENTS */}
          <div id="section-08" className="scroll-mt-24 p-6 md:p-8 rounded-3xl bg-card border border-border/60 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#5b51d8]">
                  <span>08</span>
                  <span>Achievements &amp; awards</span>
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mt-1">Honors &amp; Recognitions</h3>
                <p className="text-xs text-muted-foreground">Hackathon wins, recognitions, competitive programming ranks.</p>
              </div>

              <Button
                onClick={() => setAchModalOpen(true)}
                className="rounded-xl bg-[#5b51d8] hover:bg-[#4d43cc] text-white text-xs font-bold h-9 px-4 gap-1.5"
              >
                <Plus className="h-4 w-4" /> Add an achievement
              </Button>
            </div>

            {form.achievements.length > 0 ? (
              <div className="space-y-2.5">
                {form.achievements.map((ach, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-muted/20 border border-border/60 flex items-center justify-between text-xs font-medium">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span>{ach}</span>
                    </div>
                    <button
                      onClick={() => setForm({ ...form, achievements: form.achievements.filter((_, i) => i !== idx) })}
                      className="text-muted-foreground hover:text-rose-500 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl border border-dashed border-border/60 text-xs text-muted-foreground space-y-2">
                <Award className="h-8 w-8 mx-auto text-amber-500/60" />
                <p className="font-medium text-foreground">No achievements listed yet.</p>
                <p>Click "Add an achievement" to record hackathon wins, ranks, or recognitions.</p>
              </div>
            )}
          </div>

          {/* SECTION 09: LANGUAGES */}
          <div id="section-09" className="scroll-mt-24 p-6 md:p-8 rounded-3xl bg-card border border-border/60 shadow-sm space-y-6">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#5b51d8]">
                <span>09</span>
                <span>Languages</span>
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mt-1">Languages</h3>
              <p className="text-xs text-muted-foreground">Spoken languages and communication proficiency.</p>
            </div>

            <Button
              onClick={() => {
                const lang = prompt("Enter language name (e.g. English, Kannada, Hindi, German):");
                if (lang && lang.trim() && !form.languages.includes(lang.trim())) {
                  setForm({ ...form, languages: [...form.languages, lang.trim()] });
                }
              }}
              variant="outline"
              className="w-full h-11 rounded-2xl border-dashed border-border/80 text-xs font-bold gap-2 text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-4 w-4" /> Add a language
            </Button>

            <div className="flex flex-wrap gap-2 pt-2">
              {form.languages.map((lang) => (
                <span
                  key={lang}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-muted/60 text-foreground border border-border text-xs font-semibold"
                >
                  <span>{lang}</span>
                  <button
                    onClick={() => setForm({ ...form, languages: form.languages.filter(l => l !== lang) })}
                    className="hover:text-rose-500 text-muted-foreground ml-1 text-sm font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* SECTION 10: JOB PREFERENCES */}
          <div id="section-10" className="scroll-mt-24 p-6 md:p-8 rounded-3xl bg-card border border-border/60 shadow-sm space-y-6">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#5b51d8]">
                <span>10</span>
                <span>Job preferences</span>
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mt-1">Job preferences</h3>
              <p className="text-xs text-muted-foreground">What you're open to — recruiters use this to match and filter.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Open to Roles</Label>
                <Input
                  placeholder="Full-Stack Developer, Backend Engineer..."
                  value={form.jobPreferences.roles}
                  onChange={(e) =>
                    setForm(prev => ({
                      ...prev,
                      jobPreferences: { ...prev.jobPreferences, roles: e.target.value },
                    }))
                  }
                  className="h-10 rounded-xl bg-muted/30 border-border"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Work Mode</Label>
                  <Select
                    value={form.jobPreferences.workMode}
                    onValueChange={(val) =>
                      setForm(prev => ({
                        ...prev,
                        jobPreferences: { ...prev.jobPreferences, workMode: val },
                      }))
                    }
                  >
                    <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-border text-xs">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_office">In-office</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="remote">Remote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Employment Type</Label>
                  <Select
                    value={form.jobPreferences.employmentType}
                    onValueChange={(val) =>
                      setForm(prev => ({
                        ...prev,
                        jobPreferences: { ...prev.jobPreferences, employmentType: val },
                      }))
                    }
                  >
                    <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-border text-xs">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full-time</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Preferred Locations</Label>
                  <Input
                    placeholder="Bengaluru, Remote"
                    value={form.jobPreferences.locations}
                    onChange={(e) =>
                      setForm(prev => ({
                        ...prev,
                        jobPreferences: { ...prev.jobPreferences, locations: e.target.value },
                      }))
                    }
                    className="h-10 rounded-xl bg-muted/30 border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Notice Period</Label>
                  <Select
                    value={form.jobPreferences.noticePeriod}
                    onValueChange={(val) =>
                      setForm(prev => ({
                        ...prev,
                        jobPreferences: { ...prev.jobPreferences, noticePeriod: val },
                      }))
                    }
                  >
                    <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-border text-xs">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="15_days">15 Days</SelectItem>
                      <SelectItem value="1_month">1 Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Expected CTC</Label>
                <Input
                  placeholder="e.g. ₹6–8 LPA"
                  value={form.jobPreferences.expectedCtc}
                  onChange={(e) =>
                    setForm(prev => ({
                      ...prev,
                      jobPreferences: { ...prev.jobPreferences, expectedCtc: e.target.value },
                    }))
                  }
                  className="h-10 rounded-xl bg-muted/30 border-border"
                />
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================= */}
      {/* LINKEDIN-STYLE MODAL DIALOGS FOR ADDING DETAILS */}
      {/* ========================================================= */}

      {/* 1. ADD PROJECT DIALOG */}
      <Dialog open={projectModalOpen} onOpenChange={setProjectModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Code className="h-5 w-5 text-[#5b51d8]" /> Add Project
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add your best engineering projects. GitHub repository is required for recruiter evaluation.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddProjectSubmit} className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Project Title *</Label>
              <Input
                placeholder="e.g. Intelligent Placement Management System"
                value={newProject.title}
                onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                required
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">GitHub / Repository URL *</Label>
              <Input
                placeholder="https://github.com/username/repository"
                value={newProject.repo_url}
                onChange={(e) => setNewProject({ ...newProject, repo_url: e.target.value })}
                required
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Live App / Demo URL (Optional)</Label>
              <Input
                placeholder="https://your-app.vercel.app"
                value={newProject.live_url}
                onChange={(e) => setNewProject({ ...newProject, live_url: e.target.value })}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Technologies / Stack</Label>
              <Input
                placeholder="e.g. React, TypeScript, Node.js, PostgreSQL"
                value={newProject.stack}
                onChange={(e) => setNewProject({ ...newProject, stack: e.target.value })}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                placeholder="Overview of system architecture, features, algorithms, and key results..."
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                className="min-h-[80px] text-xs rounded-xl"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setProjectModalOpen(false)} className="rounded-xl h-9 text-xs">
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl h-9 text-xs bg-[#5b51d8] hover:bg-[#4d43cc] text-white font-bold">
                Add Project
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. ADD CERTIFICATE DIALOG */}
      <Dialog open={certModalOpen} onOpenChange={setCertModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Award className="h-5 w-5 text-[#5b51d8]" /> Add License or Certification
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add verified professional certificates, course completions, and cloud badges.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddCertSubmit} className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Name *</Label>
              <Input
                placeholder="e.g. AWS Certified Solutions Architect - Associate"
                value={newCert.name}
                onChange={(e) => setNewCert({ ...newCert, name: e.target.value })}
                required
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Issuing Organization *</Label>
              <Input
                placeholder="e.g. Amazon Web Services, Google, Coursera"
                value={newCert.issuer}
                onChange={(e) => setNewCert({ ...newCert, issuer: e.target.value })}
                required
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Issue Date</Label>
                <Input
                  placeholder="e.g. Aug 2025"
                  value={newCert.issue_date}
                  onChange={(e) => setNewCert({ ...newCert, issue_date: e.target.value })}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Credential ID</Label>
                <Input
                  placeholder="e.g. ABC-123456"
                  value={newCert.credential_id}
                  onChange={(e) => setNewCert({ ...newCert, credential_id: e.target.value })}
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Credential URL</Label>
              <Input
                placeholder="https://www.credly.com/badges/..."
                value={newCert.link}
                onChange={(e) => setNewCert({ ...newCert, link: e.target.value })}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCertModalOpen(false)} className="rounded-xl h-9 text-xs">
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl h-9 text-xs bg-[#5b51d8] hover:bg-[#4d43cc] text-white font-bold">
                Add Certificate
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 3. ADD EXPERIENCE DIALOG */}
      <Dialog open={expModalOpen} onOpenChange={setExpModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-[#5b51d8]" /> Add Work Experience
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add corporate internships, apprenticeships, or research positions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddExpSubmit} className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Role / Title *</Label>
              <Input
                placeholder="e.g. Software Development Intern"
                value={newExp.role}
                onChange={(e) => setNewExp({ ...newExp, role: e.target.value })}
                required
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Company / Organization *</Label>
              <Input
                placeholder="e.g. Google, Microsoft, Infosys"
                value={newExp.company}
                onChange={(e) => setNewExp({ ...newExp, company: e.target.value })}
                required
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Duration *</Label>
              <Input
                placeholder="e.g. Jun 2025 - Aug 2025"
                value={newExp.duration}
                onChange={(e) => setNewExp({ ...newExp, duration: e.target.value })}
                required
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                placeholder="Responsibilities, project deliverables, and technologies used..."
                value={newExp.description}
                onChange={(e) => setNewExp({ ...newExp, description: e.target.value })}
                className="min-h-[80px] text-xs rounded-xl"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setExpModalOpen(false)} className="rounded-xl h-9 text-xs">
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl h-9 text-xs bg-[#5b51d8] hover:bg-[#4d43cc] text-white font-bold">
                Add Role
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 4. ADD ACHIEVEMENT DIALOG */}
      <Dialog open={achModalOpen} onOpenChange={setAchModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" /> Add Honor or Achievement
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add hackathon awards, academic rankings, or coding competition recognitions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddAchSubmit} className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Title / Recognition *</Label>
              <Input
                placeholder="e.g. 1st Place - Smart India Hackathon 2026"
                value={newAch.title}
                onChange={(e) => setNewAch({ ...newAch, title: e.target.value })}
                required
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Description / Organization (Optional)</Label>
              <Textarea
                placeholder="Details of the event, problem statement solved, or prize..."
                value={newAch.description}
                onChange={(e) => setNewAch({ ...newAch, description: e.target.value })}
                className="min-h-[70px] text-xs rounded-xl"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setAchModalOpen(false)} className="rounded-xl h-9 text-xs">
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl h-9 text-xs bg-[#5b51d8] hover:bg-[#4d43cc] text-white font-bold">
                Add Achievement
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 5. ADD EDUCATION DIALOG */}
      <Dialog open={eduModalOpen} onOpenChange={setEduModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-[#5b51d8]" /> Add Academic Qualification
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add previous degrees, diplomas, or 10th/12th academic milestones.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddEduSubmit} className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Degree / Qualification *</Label>
              <Input
                placeholder="e.g. Class 12 / Pre-University (PCMC)"
                value={newEdu.degree}
                onChange={(e) => setNewEdu({ ...newEdu, degree: e.target.value })}
                required
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Institution / College *</Label>
              <Input
                placeholder="e.g. National Public School"
                value={newEdu.institution}
                onChange={(e) => setNewEdu({ ...newEdu, institution: e.target.value })}
                required
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Passing Year</Label>
                <Input
                  placeholder="e.g. 2022"
                  value={newEdu.year}
                  onChange={(e) => setNewEdu({ ...newEdu, year: e.target.value })}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Score / Percentage</Label>
                <Input
                  placeholder="e.g. 94.5% or 9.2 CGPA"
                  value={newEdu.score}
                  onChange={(e) => setNewEdu({ ...newEdu, score: e.target.value })}
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEduModalOpen(false)} className="rounded-xl h-9 text-xs">
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl h-9 text-xs bg-[#5b51d8] hover:bg-[#4d43cc] text-white font-bold">
                Add Education
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
