import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Building2, Sparkles } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Company = Tables<"companies">;

interface EligibilityResult {
  company: Company;
  eligible: boolean;
  reasons: string[];
  matchedSkills: string[];
  missingSkills: string[];
}

function checkEligibility(
  company: Company,
  profile: { cgpa: number | null; year_of_passing: number | null; skills: string[] }
): EligibilityResult {
  const criteria = (company.eligibility_criteria as Record<string, number>) ?? {};
  const requiredSkills = (company.skills_priority as string[]) ?? [];
  const reasons: string[] = [];
  let eligible = true;

  // Check CGPA
  if (criteria.min_cgpa && criteria.min_cgpa > 0) {
    if (!profile.cgpa || profile.cgpa < criteria.min_cgpa) {
      eligible = false;
      reasons.push(`CGPA ${profile.cgpa ?? "N/A"} < required ${criteria.min_cgpa}`);
    }
  }

  // Check year of passing
  if (criteria.year_of_passing && criteria.year_of_passing > 0) {
    if (!profile.year_of_passing || profile.year_of_passing !== criteria.year_of_passing) {
      eligible = false;
      reasons.push(`Year of passing ${profile.year_of_passing ?? "N/A"} ≠ required ${criteria.year_of_passing}`);
    }
  }

  // Check skills
  const studentSkillsLower = profile.skills.map(s => s.toLowerCase().trim());
  const matchedSkills = requiredSkills.filter(s => studentSkillsLower.includes(s.toLowerCase().trim()));
  const missingSkills = requiredSkills.filter(s => !studentSkillsLower.includes(s.toLowerCase().trim()));

  if (requiredSkills.length > 0 && missingSkills.length > 0) {
    // If more than half skills are missing, mark ineligible
    if (missingSkills.length > requiredSkills.length / 2) {
      eligible = false;
    }
    reasons.push(`Missing skills: ${missingSkills.join(", ")}`);
  }

  return { company, eligible, reasons, matchedSkills, missingSkills };
}

export function EligibilityChecker() {
  const { user } = useAuth();
  const [results, setResults] = useState<EligibilityResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [profileRes, companiesRes] = await Promise.all([
        supabase.from("profiles").select("cgpa, year_of_passing, skills").eq("id", user.id).single(),
        supabase.from("companies").select("*").order("name"),
      ]);

      const profile = {
        cgpa: (profileRes.data as any)?.cgpa ?? null,
        year_of_passing: (profileRes.data as any)?.year_of_passing ?? null,
        skills: ((profileRes.data as any)?.skills as string[]) ?? [],
      };

      const companies = (companiesRes.data ?? []) as Company[];
      const eligibilityResults = companies.map(c => checkEligibility(c, profile));

      // Sort: eligible first
      eligibilityResults.sort((a, b) => (b.eligible ? 1 : 0) - (a.eligible ? 1 : 0));
      setResults(eligibilityResults);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (loading) return null;
  if (results.length === 0) return null;

  const eligibleCount = results.filter(r => r.eligible).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4 text-primary" />
          Company Eligibility
          <Badge variant="secondary" className="ml-auto text-xs">
            {eligibleCount}/{results.length} eligible
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {results.map((r) => {
          const requiredSkills = (r.company.skills_priority as string[]) ?? [];
          return (
            <div
              key={r.company.id}
              className={`rounded-lg border p-3 transition-colors ${
                r.eligible
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-destructive/20 bg-destructive/5"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{r.company.name}</span>
                {r.eligible ? (
                  <Badge variant="outline" className="text-green-600 border-green-500/50 text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Eligible
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-destructive border-destructive/50 text-xs">
                    <XCircle className="h-3 w-3 mr-1" /> Not Eligible
                  </Badge>
                )}
              </div>

              {/* Skills display */}
              {requiredSkills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {requiredSkills.map((skill, i) => {
                    const matched = r.matchedSkills.some(s => s.toLowerCase() === skill.toLowerCase());
                    return (
                      <Badge
                        key={i}
                        variant={matched ? "default" : "outline"}
                        className={`text-xs ${
                          matched
                            ? "bg-green-600 hover:bg-green-700"
                            : "text-muted-foreground"
                        }`}
                      >
                        {matched && <Sparkles className="h-2.5 w-2.5 mr-0.5" />}
                        {skill}
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Reasons for ineligibility */}
              {!r.eligible && r.reasons.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {r.reasons.map((reason, i) => (
                    <p key={i} className="text-xs text-muted-foreground">• {reason}</p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
