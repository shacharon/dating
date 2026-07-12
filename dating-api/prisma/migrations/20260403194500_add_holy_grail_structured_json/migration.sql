-- Sparse Holy Grail structured layers for retrieval → canonical mapper (JSON blobs).
ALTER TABLE "UserProfile" ADD COLUMN "holyGrailStructuredFacts" JSONB;
ALTER TABLE "UserProfile" ADD COLUMN "holyGrailStructuredPreferences" JSONB;
