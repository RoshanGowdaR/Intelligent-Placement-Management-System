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
  Languages, FileText, CalendarDays, Code, CheckCircle2
} from "lucide-react";
import { formatExternalUrl } from "@/lib/utils";

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
  const skills: string[] = Array.isArray(profile.skills) ? profile.skills : [];
  const experiences: any[] = Array.isArray(profile.experience) ? profile.experience : [];
  const projects: any[] = Array.isArray(profile.projects) ? profile.projects : [];
  const education: any[] = Array.isArray(profile.education) && profile.education.length > 0
    ? profile.education
    : [{ degree: `B.Tech in ${profile.branch || "Computer Science"}`, institution: "Engineering College", year: profile.year_of_passing ? String(profile.year_of_passing) : "2026", score: profile.cgpa ? `${profile.cgpa} CGPA` : "" }];
  const certifications: any[] = Array.isArray(profile.certifications) ? profile.certifications : [];
  const achievements: string[] = Array.isArray(profile.achievements) ? profile.achievements : [];
  const languages: string[] = Array.isArray(profile.languages) ? profile.languages : [];
  const jobPrefs = profile.job_preferences || {
    roles: "Full-Stack Developer, SDE-1",
    workMode: "Hybrid / Remote",
    locations: "Bengaluru, Hyderabad",
    expectedCtc: "₹8–14 LPA",
    noticePeriod: "Immediate",
  };

  const resumeFormattedUrl = formatExternalUrl(profile.resume_url);

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
              {resumeFormattedUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(resumeFormattedUrl, "_blank")}
                  className="rounded-xl bg-black/20 border-white/40 text-white hover:bg-black/30 font-bold text-xs gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" /> View / Download Résumé
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
            <div className="flex flex-wrap items-center gap-2 ml-auto">
              {profile.linkedin_url && (
                <a
                  href={formatExternalUrl(profile.linkedin_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 font-bold text-[11px]"
                >
                  <Linkedin className="h-3 w-3" /> LinkedIn
                </a>
              )}
              {profile.github_url && (
                <a
                  href={formatExternalUrl(profile.github_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-foreground/10 text-foreground hover:bg-foreground/20 font-bold text-[11px]"
                >
                  <Github className="h-3 w-3" /> GitHub
                </a>
              )}
              {profile.portfolio_url && (
                <a
                  href={formatExternalUrl(profile.portfolio_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 font-bold text-[11px]"
                >
                  <Globe className="h-3 w-3" /> Portfolio
                </a>
              )}
              {profile.leetcode_url && (
                <a
                  href={formatExternalUrl(profile.leetcode_url)}
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
          {skills.length > 0 && (
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
          )}

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
                    {resumeFormattedUrl ? "Candidate resume attached. Click view fullscreen or download below." : "No resume uploaded by candidate."}
                  </p>
                </div>
              </div>

              {resumeFormattedUrl ? (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(resumeFormattedUrl, "_blank")}
                    className="h-8 text-xs rounded-xl gap-1.5 border-border"
                  >
                    <Eye className="h-3.5 w-3.5" /> View Document
                  </Button>
                  <Button
                    size="sm"
                    asChild
                    className="h-8 text-xs rounded-xl gap-1.5 bg-[#5b51d8] hover:bg-[#4d43cc] text-white"
                  >
                    <a href={resumeFormattedUrl} download={`${displayName}_Resume.pdf`} target="_blank" rel="noreferrer">
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

          {/* 1. DEDICATED FEATURED PROJECTS SECTION */}
          <div className="space-y-3 p-5 rounded-2xl bg-card border border-border/70 shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Code className="h-4 w-4 text-[#5b51d8]" /> Featured Projects ({projects.length})
              </h4>
            </div>

            {projects.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {projects.map((proj: any, i: number) => {
                  const repoUrl = formatExternalUrl(proj.repo_url || proj.link);
                  const liveUrl = formatExternalUrl(proj.live_url);

                  return (
                    <div key={i} className="p-4 rounded-xl bg-muted/20 border border-border/60 flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <h5 className="font-bold text-sm text-foreground flex items-center justify-between gap-2">
                          <span>{proj.title}</span>
                        </h5>
                        {proj.description && (
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                            {proj.description}
                          </p>
                        )}
                        {proj.stack && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {proj.stack.split(",").map((s: string, sIdx: number) => (
                              <span key={sIdx} className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-semibold text-muted-foreground">
                                {s.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Project Action Links: GitHub Repo (Must) & Live Demo (Optional) */}
                      <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                        {repoUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                            className="h-7 text-[11px] rounded-lg gap-1.5 font-bold border-border"
                          >
                            <a href={repoUrl} target="_blank" rel="noreferrer">
                              <Github className="h-3 w-3" /> Repository
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
                              <ExternalLink className="h-3 w-3" /> Live App
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground rounded-xl border border-dashed border-border/60">
                No individual projects listed yet.
              </div>
            )}
          </div>

          {/* 2. DEDICATED EXPERIENCE & EDUCATION GRID */}
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Education History */}
            <div className="space-y-3 p-4 rounded-2xl bg-muted/20 border border-border/60">
              <h4 className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-[#5b51d8]" /> Education History
              </h4>
              <div className="space-y-3">
                {education.map((edu: any, i: number) => (
                  <div key={i} className="text-xs border-l-2 border-[#5b51d8] pl-3 py-0.5 space-y-0.5">
                    <div className="font-bold text-foreground">{edu.degree}</div>
                    <div className="text-muted-foreground">{edu.institution} {edu.year ? `• ${edu.year}` : ""}</div>
                    {edu.score && <div className="text-[#5b51d8] font-bold">{edu.score}</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Experience History */}
            <div className="space-y-3 p-4 rounded-2xl bg-muted/20 border border-border/60">
              <h4 className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-[#5b51d8]" /> Work Experience &amp; Internships
              </h4>
              <div className="space-y-3">
                {experiences.length > 0 ? (
                  experiences.map((exp: any, i: number) => (
                    <div key={i} className="text-xs border-l-2 border-emerald-500 pl-3 py-0.5 space-y-0.5">
                      <div className="font-bold text-foreground">{exp.role} {exp.company ? `@ ${exp.company}` : ""}</div>
                      {exp.duration && <div className="text-muted-foreground">{exp.duration}</div>}
                      {exp.description && <p className="text-[11px] text-muted-foreground line-clamp-3">{exp.description}</p>}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground py-2">
                    No corporate internships or employment history listed yet.
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* 3. CERTIFICATIONS & ACHIEVEMENTS */}
          {(certifications.length > 0 || achievements.length > 0) && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Certifications */}
              {certifications.length > 0 && (
                <div className="space-y-3 p-4 rounded-2xl bg-muted/20 border border-border/60">
                  <h4 className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-[#5b51d8]" /> Certifications &amp; Badges
                  </h4>
                  <div className="space-y-2.5">
                    {certifications.map((cert: any, i: number) => (
                      <div key={i} className="text-xs flex items-center justify-between gap-2 border-b border-border/40 pb-2 last:border-b-0">
                        <div>
                          <div className="font-bold text-foreground">{cert.name}</div>
                          <div className="text-muted-foreground text-[11px]">{cert.issuer} {cert.issue_date ? `• ${cert.issue_date}` : ""}</div>
                        </div>
                        {cert.link && (
                          <a
                            href={formatExternalUrl(cert.link)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#5b51d8] hover:underline text-[11px] font-bold flex items-center gap-1 shrink-0"
                          >
                            Verify <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Achievements */}
              {achievements.length > 0 && (
                <div className="space-y-3 p-4 rounded-2xl bg-muted/20 border border-border/60">
                  <h4 className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-amber-500" /> Honors &amp; Recognitions
                  </h4>
                  <div className="space-y-2">
                    {achievements.map((ach: any, i: number) => (
                      <div key={i} className="text-xs flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span className="text-foreground">{typeof ach === "string" ? ach : ach.title || JSON.stringify(ach)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

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
                {languages.length > 0 ? (
                  languages.map((l) => (
                    <span key={l} className="px-2 py-0.5 rounded-md bg-muted text-foreground text-[11px] font-medium">
                      {l}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground">English</span>
                )}
              </div>
            </div>
          </div>

        </div>

      </DialogContent>
    </Dialog>
  );
}
