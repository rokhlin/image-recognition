-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Photos table (stores actual image files)
CREATE TABLE "Photo" (
    "id" SERIAL PRIMARY KEY,
    "filePath" TEXT NOT NULL,
    "fileName" VARCHAR(255),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP
);

-- Face embeddings with vector support
CREATE TABLE "FaceEmbedding" (
    "id" SERIAL PRIMARY KEY,
    "photoId" INTEGER REFERENCES "Photo"("id") ON DELETE CASCADE,
    "embedding" vector(512), -- InsightFace dimension
    "bbox" JSONB,            -- Bounding box coordinates
    "confidence" FLOAT,      -- Detection confidence score
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scene embeddings (CLIP vectors)
CREATE TABLE "SceneEmbedding" (
    "id" SERIAL PRIMARY KEY,
    "photoId" INTEGER REFERENCES "Photo"("id") ON DELETE CASCADE,
    "embedding" vector(384), -- CLIP-ViT-B-32 dimension
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create HNSW index for fast similarity search
CREATE INDEX ON "FaceEmbedding" USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON "SceneEmbedding" USING hnsw (embedding vector_ip_ops);
