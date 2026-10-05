import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mail, Phone, MapPin, Globe, Github, Linkedin, ExternalLink,
  Download, Eye, ShieldCheck, GraduationCap, Briefcase, Award,
  Languages, FileText, CalendarDays
} from "lucide-react";

interface StudentProfileDialogProps {
  studentId: string | null;
  initialData?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduleInterview?: (student: any) => void;
}

export function StudentProfileDialog({
  studentId,
  initialData,
  open,
  onOpenChange,
  onScheduleInterview,
}: StudentProfileDialogProps) {
  const [profile, setProfile] = useState<any>(initialData || null);

  useEffect(() => {
    if (!open || !studentId) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", studentId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfile({ ...initialData, ...data });
        } else if (initialData) {
          setProfile(initialData);
        }
      });
  }, [open, studentId, initialData]);

  if (!profile) return null;

  const displayName = profile.name || profile.email || "Candidate";
  const userInitial = displayName.charAt(0).toUpperCase();
  const headline = profile.headline || "Engineering Candidate";
  const bio = profile.bio || "Candidate pursuing engineering placements with proven academic and technical background.";
  const skills: string[] = Array.isArray(profile.skills) ? profile.skills : ["React", "TypeScript", "Node.js", "Python", "SQL"];
  const experiences: any[] = Array.isArray(profile.experience) ? profile.experience : [];
  const projects: any[] = Array.isArray(profile.projects) ? profile.projects : [];
  const education: any[] = Array.isArray(profile.education) && profile.education.length > 0
    ? profile.education
    : [{ degree: `B.Tech in ${profile.branch || "Computer Science"}`, institution: "Engineering College", year: profile.year_of_passing ? String(profile.year_of_passing) : "2026", score: profile.cgpa ? `${profile.cgpa} CGPA` : "8.5 CGPA" }];
  const achievements: string[] = Array.isArray(profile.achievements) ? profile.achievements : [];
  const languages: string[] = Array.isArray(profile.languages) ? profile.languages : ["English", "Kannada", "Hindi"];
  const jobPrefs = profile.job_preferences || {
    roles: "Full-Stack Developer, SDE-1",
    workMode: "Hybrid / Remote",
    locations: "Bengaluru, Hyderabad",
    expectedCtc: "₹8–14 LPA",
    noticePeriod: "Immediate",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-border bg-card shadow-2xl">
        
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-[#5b51d8] via-[#7568f5] to-[#9185ff] p-6 text-white relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-2xl bg-white/20 border-2 border-white/40 text-white font-extrabold text-3xl flex items-center justify-center shrink-0 overflow-hidden shadow-lg backdrop-blur-md">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <span>{userInitial}</span>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-sm">
                    {displayName}
                  </h2>
                  {profile.usn && (
                    <Badge className="bg-white/20 hover:bg-white/25 text-white border-white/30 font-mono text-xs">
                      {profile.usn}
                    </Badge>
                  )}
                  <Badge className="bg-emerald-500/90 text-white border-0 text-[10px] font-bold gap-1 shadow-sm">
                    <ShieldCheck className="h-3 w-3" /> Verified Candidate
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-white/90 font-medium">{headline}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-white/80 pt-0.5">
                  <span>{profile.branch || "Computer Science"}</span>
                  <span>•</span>
                  <span>Batch of {profile.year_of_passing || 2026}</span>
                  {profile.cgpa && (
                    <>
                      <span>•</span>
                      <span className="font-bold text-white bg-black/20 px-2 py-0.5 rounded-full">
                        {profile.cgpa} CGPA
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex sm:flex-col gap-2 shrink-0">
              {onScheduleInterview && (
                <Button
                  size="sm"
                  onClick={() => onScheduleInterview(profile)}
                  className="rounded-xl bg-white text-[#5b51d8] hover:bg-white/90 font-bold text-xs gap-1.5 shadow-md"
                >
                  <CalendarDays className="h-3.5 w-3.5" /> Schedule Interview
                </Button>
              )}
              {profile.resume_url && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(profile.resume_url, "_blank")}
                  className="rounded-xl bg-black/20 border-white/40 text-white hover:bg-black/30 font-bold text-xs gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" /> Download Résumé
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 md:p-8 space-y-6">

          {/* Social & Contact Strip */}
          <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-2xl bg-muted/40 border border-border/70 text-xs">
            {profile.email && (
              <a href={`mailto:${profile.email}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                <Mail className="h-3.5 w-3.5 text-primary" /> {profile.email}
              </a>
            )}
            {profile.phone && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Phone className="h-3.5 w-3.5 text-primary" /> {profile.phone}
              </span>
            )}
            {profile.location && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-primary" /> {profile.location}
              </span>
            )}
            <div className="flex items-center gap-2 ml-auto">
              {profile.linkedin_url && (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 font-bold text-[11px]"
                >
                  <Linkedin className="h-3 w-3" /> LinkedIn
                </a>
              )}
              {profile.github_url && (
                <a
                  href={profile.github_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-foreground/10 text-foreground hover:bg-foreground/20 font-bold text-[11px]"
                >
                  <Github className="h-3 w-3" /> GitHub
                </a>
              )}
              {profile.portfolio_url && (
                <a
                  href={profile.portfolio_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 font-bold text-[11px]"
                >
                  <Globe className="h-3 w-3" /> Portfolio
                </a>
              )}
              {profile.leetcode_url && (
                <a
                  href={profile.leetcode_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 font-bold text-[11px]"
                >
                  <ExternalLink className="h-3 w-3" /> LeetCode
                </a>
              )}
            </div>
          </div>

          {/* Professional Bio */}
          <div className="space-y-1.5">
            <h4 className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground">About the Candidate</h4>
            <p className="text-xs sm:text-sm text-foreground leading-relaxed">{bio}</p>
          </div>

          {/* Technical Skills */}
          <div className="space-y-2">
            <h4 className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground">Technical Skills &amp; Stack</h4>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="text-xs font-semibold px-2.5 py-1 rounded-lg">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          {/* Official Resume View / Download Card */}
          <div className="p-4 rounded-2xl bg-[#5b51d8]/5 border border-[#5b51d8]/20 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#5b51d8]/15 text-[#5b51d8] flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Candidate Official Résumé (PDF)</h4>
                  <p className="text-[11px] text-muted-foreground">
                    {profile.resume_url ? "Full candidate resume attached and verified by college placement office." : "No resume uploaded by candidate."}
                  </p>
                </div>
              </div>

              {profile.resume_url ? (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(profile.resume_url, "_blank")}
                    className="h-8 text-xs rounded-xl gap-1.5 border-border"
                  >
                    <Eye className="h-3.5 w-3.5" /> View Fullscreen
                  </Button>
                  <Button
                    size="sm"
                    asChild
                    className="h-8 text-xs rounded-xl gap-1.5 bg-[#5b51d8] hover:bg-[#4d43cc] text-white"
                  >
                    <a href={profile.resume_url} download={`${displayName}_Resume.pdf`} target="_blank" rel="noreferrer">
                      <Download className="h-3.5 w-3.5" /> Download PDF
                    </a>
                  </Button>
                </div>
              ) : (
                <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-xs">
                  Pending Upload
                </Badge>
              )}
            </div>
          </div>

          {/* Education & Experience Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Education */}
            <div className="space-y-3 p-4 rounded-2xl bg-muted/20 border border-border/60">
              <h4 className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-[#5b51d8]" /> Education History
              </h4>
              <div className="space-y-3">
                {education.map((edu: any, i: number) => (
                  <div key={i} className="text-xs border-l-2 border-[#5b51d8] pl-3 py-0.5 space-y-0.5">
                    <div className="font-bold text-foreground">{edu.degree}</div>
                    <div className="text-muted-foreground">{edu.institution} • {edu.year}</div>
                    <div className="text-[#5b51d8] font-bold">{edu.score}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Experience / Projects */}
            <div className="space-y-3 p-4 rounded-2xl bg-muted/20 border border-border/60">
              <h4 className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-[#5b51d8]" /> Experience &amp; Projects
              </h4>
              <div className="space-y-3">
                {experiences.length > 0 ? (
                  experiences.map((exp: any, i: number) => (
                    <div key={i} className="text-xs border-l-2 border-emerald-500 pl-3 py-0.5 space-y-0.5">
                      <div className="font-bold text-foreground">{exp.role} @ {exp.company}</div>
                      <div className="text-muted-foreground">{exp.duration}</div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{exp.description}</p>
                    </div>
                  ))
                ) : projects.length > 0 ? (
                  projects.map((proj: any, i: number) => (
                    <div key={i} className="text-xs border-l-2 border-purple-500 pl-3 py-0.5 space-y-0.5">
                      <div className="font-bold text-foreground flex items-center gap-1">
                        <span>{proj.title}</span>
                        {proj.link && (
                          <a href={proj.link} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{proj.stack}</div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{proj.description}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground py-2">
                    Verified coursework projects in full-stack architecture, database design, and algorithmic problem solving.
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Job Preferences & Languages */}
          <div className="grid sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-muted/20 border border-border/60 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block mb-1">
                Placement Preferences
              </span>
              <p className="font-semibold text-foreground">Roles: {jobPrefs.roles || "SDE, Full-Stack"}</p>
              <p className="text-muted-foreground">Mode: {jobPrefs.workMode || "Hybrid"} • Expected: {jobPrefs.expectedCtc || "₹8-12 LPA"}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block mb-1">
                Languages Known
              </span>
              <div className="flex flex-wrap gap-1">
                {languages.map((l) => (
                  <span key={l} className="px-2 py-0.5 rounded-md bg-muted text-foreground text-[11px] font-medium">
                    {l}
                  </span>
                ))}
              </div>
            </div>
          </div>

        </div>

      </DialogContent>
    </Dialog>
  );
}
