import { NextRequest, NextResponse } from "next/server";
import { compile } from "@/lib/compiler";

const RATE_LIMIT = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS = 30;
const WINDOW_MS = 60_000;
const MAX_CODE_SIZE = 10_240; // 10KB

export const runtime = "edge";

export async function POST(req: NextRequest) {
  // Rate limiting by IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const entry = RATE_LIMIT.get(ip);
  if (entry && now < entry.resetAt) {
    if (entry.count >= MAX_REQUESTS) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again in a minute." },
        { status: 429 }
      );
    }
    entry.count++;
  } else {
    RATE_LIMIT.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  }

  // Clean old entries periodically
  if (RATE_LIMIT.size > 10000) {
    RATE_LIMIT.forEach((val, key) => {
      if (now > val.resetAt) RATE_LIMIT.delete(key);
    });
  }

  let body: { code: string };
  try {
    body = await req.json();
  } catch (_e) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.code || typeof body.code !== "string") {
    return NextResponse.json({ error: "Missing 'code' field" }, { status: 400 });
  }

  if (body.code.length > MAX_CODE_SIZE) {
    return NextResponse.json(
      { error: `Code exceeds ${MAX_CODE_SIZE / 1024}KB limit` },
      { status: 400 }
    );
  }

  // Compile with 5-second timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const result = compile(body.code);
    clearTimeout(timeout);

    return NextResponse.json({
      python: result.python,
      output: result.output,
      errors: result.errors,
      timeMs: Math.round(result.timeMs * 100) / 100,
    });
  } catch (e) {
    clearTimeout(timeout);
    return NextResponse.json(
      { python: "", output: "", errors: [{ msg: String(e), line: 0, col: 0, phase: "lex" }], timeMs: 0 },
      { status: 200 }
    );
  }
}
