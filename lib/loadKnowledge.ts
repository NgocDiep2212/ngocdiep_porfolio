import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { Document } from "@langchain/core/documents";
import { MarkdownTextSplitter } from "@langchain/textsplitters";

export type KnowledgeMeta = {
  id?: string;
  section?: string;
  title?: string;
  tags?: string[] | string;
  updated?: string;
};

async function walkMarkdown(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkMarkdown(full)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(full);
    }
  }
  return files;
}

function normalizeTags(tags: KnowledgeMeta["tags"]): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map(String);
  return String(tags)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/** FAQ: keep each Q&A as its own document when possible. */
function splitFaqBody(body: string, baseMeta: Record<string, unknown>): Document[] {
  const blocks = body
    .split(/\n(?=##\s+Q:)/)
    .map((b) => b.trim())
    .filter(Boolean);

  if (blocks.length <= 1) {
    return [
      new Document({
        pageContent: body.trim(),
        metadata: { ...baseMeta, title: baseMeta.title ?? "FAQ" },
      }),
    ];
  }

  return blocks.map((block, i) => {
    const titleMatch = block.match(/^##\s+(Q:[^\n]+)/);
    const qTitle = titleMatch?.[1]?.trim() ?? `FAQ item ${i + 1}`;
    return new Document({
      pageContent: block,
      metadata: {
        ...baseMeta,
        title: qTitle,
        chunk_part: i,
      },
    });
  });
}

export async function loadKnowledgeDocuments(knowledgeDir: string): Promise<Document[]> {
  const files = await walkMarkdown(knowledgeDir);
  const docs: Document[] = [];
  const splitter = new MarkdownTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 80,
  });

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, "utf8");
    const { data, content } = matter(raw);
    const meta = data as KnowledgeMeta;
    const rel = path.relative(knowledgeDir, filePath).replace(/\\/g, "/");
    const docId = meta.id ?? rel.replace(/\.md$/, "").replace(/\//g, "-");
    const section = meta.section ?? "general";
    const title = meta.title ?? docId;
    const tags = normalizeTags(meta.tags);

    const baseMeta = {
      doc_id: docId,
      section,
      title,
      tags,
      source_path: `knowledge/${rel}`,
      updated_at: meta.updated ?? "",
    };

    const body = content.trim();
    if (!body) continue;

    let parts: Document[];
    if (section === "faq" || rel === "faq.md") {
      parts = splitFaqBody(body, baseMeta);
    } else {
      parts = await splitter.splitDocuments([
        new Document({ pageContent: body, metadata: baseMeta }),
      ]);
    }

    parts.forEach((doc, i) => {
      const partTitle = String(doc.metadata.title ?? title);
      // Prefixed title/section improves retrieval for list-style questions
      const enriched = `[section:${section}] ${partTitle}\n\n${doc.pageContent}`;
      docs.push(
        new Document({
          pageContent: enriched,
          metadata: {
            ...doc.metadata,
            chunk_id: `${docId}-${i}`,
          },
        })
      );
    });
  }

  return docs;
}
