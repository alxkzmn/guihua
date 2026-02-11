import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { RawQuestion, QuizQuestion } from "@/types";

function shuffleArray<T>(arr: T[]): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function toQuizQuestion(q: RawQuestion): QuizQuestion {
  const answerEntries = Object.entries(q.answers).map(([id, text]) => ({ id, text }));
  const shuffled = shuffleArray(answerEntries);
  const correctOriginalKey = String(q.correct);
  const correctIndex = shuffled.findIndex((a) => a.id === correctOriginalKey);
  return {
    number: q.number,
    text: q.text,
    answers: shuffled,
    correctIndex
  };
}

export async function GET() {
  try {
    const questionsPath = path.join(process.cwd(), "questions.json");
    const raw = await fs.readFile(questionsPath, "utf-8");
    const all: RawQuestion[] = JSON.parse(raw);
    const shuffled = shuffleArray(all);
    const twenty = shuffled.slice(0, 20).map(toQuizQuestion);
    return NextResponse.json({ questions: twenty, total: all.length }, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load questions" }, { status: 500 });
  }
}


