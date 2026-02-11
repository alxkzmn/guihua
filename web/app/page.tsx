"use client";

import React from "react";
import { QuizQuestion, Stats } from "@/types";
import { emptyStats, getSummary, loadStats, recordSubmission, saveStats, resetSeen } from "@/lib/stats";
import { ThemePreference, applyTheme, getStoredTheme, setStoredTheme } from "@/lib/theme";

type ApiResponse = { questions: QuizQuestion[]; total: number };

function usePersistentStats(): [Stats, (updater: (s: Stats) => Stats) => void] {
  const [stats, setStats] = React.useState<Stats>(emptyStats());
  React.useEffect(() => {
    setStats(loadStats());
  }, []);
  const update = React.useCallback((updater: (s: Stats) => Stats) => {
    setStats((prev) => {
      const next = updater(prev);
      saveStats(next);
      return next;
    });
  }, []);
  return [stats, update];
}

export default function Page() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<ApiResponse | null>(null);
  const [answers, setAnswers] = React.useState<Record<number, number>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [stats, updateStats] = usePersistentStats();
  const [showNumbers, setShowNumbers] = React.useState(false);
  const [theme, setTheme] = React.useState<ThemePreference>("system");
  const statsRef = React.useRef<Stats>(stats);

  React.useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  React.useEffect(() => {
    const pref = getStoredTheme();
    setTheme(pref);
    applyTheme(pref);
  }, []);

  const cycleTheme = React.useCallback(() => {
    const next: ThemePreference = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
    setTheme(next);
    setStoredTheme(next);
    applyTheme(next);
  }, [theme]);

  const fetchQuestions = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setSubmitted(false);
    setAnswers({});
    try {
      // 1) fetch meta
      const metaRes = await fetch("/api/meta", { cache: "no-store" });
      if (!metaRes.ok) throw new Error("Failed to fetch meta");
      const meta = await metaRes.json() as { total: number; numbers: number[] };

      // 2) choose numbers prioritized by least seen, then most mistakes, then random
      const s = statsRef.current;
      const prioritized = meta.numbers
        .map((n) => {
          const seen = s.perQuestionSeen[n] || 0;
          const correct = s.perQuestionCorrect[n] || 0;
          const errors = Math.max(0, seen - correct);
          const rand = Math.random();
          return { n, seen, errors, rand };
        })
        .sort((a, b) => (a.seen - b.seen) || (b.errors - a.errors) || (a.rand - b.rand))
        .slice(0, 20)
        .map((x) => x.n);

      // 3) fetch those specific questions
      const batchRes = await fetch("/api/questions/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numbers: prioritized }),
      });
      if (!batchRes.ok) throw new Error("Failed to fetch prioritized questions");
      const batchJson = await batchRes.json() as { questions: QuizQuestion[] };
      setData({ questions: batchJson.questions, total: meta.total });
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchErrorsOnly = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setSubmitted(false);
    setAnswers({});
    try {
      const metaRes = await fetch("/api/meta", { cache: "no-store" });
      if (!metaRes.ok) throw new Error("Failed to fetch meta");
      const meta = await metaRes.json() as { total: number; numbers: number[] };

      const s = statsRef.current;
      const augmented = meta.numbers.map((n) => {
        const seen = s.perQuestionSeen[n] || 0;
        const correct = s.perQuestionCorrect[n] || 0;
        const errors = Math.max(0, seen - correct);
        const rand = Math.random();
        return { n, seen, correct, errors, rand };
      });

      const errorsFirst = augmented
        .filter((x) => x.errors > 0)
        .sort((a, b) => (b.errors - a.errors) || (a.seen - b.seen) || (a.rand - b.rand))
        .map((x) => x.n);

      const prioritizedRest = augmented
        .sort((a, b) => (a.seen - b.seen) || (b.errors - a.errors) || (a.rand - b.rand))
        .map((x) => x.n);

      const selected: number[] = [];
      for (const n of errorsFirst) { if (!selected.includes(n)) selected.push(n); }
      for (const n of prioritizedRest) { if (selected.length >= 20) break; if (!selected.includes(n)) selected.push(n); }
      const finalNumbers = selected.slice(0, 20);

      const batchRes = await fetch("/api/questions/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numbers: finalNumbers }),
      });
      if (!batchRes.ok) throw new Error("Failed to fetch error-focused questions");
      const batchJson = await batchRes.json() as { questions: QuizQuestion[] };
      setData({ questions: batchJson.questions, total: meta.total });
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchQuestions();
  }, []);

  const onPick = (qIndex: number, answerIndex: number) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [qIndex]: answerIndex }));
  };

  const onSubmit = () => {
    if (!data) return;
    setSubmitted(true);
    const correctness = data.questions.map((q, idx) => (answers[idx] ?? -1) === q.correctIndex);
    updateStats((s) => recordSubmission(s, data.questions.map((q) => q.number), correctness));
  };

  const onRestart = () => {
    fetchQuestions();
  };

  const summary = getSummary(stats, data?.total || 256);
  const allAnswered = data ? data.questions.every((_, idx) => (answers[idx] ?? -1) !== -1) : false;

  return (
    <div className="content">
      <div className="header">
        <h1>Naturalization Quiz</h1>
        <div className="stats">
          <div className="pill">
            Seen: {summary.uniqueSeen}/{summary.totalQuestions}
            <sup
              title="Alt/Option-click to reset seen"
              style={{ cursor: "pointer", marginLeft: 6, opacity: 0.7 }}
              onClick={(e) => { if (e.altKey) updateStats((s) => resetSeen(s)); }}
            >0</sup>
          </div>
          <div className="pill">Accuracy: {summary.accuracy}%</div>
          <div className="pill">Attempts: {summary.totalAttempts}</div>
          <div className="pill">Correct: {summary.totalCorrect}</div>
          <button
            className="secondary"
            onClick={cycleTheme}
            aria-label={`Theme: ${theme}. Click to change`}
            title={`Theme: ${theme}. Click to change`}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {theme === "light" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            ) : theme === "dark" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="22" x2="16" y2="22"></line>
                <line x1="12" y1="18" x2="12" y2="22"></line>
              </svg>
            )}
          </button>
          <button className="secondary" onClick={() => setShowNumbers((s) => !s)}>
            {showNumbers ? "Hide #" : "Show #"}
          </button>
          <a className="pill" href="/stats">Stats</a>
        </div>
      </div>

      <div className="card">
        {loading && <p className="muted">Loading…</p>}
        {error && <p className="muted">{error}</p>}
        {!loading && !error && data && (
          <div>
            {data.questions.map((q, idx) => {
              const selected = answers[idx];
              const isCorrect = submitted ? selected === q.correctIndex : undefined;
              return (
                <div key={q.number} className="question">
                  <div className="question-title">{idx + 1}. {q.text} {showNumbers && <span className="muted">(#{q.number})</span>}</div>
                  <div className="answers">
                    {q.answers.map((a, aIdx) => {
                      const isSelected = selected === aIdx;
                      const isAnswerCorrect = submitted && aIdx === q.correctIndex;
                      const isAnswerIncorrect = submitted && isSelected && aIdx !== q.correctIndex;
                      return (
                        <label key={a.id} className={"answer" + (isAnswerCorrect ? " correct" : "") + (isAnswerIncorrect ? " incorrect" : "")}>
                          <input
                            type="radio"
                            name={`q-${idx}`}
                            checked={isSelected || false}
                            onChange={() => onPick(idx, aIdx)}
                            disabled={submitted}
                          />
                          <span>{a.text}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="footer">
        <div className="row">
          <button onClick={onSubmit} disabled={!data || submitted || !allAnswered}>Submit</button>
          <button className="secondary" onClick={onRestart} disabled={loading}>New Test</button>
          <button
            className="secondary"
            onClick={fetchErrorsOnly}
            disabled={loading}
            title="Start a new test consisting only of the previously failed questions"
          >
            Missed Questions
          </button>
          {submitted && data && (
            <div className="pill" style={{ marginLeft: "auto" }}>
              Score: {
                Math.round(
                  (data.questions.reduce((acc, q, idx) => acc + ((answers[idx] ?? -1) === q.correctIndex ? 1 : 0), 0) / data.questions.length) * 100
                )
              }%
            </div>
          )}
        </div>
        {!submitted && data && !allAnswered && (
          <div className="muted" style={{ marginTop: 8 }}>
            Select an answer for every question to submit.
          </div>
        )}
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <a
            className="pill"
            href="https://github.com/alxkzmn/guihua"
            target="_blank"
            rel="noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.72-2.78.62-3.37-1.38-3.37-1.38-.45-1.17-1.11-1.48-1.11-1.48-.9-.64.07-.63.07-.63 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.64-1.36-2.22-.26-4.56-1.14-4.56-5.08 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.29.1-2.69 0 0 .84-.28 2.75 1.05A9.2 9.2 0 0 1 12 6.84c.85 0 1.7.12 2.5.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.43.1 2.69.64.72 1.03 1.63 1.03 2.75 0 3.95-2.34 4.82-4.57 5.07.36.32.68.95.68 1.92 0 1.39-.01 2.51-.01 2.86 0 .27.18.6.69.49 3.96-1.35 6.83-5.18 6.83-9.7C22 6.58 17.52 2 12 2z" />
            </svg>
            GitHub
          </a>
        </div>
      </div>
    </div>
  );
}


