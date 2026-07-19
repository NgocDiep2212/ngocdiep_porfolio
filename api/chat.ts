import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getConfig } from "../lib/config.js";
import { answerQuestion } from "../lib/rag.js";

const MAX_LEN = 500;
const MIN_LEN = 1;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT = 60;

type RateEntry = { count: number; resetAt: number };
const rateMap = new Map<string, RateEntry>();

function cors(res: VercelResponse, origin: string | undefined, allowed: string[]) {
  const ok =
    origin &&
    (allowed.includes(origin) ||
      allowed.includes("*") ||
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
  if (ok && origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function clientIp(req: VercelRequest): string {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length) return xf.split(",")[0].trim();
  return req.socket?.remoteAddress ?? "unknown";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count += 1;
  return true;
}

function validateQuestion(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const q = raw.trim();
  if (q.length < MIN_LEN || q.length > MAX_LEN) return null;
  // Basic injection / spam guards
  if (/(ignore\s+(all\s+)?previous|system\s*prompt|jailbreak)/i.test(q)) {
    return "__blocked__";
  }
  return q;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let allowedOrigins: string[] = ["https://ngocdiep.dev"];
  try {
    allowedOrigins = getConfig().allowedOrigins;
  } catch {
    // still answer OPTIONS / misconfig later
  }

  const origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
  cors(res, origin, allowedOrigins);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!checkRateLimit(clientIp(req))) {
    return res.status(429).json({
      error: "Rate limit exceeded. Please try again later.",
    });
  }

  const question = validateQuestion(req.body?.question ?? req.body?.message);
  if (question === null) {
    return res.status(400).json({
      error: `Invalid question. Send JSON { "question": "..." } (${MIN_LEN}–${MAX_LEN} chars).`,
    });
  }
  if (question === "__blocked__") {
    return res.status(200).json({
      answer:
        "I can only answer questions about Diep's career, projects, and skills. Please ask about those topics.",
      citations: [],
      confidence: "low",
      suggested_followups: [
        "What projects has Diep built with n8n and RAG?",
        "What was the impact of the AI Job Matcher?",
      ],
    });
  }

  try {
    const result = await answerQuestion(question);
    return res.status(200).json({
      answer: result.answer,
      citations: result.citations,
      confidence: result.confidence,
      suggested_followups: result.suggested_followups,
    });
  } catch (err) {
    console.error("chat error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    if (/Missing (GOOGLE_API_KEY|QDRANT_)/.test(message)) {
      return res.status(503).json({
        error: "Chat service is not configured yet. Missing API credentials.",
      });
    }
    return res.status(500).json({ error: "Failed to generate answer. Please try again." });
  }
}
