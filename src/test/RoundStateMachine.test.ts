import { describe, it, expect } from "vitest";
import { canOpenRound, type DriveRound } from "@/services/driveEngine";

describe("RoundStateMachine Engine", () => {
  const createMockRound = (
    roundNumber: number,
    isPublished: boolean
  ): DriveRound => ({
    id: `round-${roundNumber}`,
    company_id: "comp-123",
    round_number: roundNumber,
    round_name: `Round ${roundNumber}`,
    round_type: "test",
    test_id: null,
    passing_logic: "cutoff_score",
    passing_value: 60,
    registration_deadline: null,
    is_published: isPublished,
    published_at: isPublished ? new Date().toISOString() : null,
    auto_progress: false,
    created_by: "user-admin",
    created_at: new Date().toISOString(),
  });

  it("should allow opening Round 1 as initial round", () => {
    const rounds: DriveRound[] = [createMockRound(1, false)];
    const result = canOpenRound(1, rounds);
    expect(result.allowed).toBe(true);
  });

  it("should block opening Round 2 if Round 1 is unpublished", () => {
    const rounds: DriveRound[] = [
      createMockRound(1, false), // unpublished
      createMockRound(2, false),
    ];
    const result = canOpenRound(2, rounds);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Round 1 results must be published first");
  });

  it("should allow opening Round 2 once Round 1 is published", () => {
    const rounds: DriveRound[] = [
      createMockRound(1, true), // published
      createMockRound(2, false),
    ];
    const result = canOpenRound(2, rounds);
    expect(result.allowed).toBe(true);
  });

  it("should block opening Round 3 if Round 2 is unpublished even if Round 1 is published", () => {
    const rounds: DriveRound[] = [
      createMockRound(1, true),
      createMockRound(2, false), // Round 2 not published yet
      createMockRound(3, false),
    ];
    const result = canOpenRound(3, rounds);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Round 2 results must be published first");
  });
});
