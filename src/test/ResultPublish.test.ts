import { describe, it, expect } from "vitest";

interface Participant {
  id: string;
  student_id: string;
  status: "pending" | "qualified" | "not_qualified" | "absent";
}

// Emulates publish validation and notification batching
function validateAndBatchPublish(
  round: { id: string; round_number: number; is_published: boolean },
  participants: Participant[]
) {
  if (participants.length === 0) {
    throw new Error("No candidates to publish.");
  }

  const pending = participants.filter((p) => p.status === "pending");
  if (pending.length > 0) {
    throw new Error(
      `Cannot publish results. ${pending.length} candidate(s) still pending evaluation.`
    );
  }

  // Generate batch notifications
  const notifications = participants.map((p) => ({
    userId: p.student_id,
    title: `Round ${round.round_number} Results Published`,
    status: p.status,
  }));

  return {
    isPublished: true,
    publishedCount: participants.length,
    notifications,
  };
}

describe("ResultPublish Batch Verification", () => {
  it("should fail publication if any candidate is pending evaluation", () => {
    const round = { id: "r1", round_number: 1, is_published: false };
    const participants: Participant[] = [
      { id: "p1", student_id: "s1", status: "qualified" },
      { id: "p2", student_id: "s2", status: "pending" }, // pending evaluation
    ];

    expect(() => validateAndBatchPublish(round, participants)).toThrow(
      /Cannot publish results. 1 candidate\(s\) still pending evaluation/
    );
  });

  it("should successfully batch-publish when all candidates are evaluated", () => {
    const round = { id: "r1", round_number: 1, is_published: false };
    const participants: Participant[] = [
      { id: "p1", student_id: "s1", status: "qualified" },
      { id: "p2", student_id: "s2", status: "not_qualified" },
      { id: "p3", student_id: "s3", status: "absent" },
    ];

    const result = validateAndBatchPublish(round, participants);
    expect(result.isPublished).toBe(true);
    expect(result.publishedCount).toBe(3);
    // Verifies simultaneous single notification per candidate
    expect(result.notifications).toHaveLength(3);
    expect(result.notifications.map((n) => n.userId)).toEqual(["s1", "s2", "s3"]);
  });
});
