import { Stats } from "@/types";

const STORAGE_KEY = "kaoshi_stats_v1";

export function loadStats(): Stats {
  if (typeof window === "undefined") {
    return emptyStats();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStats();
    const parsed = JSON.parse(raw) as Stats;
    return normalizeStats(parsed);
  } catch {
    return emptyStats();
  }
}

export function saveStats(stats: Stats) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

export function emptyStats(): Stats {
  return {
    perQuestionSeen: {},
    perQuestionCorrect: {},
    totalAttempts: 0,
    totalCorrect: 0
  };
}

export function normalizeStats(s: Stats): Stats {
  return {
    perQuestionSeen: s.perQuestionSeen || {},
    perQuestionCorrect: s.perQuestionCorrect || {},
    totalAttempts: s.totalAttempts || 0,
    totalCorrect: s.totalCorrect || 0
  };
}

export function recordSeen(stats: Stats, questionNumbers: number[]): Stats {
  const next: Stats = { ...stats, perQuestionSeen: { ...stats.perQuestionSeen } };
  for (const num of questionNumbers) {
    next.perQuestionSeen[num] = (next.perQuestionSeen[num] || 0) + 1;
  }
  return next;
}

export function recordSubmission(stats: Stats, questionNumbers: number[], correctness: boolean[]): Stats {
  const next: Stats = {
    ...stats,
    perQuestionSeen: { ...stats.perQuestionSeen },
    perQuestionCorrect: { ...stats.perQuestionCorrect },
    totalAttempts: stats.totalAttempts + 1,
    totalCorrect: stats.totalCorrect + correctness.filter(Boolean).length
  };
  for (let i = 0; i < questionNumbers.length; i++) {
    const qn = questionNumbers[i];
    next.perQuestionSeen[qn] = (next.perQuestionSeen[qn] || 0) + 1;
    if (correctness[i]) {
      next.perQuestionCorrect[qn] = (next.perQuestionCorrect[qn] || 0) + 1;
    }
  }
  return next;
}

export function getSummary(stats: Stats, totalQuestions: number) {
  const uniqueSeen = Object.keys(stats.perQuestionSeen).length;
  const totalAnswered = Object.values(stats.perQuestionSeen).reduce((sum, v) => sum + (v || 0), 0);
  const accuracy = totalAnswered === 0 ? 0 : Math.round((stats.totalCorrect / totalAnswered) * 100);
  return { uniqueSeen, totalQuestions, accuracy, totalAttempts: stats.totalAttempts, totalCorrect: stats.totalCorrect };
}

export function resetSeen(stats: Stats): Stats {
  return {
    ...stats,
    perQuestionSeen: {}
  };
}


