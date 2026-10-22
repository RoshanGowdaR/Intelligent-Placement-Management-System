import { describe, it, expect } from "vitest";

// Proctor score calculation helper function mirroring the implementation in PlacementAIChat and AdminAIAssistant
export function calculateProctorScore(params: {
  tabSwitches: number;
  gadgetDetected: boolean;
  autoSubmitted: boolean;
}) {
  let score = 100 - (params.tabSwitches * 15) - (params.gadgetDetected ? 40 : 0);
  if (params.autoSubmitted) {
    score = Math.min(score, 20);
  }
  score = Math.max(0, Math.min(100, score));

  const status: "Clean / Valid" | "Warning / Suspicious" | "Flagged Cheat / High Risk" =
    score >= 85
      ? "Clean / Valid"
      : score >= 60
      ? "Warning / Suspicious"
      : "Flagged Cheat / High Risk";

  return { score, status };
}

// Company eligibility matching logic
export function evaluateCandidateEligibility(
  candidate: { cgpa: number | null; branch: string | null; backlogs: number | null },
  criteria: { minCgpa: number; allowedBranches: string[]; maxBacklogs: number | null }
) {
  const candidateCgpa = candidate.cgpa ?? 0;
  const meetsCgpa = candidateCgpa >= criteria.minCgpa;
  
  const meetsBranch =
    criteria.allowedBranches.length === 0 ||
    criteria.allowedBranches.some(
      (b) => !candidate.branch || b.toLowerCase().includes(candidate.branch.toLowerCase())
    );

  const meetsBacklogs =
    criteria.maxBacklogs == null || (candidate.backlogs ?? 0) <= criteria.maxBacklogs;

  return {
    isEligible: meetsCgpa && meetsBranch && meetsBacklogs,
    reasons: [
      ...(!meetsCgpa ? [`CGPA ${candidateCgpa} below required ${criteria.minCgpa}`] : []),
      ...(!meetsBranch ? [`Branch ${candidate.branch} not in allowed list`] : []),
      ...(!meetsBacklogs ? [`Backlogs ${candidate.backlogs} exceeds max ${criteria.maxBacklogs}`] : []),
    ],
  };
}

describe("Placement AI & Backend Business Logic", () => {
  describe("Proctor Integrity Calculation", () => {
    it("should award 100/100 and Clean status for test with zero violations", () => {
      const result = calculateProctorScore({
        tabSwitches: 0,
        gadgetDetected: false,
        autoSubmitted: false,
      });

      expect(result.score).toBe(100);
      expect(result.status).toBe("Clean / Valid");
    });

    it("should deduct 15 points per tab switch and return Warning status for 2 tab switches (e.g. Hemanth test)", () => {
      const result = calculateProctorScore({
        tabSwitches: 2,
        gadgetDetected: false,
        autoSubmitted: false,
      });

      // 100 - (2 * 15) = 70
      expect(result.score).toBe(70);
      expect(result.status).toBe("Warning / Suspicious");
    });

    it("should deduct 40 points when a mobile phone / digital gadget is detected", () => {
      const result = calculateProctorScore({
        tabSwitches: 1,
        gadgetDetected: true,
        autoSubmitted: false,
      });

      // 100 - 15 - 40 = 45
      expect(result.score).toBe(45);
      expect(result.status).toBe("Flagged Cheat / High Risk");
    });

    it("should cap score at 20 or lower if auto-submitted due to cheat threshold", () => {
      const result = calculateProctorScore({
        tabSwitches: 1,
        gadgetDetected: false,
        autoSubmitted: true,
      });

      // 100 - 15 = 85, capped at 20 due to auto-submit
      expect(result.score).toBe(20);
      expect(result.status).toBe("Flagged Cheat / High Risk");
    });

    it("should never return a score below 0", () => {
      const result = calculateProctorScore({
        tabSwitches: 10,
        gadgetDetected: true,
        autoSubmitted: true,
      });

      expect(result.score).toBe(0);
      expect(result.status).toBe("Flagged Cheat / High Risk");
    });
  });

  describe("Candidate Eligibility Evaluation", () => {
    const tierOneCriteria = {
      minCgpa: 8.0,
      allowedBranches: ["Computer Science", "Information Science", "AI & ML"],
      maxBacklogs: 0,
    };

    it("should mark student eligible when all criteria are satisfied", () => {
      const candidate = { cgpa: 8.7, branch: "Computer Science", backlogs: 0 };
      const evaluation = evaluateCandidateEligibility(candidate, tierOneCriteria);

      expect(evaluation.isEligible).toBe(true);
      expect(evaluation.reasons).toHaveLength(0);
    });

    it("should reject student whose CGPA is below minimum cutoff", () => {
      const candidate = { cgpa: 7.4, branch: "Computer Science", backlogs: 0 };
      const evaluation = evaluateCandidateEligibility(candidate, tierOneCriteria);

      expect(evaluation.isEligible).toBe(false);
      expect(evaluation.reasons[0]).toContain("CGPA 7.4 below required 8");
    });

    it("should reject student with active backlogs exceeding cutoff", () => {
      const candidate = { cgpa: 8.5, branch: "Computer Science", backlogs: 2 };
      const evaluation = evaluateCandidateEligibility(candidate, tierOneCriteria);

      expect(evaluation.isEligible).toBe(false);
      expect(evaluation.reasons[0]).toContain("Backlogs 2 exceeds max 0");
    });

    it("should reject student from non-eligible branch", () => {
      const candidate = { cgpa: 8.9, branch: "Civil Engineering", backlogs: 0 };
      const evaluation = evaluateCandidateEligibility(candidate, tierOneCriteria);

      expect(evaluation.isEligible).toBe(false);
      expect(evaluation.reasons[0]).toContain("Branch Civil Engineering not in allowed list");
    });
  });

  describe("Telemetry KPI and Chart Schema Generation", () => {
    it("should correctly compute unique attendance, pass, fail, and pass rate", () => {
      const attempts = [
        { student_id: "s1", passed: true, score: 85 },
        { student_id: "s2", passed: false, score: 30 },
        { student_id: "s1", passed: true, score: 90 }, // repeat attempt by s1
        { student_id: "s3", passed: false, score: 40 },
      ];

      const attempterIds = new Set(attempts.map((a) => a.student_id));
      const passedAttempters = new Set(attempts.filter((a) => a.passed).map((a) => a.student_id));
      const failedAttempters = new Set(
        attempts.filter((a) => !a.passed).map((a) => a.student_id).filter((id) => !passedAttempters.has(id))
      );

      expect(attempterIds.size).toBe(3); // s1, s2, s3
      expect(passedAttempters.size).toBe(1); // s1
      expect(failedAttempters.size).toBe(2); // s2, s3

      const passRate = Math.round((attempts.filter((a) => a.passed).length / attempts.length) * 100);
      expect(passRate).toBe(50); // 2 passed out of 4 total submissions
    });
  });
});
