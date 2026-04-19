# Design

## Architecture

This MVP is a single Node.js + TypeScript service with five simple stages:

1. PDF ingestion from `sample-data/`
2. Text extraction with `pdf-parse`
3. One generic LLM prompt per document
4. Deterministic aggregation into a single loan-level record
5. REST API backed by in-memory storage

The service stays small so each part is easy to explain and debug.

```text
sample-data/
  -> pdf-parse
  -> LLM extraction
  -> merge/normalize
  -> in-memory store
  -> REST API (/process, /loan, /loan/:id)
```

### Component Diagram

```text
                +----------------------+
                |     API Client       |
                | (Swagger / curl)     |
                +----------+-----------+
                           |
                           v
                +----------------------+
                |     REST API Layer   |
                |  (/process, /loan)   |
                +----------+-----------+
                           |
                           v
                +----------------------+
                |   Processing Pipeline|
                +----------+-----------+
                           |
        +------------------+------------------+
        |                  |                  |
        v                  v                  v
+---------------+  +----------------+  +----------------+
|  Ingestion    |  |  PDF Parser    |  | LLM Extractor  |
| (read files)  |  | (pdf-parse)    |  | (OpenAI API)   |
+-------+-------+  +--------+-------+  +--------+-------+
        |                   |                  |
        +-------------------+------------------+
                            |
                            v
                +----------------------+
                |   Aggregation Layer  |
                | (merge + normalize)  |
                +----------+-----------+
                           |
                           v
                +----------------------+
                |   In-Memory Store    |
                |    (LoanRecord)      |
                +----------+-----------+
                           |
                           v
                +----------------------+
                |      REST API        |
                |      GET /loan       |
                +----------------------+
```

## Pipeline

`POST /process` triggers the full pipeline:

1. Recursively read PDFs from `sample-data/`
2. Parse text from each PDF
3. Skip PDFs that fail parsing and continue
4. Send one extraction prompt per document to the LLM
5. Enforce strict JSON output with schema validation
6. Retry once if the LLM response is invalid
7. Aggregate document-level extractions into a single loan-level record
8. Store the loan-level record in memory for retrieval

`GET /loan` returns the current loan-level record.

`GET /loan/:id` returns one loan-level record.

The older `/borrowers` and `/borrower/:id` routes remain available for backward compatibility, but they return the same loan-level data.

## Data Model

The system aggregates all extracted values into one loan-level record per processing run. Borrowers are represented as a normalized list within the loan rather than as separate top-level entities. All documents are treated as belonging to the same loan application, which avoids fragmenting John-only, Mary-only, and joint-document results into separate records. This keeps the MVP aligned with the domain assumption that the document package represents one loan. Per-borrower top-level modeling was intentionally scoped out to keep the merge behavior simple and consistent.

## Borrower vs Loan Modeling

The original requirement asks for a structured record per borrower. In this implementation, all extracted data is first aggregated at the loan level, with borrowers represented as a normalized list.

This decision came from the documents themselves. Tax returns, shared addresses, and joint references make borrower-level attribution hard without adding more heuristics and guesses.

Instead of forcing questionable associations, the system keeps full source traceability and returns a loan-level record. A per-borrower view could be added later on top of the aggregated data.

## AI Strategy

- One generic prompt is used for every document type, including unknown layouts.
- The prompt instructs the model to return JSON only, never hallucinate, and use `null` or `[]` for missing fields.
- Temperature is fixed at `0`.
- Every extracted field carries `documentName` and a source `snippet`.
- Output is validated with a strict Zod schema before use.
- The service retries one time if parsing or validation fails.

The selected model is meant for fast structured extraction, not open-ended reasoning. That fits this MVP well. Temperature `0` keeps output more stable, and strict schema validation plus one retry helps catch malformed JSON before it reaches the merge step.

## Document Variability

The system does not rely on document templates. Instead, it uses raw PDF text plus a generic extraction prompt that asks for a loan-level record with borrowers regardless of whether the file is a W2, paystub, bank statement, tax return, title document, or another financial document.

This is more robust for an MVP because new document formats do not require code changes, only the same prompt and schema.

Some PDFs, such as title reports or scanned image-based documents, may not expose machine-readable text through standard PDF parsing. In the MVP these files are skipped and logged as non-extractable. A production version would need OCR, such as Tesseract or AWS Textract, to recover text from those files.

## Data Quality

- Empty borrower names are rejected at schema level.
- Income values must be numeric or `null`.
- Merge logic deduplicates repeated values while preserving all source traces.
- If documents disagree, the system preserves multiple traced values rather than guessing.

## Decision Log

The system records a lightweight `decisionLog` on the final loan-level record. It captures choices such as single-loan aggregation and joint borrower detection. This makes the output easier to interpret and debug.

## Error Handling

- PDF parsing failures are logged and skipped.
- LLM extraction failures are retried once.
- If extraction still fails, the error is logged and processing continues for remaining documents.
- One bad document does not fail the whole batch.

## Scaling

For higher throughput, the monolith can evolve without changing the extraction contract:

- Store raw documents in S3 instead of local disk.
- Split ingestion from processing so upload and extraction are separate steps.
- Use SQS or another queue so each document or loan package becomes an async work item.
- Run extraction workers on Lambda for bursty workloads or ECS for longer-running jobs.
- Store the loan-level record and document metadata in PostgreSQL instead of memory.

At 10x volume:

- Queue-based background processing prevents API timeouts.
- S3 removes local disk bottlenecks.
- PostgreSQL provides durable retrieval.

At 100x volume:

- Multiple workers can process documents in parallel.
- Queue visibility and retries improve failure isolation.
- ECS or Lambda concurrency can scale horizontally.
- Persisted document status supports resumable processing and better observability.

## Trade-offs

- The loan-level record is stored in-memory for the duration of the process, which keeps the system simple but not durable.
- Generic prompting is flexible but less predictable than template-specific extraction.
- Preserving conflicting values improves traceability, but downstream consumers must resolve ambiguity if they need one final truth.
