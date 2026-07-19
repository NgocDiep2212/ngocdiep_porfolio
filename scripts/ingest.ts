import { loadEnv } from "./load-env.js";

// Load .env before any module reads process.env for model names / keys
loadEnv();

const path = await import("node:path");
const { fileURLToPath } = await import("node:url");
const { QdrantVectorStore } = await import("@langchain/qdrant");
const { getConfig } = await import("../lib/config.js");
const { createEmbeddings } = await import("../lib/embeddings.js");
const { createQdrantClient, ensurePayloadIndexes } = await import("../lib/vectorstore.js");
const { loadKnowledgeDocuments } = await import("../lib/loadKnowledge.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const knowledgeDir = path.resolve(__dirname, "../knowledge");

async function main() {
  const { qdrantUrl, qdrantApiKey, collection, embeddingModel } = getConfig();
  console.log(`Ingest starting (embedding=${embeddingModel}, collection=${collection})`);

  const client = createQdrantClient();
  const embeddings = createEmbeddings();

  console.log(`Loading knowledge from ${knowledgeDir}...`);
  const docs = await loadKnowledgeDocuments(knowledgeDir);
  console.log(`Loaded ${docs.length} chunks.`);

  const collections = await client.getCollections();
  const exists = collections.collections.some((c) => c.name === collection);
  if (exists) {
    console.log(`Deleting existing collection "${collection}" for clean re-ingest...`);
    await client.deleteCollection(collection);
  }

  const probe = await embeddings.embedQuery("dimension probe");
  const vectorSize = probe.length;
  console.log(`Creating collection "${collection}" (vector size ${vectorSize})...`);

  await client.createCollection(collection, {
    vectors: {
      size: vectorSize,
      distance: "Cosine",
    },
  });

  await ensurePayloadIndexes(client, collection);

  console.log("Embedding and upserting documents...");
  await QdrantVectorStore.fromDocuments(docs, embeddings, {
    url: qdrantUrl,
    apiKey: qdrantApiKey,
    collectionName: collection,
  });

  const info = await client.getCollection(collection);
  console.log(`Done. Points in collection: ${info.points_count ?? "unknown"}`);
  console.log("Run `npm run eval:golden` after setting .env to smoke-test retrieval.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
