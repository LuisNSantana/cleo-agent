# Hybrid L1+L2 Cache (RAG)

This project uses a hybrid cache to speed up retrieval-augmented generation (RAG):

- L1 (in-memory): Fast, per-instance Map with TTL. Resets on server restarts or new instances.
- L2 (Redis): Shared, durable cache across instances. Backed by Upstash REST (or standard Redis URL).

When enabled, retrieval will:
1) Check L1. If hit, return immediately.
2) Check L2 (Redis). If hit, warm L1 and return.
3) Run retrieval + optional reranking; then write results to L1 and L2.

Redis is best-effort and never blocks the request path. Timeouts/errors are swallowed.

## Enable

1) Set these env vars (prefer Upstash):

```
ENABLE_REDIS_CACHE=true
UPSTASH_REDIS_REST_URL=... # from Upstash
UPSTASH_REDIS_REST_TOKEN=... # from Upstash
```

Or alternatively:

```
ENABLE_REDIS_CACHE=true
REDIS_URL=rediss://user:pass@host:port
```

2) Re-run the server to pick up env changes.

## Verify

- Make a query that triggers RAG.
- First run: expect a RAG "HYBRID" log without cache hit.
- Second run (same user+query+scope): expect "[RAG] L2 (Redis) cache hit" then the regular pipeline.

## Notes

- TTL defaults to 2 minutes for retrieval results (same as L1). You can override per-call via `cacheTtlMs` in `retrieveRelevant` options.
- Keys are SHA-256 hashed and namespaced under `rag:v1:`.
- Dependencies already included: `@upstash/redis` and `redis`.
- Feature is toggled by `ENABLE_REDIS_CACHE`.
