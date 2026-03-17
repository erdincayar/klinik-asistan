-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create vector index on clinic_knowledge_base for similarity search
-- This runs AFTER Prisma creates the table via prisma migrate
-- The embedding column is created by Prisma as vector(1536)
-- We add an IVFFlat index for fast approximate nearest neighbor search

-- Note: Run this after `npx prisma migrate dev` creates the tables:
-- CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding
--   ON "ClinicKnowledgeBase" USING ivfflat (embedding vector_cosine_ops)
--   WITH (lists = 100);
