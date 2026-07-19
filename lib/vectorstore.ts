import { QdrantVectorStore } from "@langchain/qdrant";
import { QdrantClient } from "@qdrant/js-client-rest";
import { getConfig } from "./config.js";
import { createEmbeddings } from "./embeddings.js";

export function createQdrantClient() {
  const { qdrantUrl, qdrantApiKey } = getConfig();
  return new QdrantClient({ url: qdrantUrl, apiKey: qdrantApiKey });
}

export async function getVectorStore() {
  const { qdrantUrl, qdrantApiKey, collection } = getConfig();
  const embeddings = createEmbeddings();
  return QdrantVectorStore.fromExistingCollection(embeddings, {
    url: qdrantUrl,
    apiKey: qdrantApiKey,
    collectionName: collection,
  });
}

export async function ensurePayloadIndexes(client: QdrantClient, collection: string) {
  for (const field of ["section", "doc_id", "chunk_id"] as const) {
    try {
      await client.createPayloadIndex(collection, {
        field_name: field,
        field_schema: "keyword",
        wait: true,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!/already exists|Conflict/i.test(message)) {
        console.warn(`Payload index ${field}: ${message}`);
      }
    }
  }
}
