# Knowledge Surface

LNSAT turns allowlisted source material into bounded knowledge records, search
results, context bundles, and citations for agents and human operators.
"Internal" describes owner-scoped product knowledge, not private repository
operations.

## Source Flow

```text
allowlisted source -> snapshot -> chunk -> knowledge record
                   -> search -> cited context bundle
```

Contracts live in `packages/packets/src`. Gateway and MCP surfaces expose
read-only inspection. Console route `/knowledge` renders synthetic fixtures.

## Knowledge Record

A record identifies source and snapshot, bounded content or summary, citation
references, freshness, conflict and sensitivity flags, and project scope.
Source lineage must survive indexing and context compilation.

## Context Safety

- allowlist sources and project boundaries;
- reject secret-like, uncited, stale, or conflicting material as configured;
- apply context policy before agent delivery;
- cap records, bytes, tokens, and source diversity;
- keep retrieved text as data, not trusted instructions;
- expose warnings and citations with every derived answer.

## Evaluation

Deterministic fixtures cover source indexing, search, context compilation,
staleness, conflict, citation accuracy, and fail-closed behavior. A successful
evaluation proves contract behavior, not production data readiness.

## Persistence Boundary

Current knowledge flow can operate over supplied in-memory/file-derived data.
Durable database storage, vector indexing, embedding generation, background
workers, remote crawlers, and production data ingestion require separate
design and authorization.
