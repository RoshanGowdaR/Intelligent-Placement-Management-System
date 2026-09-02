import { describe, it, expect } from "vitest";

interface Question {
  id: string;
  subject: string;
  correct_answer: string;
  points: number;
}

function calculateScore(
  questions: Question[],
  answers: Record<string, string>,
  passCriteria: { min_score_percent?: number }
) {
  let totalScore = 0;
  let totalPoints = 0;
  const subjectScores: Record<string, { earned: number; total: number }> = {};

  questions.forEach((q) => {
    totalPoints += q.points;
    if (!subjectScores[q.subject]) subjectScores[q.subject] = { earned: 0, total: 0 };
    subjectScores[q.subject].total += q.points;

    const userAnswer = (answers[q.id] ?? "").trim().toLowerCase();
    const correct = q.correct_answer.trim().toLowerCase();
    if (userAnswer === correct) {
      totalScore += q.points;
      subjectScores[q.subject].earned += q.points;
    }
  });

  const scorePercent = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0;
  const minPass = passCriteria.min_score_percent ?? 50;
  const passed = scorePercent >= minPass;

  return { scorePercent, passed, totalScore, totalPoints, subjectScores };
}

describe("Test Scoring", () => {
  const questions: Question[] = [
    { id: "q1", subject: "Math", correct_answer: "A", points: 10 },
    { id: "q2", subject: "Math", correct_answer: "B", points: 10 },
    { id: "q3", subject: "Science", correct_answer: "C", points: 10 },
    { id: "q4", subject: "Science", correct_answer: "D", points: 10 },
  ];

  it("should calculate 100% when all answers are correct", () => {
    const answers = { q1: "A", q2: "B", q3: "C", q4: "D" };
    const result = calculateScore(questions, answers, { min_score_percent: 50 });
    expect(result.scorePercent).toBe(100);
    expect(result.passed).toBe(true);
  });

  it("should calculate 0% when no answers are given", () => {
    const result = calculateScore(questions, {}, { min_score_percent: 50 });
    expect(result.scorePercent).toBe(0);
    expect(result.passed).toBe(false);
  });

  it("should calculate 50% when half are correct", () => {
    const answers = { q1: "A", q2: "A", q3: "C", q4: "A" };
    const result = calculateScore(questions, answers, { min_score_percent: 50 });
    expect(result.scorePercent).toBe(50);
    expect(result.passed).toBe(true);
  });

  it("should fail when below pass criteria", () => {
    const answers = { q1: "A" };
    const result = calculateScore(questions, answers, { min_score_percent: 50 });
    expect(result.scorePercent).toBe(25);
    expect(result.passed).toBe(false);
  });

  it("should be case-insensitive for answer matching", () => {
    const answers = { q1: "a", q2: "b", q3: "c", q4: "d" };
    const result = calculateScore(questions, answers, { min_score_percent: 50 });
    expect(result.scorePercent).toBe(100);
  });

  it("should calculate subject-wise scores", () => {
    const answers = { q1: "A", q2: "X", q3: "C", q4: "X" };
    const result = calculateScore(questions, answers, { min_score_percent: 50 });
    expect(result.subjectScores.Math.earned).toBe(10);
    expect(result.subjectScores.Math.total).toBe(20);
    expect(result.subjectScores.Science.earned).toBe(10);
    expect(result.subjectScores.Science.total).toBe(20);
  });

  it("should handle empty questions array", () => {
    const result = calculateScore([], {}, { min_score_percent: 50 });
    expect(result.scorePercent).toBe(0);
    expect(result.passed).toBe(false);
  });

  it("should default pass criteria to 50% if not specified", () => {
    const answers = { q1: "A", q2: "B" };
    const result = calculateScore(questions, answers, {});
    expect(result.scorePercent).toBe(50);
    expect(result.passed).toBe(true);
  });
});
