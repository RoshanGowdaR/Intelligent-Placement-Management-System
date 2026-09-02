import { describe, it, expect } from "vitest";

// Test the eligibility checking logic directly
function checkEligibility(
  company: {
    eligibility_criteria: Record<string, number> | null;
    skills_priority: string[] | null;
  },
  profile: { cgpa: number | null; year_of_passing: number | null; skills: string[] }
) {
  const criteria = (company.eligibility_criteria as Record<string, number>) ?? {};
  const requiredSkills = (company.skills_priority as string[]) ?? [];
  const reasons: string[] = [];
  let eligible = true;

  if (criteria.min_cgpa && criteria.min_cgpa > 0) {
    if (!profile.cgpa || profile.cgpa < criteria.min_cgpa) {
      eligible = false;
      reasons.push(`CGPA ${profile.cgpa ?? "N/A"} is below minimum ${criteria.min_cgpa}`);
    }
  }

  if (criteria.min_year_of_passing) {
    if (!profile.year_of_passing || profile.year_of_passing < criteria.min_year_of_passing) {
      eligible = false;
      reasons.push(`Year of passing does not meet requirement`);
    }
  }

  const profileSkillsLower = profile.skills.map((s) => s.toLowerCase());
  const matchedSkills = requiredSkills.filter((s) => profileSkillsLower.includes(s.toLowerCase()));
  const missingSkills = requiredSkills.filter((s) => !profileSkillsLower.includes(s.toLowerCase()));

  return { eligible, reasons, matchedSkills, missingSkills };
}

describe("EligibilityChecker Logic", () => {
  it("should be eligible when all criteria are met", () => {
    const result = checkEligibility(
      { eligibility_criteria: { min_cgpa: 7.0 }, skills_priority: ["React", "TypeScript"] },
      { cgpa: 8.5, year_of_passing: 2025, skills: ["React", "TypeScript", "Node.js"] }
    );
    expect(result.eligible).toBe(true);
    expect(result.reasons).toHaveLength(0);
    expect(result.matchedSkills).toEqual(["React", "TypeScript"]);
    expect(result.missingSkills).toHaveLength(0);
  });

  it("should be ineligible when CGPA is too low", () => {
    const result = checkEligibility(
      { eligibility_criteria: { min_cgpa: 7.0 }, skills_priority: [] },
      { cgpa: 5.5, year_of_passing: 2025, skills: [] }
    );
    expect(result.eligible).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("should identify missing skills", () => {
    const result = checkEligibility(
      { eligibility_criteria: null, skills_priority: ["React", "Python", "Docker"] },
      { cgpa: 8.0, year_of_passing: 2025, skills: ["React"] }
    );
    expect(result.matchedSkills).toEqual(["React"]);
    expect(result.missingSkills).toEqual(["Python", "Docker"]);
  });

  it("should be eligible with no criteria", () => {
    const result = checkEligibility(
      { eligibility_criteria: null, skills_priority: null },
      { cgpa: 6.0, year_of_passing: 2025, skills: [] }
    );
    expect(result.eligible).toBe(true);
  });

  it("should handle null CGPA", () => {
    const result = checkEligibility(
      { eligibility_criteria: { min_cgpa: 7.0 }, skills_priority: null },
      { cgpa: null, year_of_passing: 2025, skills: [] }
    );
    expect(result.eligible).toBe(false);
  });
});
