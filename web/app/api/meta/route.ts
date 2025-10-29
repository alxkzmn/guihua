import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { RawQuestion } from "@/types";

export async function GET() {
  try {
    const questionsPath = path.join(process.cwd(), "..", "questions.json");
    const raw = await fs.readFile(questionsPath, "utf-8");
    const all: RawQuestion[] = JSON.parse(raw);
    const numbers = all.map((q) => q.number);
    return NextResponse.json({ total: all.length, numbers }, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load meta" }, { status: 500 });
  }
}


