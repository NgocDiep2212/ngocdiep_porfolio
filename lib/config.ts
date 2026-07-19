export function getConfig() {
  const googleApiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
  const qdrantUrl = process.env.QDRANT_URL;
  const qdrantApiKey = process.env.QDRANT_API_KEY;
  const collection = process.env.QDRANT_COLLECTION ?? "portfolio_kb";
  const topK = Number(process.env.RAG_TOP_K ?? "6");
  // Qdrant Cosine: higher score = more similar. Reject when best score < threshold.
  const scoreThreshold = Number(process.env.RAG_SCORE_THRESHOLD ?? "0.55");
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "https://ngocdiep.dev")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  // text-embedding-004 is retired on Gemini API; use gemini-embedding-001
  const embeddingModel = process.env.EMBEDDING_MODEL ?? "gemini-embedding-001";
  // Prefer flash-lite / 2.5 flash — gemini-2.0-flash often has free-tier quota 0
  const chatModel = process.env.CHAT_MODEL ?? "gemini-2.5-flash";

  if (!googleApiKey) throw new Error("Missing GOOGLE_API_KEY");
  if (!qdrantUrl) throw new Error("Missing QDRANT_URL");
  if (!qdrantApiKey) throw new Error("Missing QDRANT_API_KEY");

  return {
    googleApiKey,
    qdrantUrl,
    qdrantApiKey,
    collection,
    topK,
    scoreThreshold,
    allowedOrigins,
    embeddingModel,
    chatModel,
  };
}

/** @deprecated use getConfig().embeddingModel — kept for older imports */
export const EMBEDDING_MODEL = "gemini-embedding-001";
/** @deprecated use getConfig().chatModel */
export const CHAT_MODEL = "gemini-2.0-flash";
