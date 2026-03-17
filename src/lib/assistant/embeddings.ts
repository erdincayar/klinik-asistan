import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Split text into overlapping chunks
 */
export function chunkText(
  text: string,
  chunkSize = 500,
  overlap = 50
): string[] {
  const words = text.split(/\s+/);
  if (words.length <= chunkSize) return [text];

  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    chunks.push(words.slice(start, end).join(" "));
    if (end >= words.length) break;
    start = end - overlap;
  }
  return chunks;
}

/**
 * Generate embeddings for text chunks using OpenAI text-embedding-3-small
 */
export async function embedChunks(chunks: string[]): Promise<number[][]> {
  const openai = getOpenAI();
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: chunks,
  });
  return response.data.map((d) => d.embedding);
}

/**
 * Save text to knowledge base with embeddings
 */
export async function saveKnowledgeBase(
  clinicId: string,
  sourceType: string,
  filename: string | null,
  text: string
): Promise<number> {
  const chunks = chunkText(text);
  const embeddings = await embedChunks(chunks);

  let savedCount = 0;
  for (let i = 0; i < chunks.length; i++) {
    const embeddingStr = `[${embeddings[i].join(",")}]`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "ClinicKnowledgeBase" (id, "clinicId", "sourceType", "sourceFilename", content, embedding, metadata, "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::vector, $6::jsonb, NOW())`,
      clinicId,
      sourceType,
      filename,
      chunks[i],
      embeddingStr,
      JSON.stringify({ chunkIndex: i, totalChunks: chunks.length })
    );
    savedCount++;
  }

  return savedCount;
}

/**
 * Search knowledge base using vector similarity
 */
export async function searchKnowledge(
  clinicId: string,
  query: string,
  limit = 5
): Promise<string[]> {
  const embeddings = await embedChunks([query]);
  const queryEmbedding = embeddings[0];
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  const results = await prisma.$queryRawUnsafe<{ content: string }[]>(
    `SELECT content FROM "ClinicKnowledgeBase"
     WHERE "clinicId" = $1 AND embedding IS NOT NULL
     ORDER BY embedding <=> $2::vector
     LIMIT $3`,
    clinicId,
    embeddingStr,
    limit
  );

  return results.map((r) => r.content);
}
