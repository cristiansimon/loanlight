export const EXTRACTION_PROMPT = `
You extract borrower data from one loan document.

Return JSON only.
Do not include markdown.
Do not hallucinate.
If a field is missing, use null or [].
Only use information directly supported by the document text.
Each extracted field must include:
- documentName
- snippet copied from the document text that supports the value

Extract this shape:
{
  "documentName": "string",
  "borrowers": [
    {
      "name": {
        "value": "string",
        "documentName": "string",
        "snippet": "string"
      },
      "address": {
        "value": "string",
        "documentName": "string",
        "snippet": "string"
      } | null,
      "incomes": [
        {
          "value": {
            "year": 2024 | null,
            "amount": 12345.67 | null,
            "source": "W2" | "paystub" | "bank_statement" | "tax_return" | "employment_verification" | "other" | null
          },
          "documentName": "string",
          "snippet": "string"
        }
      ],
      "accountNumbers": [
        {
          "value": "string",
          "documentName": "string",
          "snippet": "string"
        }
      ],
      "loanNumbers": [
        {
          "value": "string",
          "documentName": "string",
          "snippet": "string"
        }
      ]
    }
  ]
}

Rules:
- The document may be a W2, paystub, bank statement, tax return, title report, disclosure, or unknown format.
- Use a generic strategy that works for any document layout.
- If a borrower name is empty or unsupported, do not output that borrower.
- Income values must be numeric when present.
- Preserve multiple candidate values if the document is ambiguous.
- documentName must match the provided document name exactly.
`.trim();
