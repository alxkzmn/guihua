"use client";

import React from "react";
import { emptyStats, loadStats } from "@/lib/stats";

type Meta = { total: number; numbers: number[] };

export default function StatsPage() {
  const [meta, setMeta] = React.useState<Meta | null>(null);
  const [stats, setStats] = React.useState(loadStats());

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/meta", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load meta");
        const m: Meta = await res.json();
        setMeta(m);
        setStats(loadStats());
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  if (!meta) return <p className="muted">Loading…</p>;

  const seenCounts = stats.perQuestionSeen;
  const correctCounts = stats.perQuestionCorrect;
  const maxSeen = Object.values(seenCounts).reduce((m, v) => Math.max(m, v || 0), 0);

  return (
    <div>
      <h2>Stats</h2>
      <p className="muted">Click any row to filter unseen/seen.</p>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 4fr 1fr 1fr 1fr", gap: 8, fontWeight: 700, marginBottom: 8 }}>
          <div>#</div>
          <div>Bar (✔︎/✖︎)</div>
          <div>Seen</div>
          <div style={{ color: "var(--success)" }}>Correct</div>
          <div style={{ color: "var(--danger)" }}>Errors</div>
        </div>
        {meta.numbers.map((n) => {
          const seen = seenCounts[n] || 0;
          const correct = correctCounts[n] || 0;
          const errors = Math.max(0, seen - correct);
          const basePct = maxSeen === 0 ? 0 : Math.max(2, Math.round((seen / maxSeen) * 100));
          const greenPct = seen === 0 ? 0 : Math.round((correct / seen) * basePct);
          const redPct = Math.max(0, basePct - greenPct);
          return (
            <div key={n} style={{ display: "grid", gridTemplateColumns: "1fr 4fr 1fr 1fr 1fr", gap: 8, alignItems: "center", padding: "6px 0", borderTop: "1px solid var(--border)" }}>
              <div>#{n}</div>
              <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 6, overflow: "hidden", height: 12, position: "relative" }}>
                {seen > 0 ? (
                  <div style={{ display: "flex", width: `${basePct}%`, height: "100%" }}>
                    <div style={{ width: `${greenPct}%`, background: "var(--success)" }} />
                    <div style={{ width: `${redPct}%`, background: "var(--danger)" }} />
                  </div>
                ) : (
                  <div style={{ width: 0, height: "100%" }} />
                )}
              </div>
              <div style={{ textAlign: "right" }}>{seen}</div>
              <div style={{ textAlign: "right", color: "var(--success)" }}>{correct}</div>
              <div style={{ textAlign: "right", color: "var(--danger)" }}>{errors}</div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16 }}>
        <a className="pill" href="/">← Back</a>
      </div>
    </div>
  );
}


