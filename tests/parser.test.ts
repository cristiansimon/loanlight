import assert from "node:assert/strict";
import { parseDocumentExtraction } from "../src/extraction/parser";

export function runParserSuccessTest(): void {
  const result = parseDocumentExtraction(`
    {
      "documentName": "w2.pdf",
      "borrowers": [
        {
          "name": {
            "value": "John Homeowner",
            "documentName": "w2.pdf",
            "snippet": "John Homeowner"
          },
          "address": null,
          "incomes": [],
          "accountNumbers": [],
          "loanNumbers": []
        }
      ]
    }
  `);

  assert.equal(result.documentName, "w2.pdf");
  assert.equal(result.borrowers.length, 1);
}

export function runParserFailureTest(): void {
  assert.throws(
    () =>
      parseDocumentExtraction(`
        {
          "documentName": "w2.pdf",
          "borrowers": [
            {
              "name": null,
              "address": null,
              "incomes": [],
              "accountNumbers": [],
              "loanNumbers": []
            }
          ]
        }
      `),
    /schema/
  );
}
