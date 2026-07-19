import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { getConfig } from "./config.js";

export function createEmbeddings() {
  const { googleApiKey, embeddingModel } = getConfig();
  console.log(`Using embedding model: ${embeddingModel}`);
  return new GoogleGenerativeAIEmbeddings({
    apiKey: googleApiKey,
    modelName: embeddingModel,
    model: embeddingModel,
  });
}
