import { describe, it, expect } from "vitest";
import { computePassingStatus, type CandidateScore } from "@/services/driveEngine";

describe("PassingLogic Engine", () => {
  const mockCandidates: CandidateScore[] = [
    { studentId: "s1", score: 95 },
    { studentId: "s2", score: 88 },
    { studentId: "s3", score: 75 },
    { studentId: "s4", score: 60 },
    { studentId: "s5", score: 45 },
  ];

  it("should compute cutoff_score passing logic correctly", () => {
    // Cutoff score 70: candidates >= 70 qualify (s1: 95, s2: 88, s3: 75)
    const results = computePassingStatus(mockCandidates, "cutoff_score", 70);

    const qualified = results.filter((r) => r.status === "qualified").map((r) => r.studentId);
    const rejected = results.filter((r) => r.status === "not_qualified").map((r) => r.studentId);

    expect(qualified).toEqual(["s1", "s2", "s3"]);
    expect(rejected).toEqual(["s4", "s5"]);
  });

  it("should compute top_n passing logic correctly", () => {
    // Top 2: exactly top 2 scorers qualify (s1, s2)
    const results = computePassingStatus(mockCandidates, "top_n", 2);

    const qualified = results.filter((r) => r.status === "qualified").map((r) => r.studentId);
    const rejected = results.filter((r) => r.status === "not_qualified").map((r) => r.studentId);

    expect(qualified).toHaveLength(2);
    expect(qualified).toEqual(["s1", "s2"]);
    expect(rejected).toHaveLength(3);
    expect(rejected).toEqual(["s3", "s4", "s5"]);
  });

  it("should compute top_percent passing logic correctly", () => {
    // Top 40% of 5 candidates = Math.ceil(0.4 * 5) = 2 candidates (s1, s2)
    const results = computePassingStatus(mockCandidates, "top_percent", 40);

    const qualified = results.filter((r) => r.status === "qualified").map((r) => r.studentId);
    expect(qualified).toHaveLength(2);
    expect(qualified).toEqual(["s1", "s2"]);

    // Top 60% of 5 candidates = Math.ceil(0.6 * 5) = 3 candidates (s1, s2, s3)
    const results60 = computePassingStatus(mockCandidates, "top_percent", 60);
    const qualified60 = results60.filter((r) => r.status === "qualified").map((r) => r.studentId);
    expect(qualified60).toHaveLength(3);
    expect(qualified60).toEqual(["s1", "s2", "s3"]);
  });

  it("should handle edge case: 0 passingValue or empty candidates", () => {
    expect(computePassingStatus([], "cutoff_score", 50)).toEqual([]);

    const zeroCutoff = computePassingStatus(mockCandidates, "cutoff_score", 0);
    expect(zeroCutoff.every((r) => r.status === "qualified")).toBe(true);

    const zeroTopN = computePassingStatus(mockCandidates, "top_n", 0);
    expect(zeroTopN.every((r) => r.status === "not_qualified")).toBe(true);
  });
});
