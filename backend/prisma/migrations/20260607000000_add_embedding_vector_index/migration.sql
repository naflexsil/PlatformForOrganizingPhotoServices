-- vector_cosine_ops соответствует оператору "<=>", используемому в запросах поиска похожих фото
CREATE INDEX IF NOT EXISTS "photos_embedding_vector_idx"
  ON "photos"
  USING ivfflat ("embeddingVector" vector_cosine_ops)
  WITH (lists = 100);
