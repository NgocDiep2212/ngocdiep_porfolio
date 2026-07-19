/**
 * Local dev server — no Vercel login required.
 * Serves static files + POST /api/chat
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./load-env.js";

loadEnv();

const { answerQuestion } = await import("../lib/rag.js");
const { getConfig } = await import("../lib/config.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT ?? "3000");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".md": "text/plain; charset=utf-8",
};

function sendJson(
  res: http.ServerResponse,
  status: number,
  body: unknown,
  origin?: string
) {
  const { allowedOrigins } = (() => {
    try {
      return getConfig();
    } catch {
      return { allowedOrigins: ["http://localhost:3000"] };
    }
  })();

  const ok =
    origin &&
    (allowedOrigins.includes(origin) ||
      allowedOrigins.includes("*") ||
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));

  if (ok && origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function safeStaticPath(urlPath: string): string | null {
  let decoded = decodeURIComponent(urlPath.split("?")[0] || "/");
  if (decoded === "/") decoded = "/index.html";
  const full = path.normalize(path.join(root, decoded));
  if (!full.startsWith(root)) return null;
  return full;
}

const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT = 60;
type RateEntry = { count: number; resetAt: number };
const rateMap = new Map<string, RateEntry>();

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

const server = http.createServer(async (req, res) => {
  const origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
  const url = req.url ?? "/";

  if (req.method === "OPTIONS" && url.startsWith("/api/")) {
    res.setHeader("Access-Control-Allow-Origin", origin ?? "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "POST" && (url === "/api/chat" || url.startsWith("/api/chat?"))) {
    const ip =
      (typeof req.headers["x-forwarded-for"] === "string"
        ? req.headers["x-forwarded-for"].split(",")[0].trim()
        : null) ||
      req.socket.remoteAddress ||
      "unknown";
    if (!checkRateLimit(ip)) {
      sendJson(
        res,
        429,
        { error: "Rate limit exceeded. Please try again later." },
        origin
      );
      return;
    }

    try {
      const raw = await readBody(req);
      let question = "";
      try {
        const parsed = JSON.parse(raw || "{}") as { question?: string; message?: string };
        question = String(parsed.question ?? parsed.message ?? "").trim();
      } catch {
        sendJson(res, 400, { error: "Invalid JSON body" }, origin);
        return;
      }
      if (!question || question.length > 500) {
        sendJson(
          res,
          400,
          { error: 'Send JSON { "question": "..." } (1–500 chars).' },
          origin
        );
        return;
      }

      const result = await answerQuestion(question);
      sendJson(
        res,
        200,
        {
          answer: result.answer,
          citations: result.citations,
          confidence: result.confidence,
          suggested_followups: result.suggested_followups,
        },
        origin
      );
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Unknown error";
      if (/Missing (GOOGLE_API_KEY|QDRANT_)/.test(message)) {
        sendJson(res, 503, { error: "Missing API credentials in .env" }, origin);
        return;
      }
      sendJson(res, 500, { error: "Failed to generate answer." }, origin);
    }
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    res.end("Method not allowed");
    return;
  }

  const filePath = safeStaticPath(url);
  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`\nLocal portfolio + chat API`);
  console.log(`  → http://localhost:${PORT}`);
  console.log(`  → API: POST http://localhost:${PORT}/api/chat`);
  console.log(`(No Vercel login needed)\n`);
});
