/**
 * Smoke-test retrieval + grounded answers against eval/golden-questions.json.
 * Usage: npm run eval:golden
 * Requires .env with GOOGLE_API_KEY, QDRANT_URL, QDRANT_API_KEY (run ingest first).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { answerQuestion } from "../lib/rag.js";
import { getConfig } from "../lib/config.js";
import { loadEnv } from "./load-env.js";

type Golden = {
  id: string;
  lang: string;
  question: string;
  expect_sections?: string[];
  must_include_any?: string[];
  expect_low_confidence?: boolean;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function includesAny(text: string, needles: string[]): boolean {
  const lower = text.toLowerCase();
  return needles.some((n) => lower.includes(n.toLowerCase()));
}

async function main() {
  loadEnv();
  const { scoreThreshold } = getConfig();
  const goldenPath = path.resolve(__dirname, "../eval/golden-questions.json");
  const items = JSON.parse(await fs.readFile(goldenPath, "utf8")) as Golden[];

  let passed = 0;
  const rows: string[] = [];

  console.log(`Evaluating ${items.length} golden questions (threshold=${scoreThreshold})...\n`);

  for (const item of items) {
    const result = await answerQuestion(item.question);
    const citationSections = result.citations.map((c) => c.section);
    const haystack = `${result.answer}\n${citationSections.join(" ")}`;

    let ok = true;
    const reasons: string[] = [];

    if (item.expect_low_confidence) {
      if (result.confidence !== "low") {
        ok = false;
        reasons.push(`expected low confidence, got ${result.confidence}`);
      }
    } else if (result.confidence === "low") {
      ok = false;
      reasons.push("unexpected low confidence / score gate");
    }

    if (item.must_include_any?.length && !includesAny(haystack, item.must_include_any)) {
      ok = false;
      reasons.push(`missing any of: ${item.must_include_any.join(" | ")}`);
    }

    if (ok) passed += 1;
    const status = ok ? "PASS" : "FAIL";
    const line = `[${status}] ${item.id} score=${result.bestScore?.toFixed(3) ?? "n/a"} conf=${result.confidence}`;
    console.log(line);
    if (!ok) console.log(`       ${reasons.join("; ")}`);
    console.log(`       Q: ${item.question}`);
    console.log(`       A: ${result.answer.slice(0, 160).replace(/\n/g, " ")}...\n`);
    rows.push(line);
  }

  console.log(`\nResult: ${passed}/${items.length} passed`);
  console.log(
    "If VI questions fail retrieve often, lower RAG_SCORE_THRESHOLD slightly or add targeted FAQ phrases."
  );
  if (passed < items.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
