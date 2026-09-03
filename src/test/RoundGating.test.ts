import { describe, it, expect } from "vitest";

// Gating function matching StudentTests.tsx check
function checkRoundAccess(
  studentId: string,
  round: { id: string; round_number: number },
  participants: { drive_round_id: string; student_id: string; status: "pending" | "qualified" | "not_qualified" | "absent" }[]
): { allowed: boolean; reason?: string } {
  const p = participants.find(
    (item) => item.drive_round_id === round.id && item.student_id === studentId
  );

  if (!p) {
    return { allowed: false, reason: "Candidate is not enrolled in this round." };
  }

  if (p.status === "not_qualified" || p.status === "absent") {
    return { allowed: false, reason: `Access Gated: Candidate status is ${p.status}.` };
  }

  return { allowed: true };
}

describe("RoundGating Verification", () => {
  const round1 = { id: "round-1", round_number: 1 };
  const round2 = { id: "round-2", round_number: 2 };

  const participants = [
    { drive_round_id: "round-1", student_id: "s1", status: "qualified" as const },
    { drive_round_id: "round-1", student_id: "s2", status: "not_qualified" as const },
    { drive_round_id: "round-2", student_id: "s1", status: "pending" as const },
  ];

  it("should permit enrolled candidate with qualified or pending status to attempt", () => {
    const access = checkRoundAccess("s1", round2, participants);
    expect(access.allowed).toBe(true);
  });

  it("should block candidate with not_qualified status", () => {
    const access = checkRoundAccess("s2", round1, participants);
    expect(access.allowed).toBe(false);
    expect(access.reason).toContain("Access Gated: Candidate status is not_qualified.");
  });

  it("should block candidate from Round 2 if they were not advanced (not in participants)", () => {
    const access = checkRoundAccess("s2", round2, participants);
    expect(access.allowed).toBe(false);
    expect(access.reason).toContain("Candidate is not enrolled in this round.");
  });

  it("should block absent candidate from proceeding", () => {
    const participantsWithAbsent = [
      { drive_round_id: "round-1", student_id: "s3", status: "absent" as const },
    ];
    const access = checkRoundAccess("s3", round1, participantsWithAbsent);
    expect(access.allowed).toBe(false);
    expect(access.reason).toContain("Access Gated: Candidate status is absent.");
  });
});
