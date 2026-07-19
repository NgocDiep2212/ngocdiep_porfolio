# Similarity threshold calibration

Default: `RAG_SCORE_THRESHOLD=0.55` (Qdrant Cosine — higher is more similar).

## How to calibrate

1. Set env vars and run `npm run ingest`.
2. Run `npm run eval:golden`.
3. Inspect printed `score=` values:
   - On-topic EN/VI questions should usually land **above** 0.55 with `confidence=high`.
   - The unknown/off-topic VI item should stay **below** threshold (`confidence=low`).
4. If many true questions fail the score gate, lower toward `0.48–0.52`.
5. If off-topic answers slip through, raise toward `0.60–0.65`.

Re-check after any major `knowledge/` rewrite.
