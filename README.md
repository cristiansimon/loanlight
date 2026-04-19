# Loan Extractor MVP

Single-service Node.js + TypeScript MVP for extracting loan data from PDF documents in a single loan application.

## What It Does

- Reads PDFs from `sample-data/`
- Extracts a loan-level record with borrowers using one LLM prompt per document
- Aggregates document results into a single loan-level record
- Preserves source traceability for every extracted field
- Exposes results over a small REST API

## Setup

1. Install dependencies:

```bash
npm install
```

2. Set your OpenAI API key:

```bash
$env:OPENAI_API_KEY="your-key"
```

Optional:

```bash
$env:OPENAI_MODEL="gpt-4.1-mini"
```

## Run

Development:

```bash
npm run dev
```

Production-style:

```bash
npm run build
npm start
```

The server runs on `http://localhost:3000` by default.

## API

Process all PDFs in `sample-data/`:

```bash
curl -X POST http://localhost:3000/process
```

Get aggregated loan-level record (preferred):

```bash
curl http://localhost:3000/loan
```

Get loan-level record by ID (preferred):

```bash
curl http://localhost:3000/loan/loan-1
```

Backward-compatible route for the same aggregated loan-level record:

```bash
curl http://localhost:3000/borrowers
```

Backward-compatible route for loan-level record by ID:

```bash
curl http://localhost:3000/borrower/loan-1
```

Note:
The preferred endpoints are `/loan` and `/loan/:id`. The older `/borrowers` and `/borrower/:id` routes still work and return the same loan-level record.

## Usage Notes

- `POST /process` must be called before retrieving results.
- Results are stored in-memory for the duration of the process.
- Restarting the server clears the current loan-level record.
- Some PDFs are image-based and will be skipped in this MVP.
- The output is loan-level first; borrower-level attribution is intentionally limited.

## Tests

```bash
npm test
npm run typecheck
```

## Output Shape

Each field inside the loan-level record is deduplicated by value and keeps all supporting sources:

```json
{
  "value": "John Homeowner",
  "sources": [
    {
      "documentName": "W2 2024- John Homeowner.pdf",
      "snippet": "John Homeowner"
    }
  ]
}
```

## Key Decisions

1. One generic prompt for all document types so the MVP works across W2s, paystubs, bank statements, and unknown layouts without template code.
2. Strict schema validation plus one retry keeps LLM output usable while staying simple.
3. In-memory storage keeps the service small and easy to explain, while `design.md` describes how to move to durable infrastructure later.

## Decision Log

The loan-level record includes a small `decisionLog` that captures decisions such as single-loan aggregation and joint borrower detection. It makes the output easier to review and debug.
