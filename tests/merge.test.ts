import assert from "node:assert/strict";
import { mergeDocumentExtractions } from "../src/merge/merge";
import type { DocumentExtraction } from "../src/types";

export function runMergeTest(): void {
  const input: DocumentExtraction[] = [
    {
      documentName: "w2.pdf",
      borrowers: [
        {
          name: {
            value: "John Homeowner",
            documentName: "w2.pdf",
            snippet: "John Homeowner"
          },
          address: {
            value: "123 Main St",
            documentName: "w2.pdf",
            snippet: "123 Main St"
          },
          incomes: [
            {
              value: { year: 2024, amount: 85000, source: "W2" },
              documentName: "w2.pdf",
              snippet: "Wages 85000"
            }
          ],
          accountNumbers: [],
          loanNumbers: [
            {
              value: "LN-1234",
              documentName: "w2.pdf",
              snippet: "LN-1234"
            }
          ]
        }
      ]
    },
    {
      documentName: "paystub.pdf",
      borrowers: [
        {
          name: {
            value: "John Homeowner",
            documentName: "paystub.pdf",
            snippet: "John Homeowner"
          },
          address: {
            value: "123 Main St",
            documentName: "paystub.pdf",
            snippet: "123 Main St"
          },
          incomes: [
            {
              value: { year: 2024, amount: 85000, source: "W2" },
              documentName: "w2.pdf",
              snippet: "Wages 85000"
            },
            {
              value: { year: 2024, amount: 3200, source: "paystub" },
              documentName: "paystub.pdf",
              snippet: "Current earnings 3200"
            }
          ],
          accountNumbers: [
            {
              value: "Account # 0001234",
              documentName: "paystub.pdf",
              snippet: "Account # 0001234"
            }
          ],
          loanNumbers: [
            {
              value: "LN1234",
              documentName: "paystub.pdf",
              snippet: "LN1234"
            }
          ]
        }
      ]
    }
  ];

  const merged = mergeDocumentExtractions(input);

  assert.equal(merged.loanId, "loan-1");
  assert.deepEqual(
    merged.borrowers.map((borrower) => borrower.value),
    ["John Homeowner"]
  );
  assert.equal(merged.borrowers[0].sources.length, 2);
  assert.equal(merged.addresses.length, 1);
  assert.equal(merged.addresses[0].sources.length, 2);
  assert.equal(merged.incomes.length, 2);
  assert.equal(merged.incomes[0].sources.length, 1);
  assert.equal(merged.accountNumbers.length, 1);
  assert.equal(merged.loanNumbers.length, 1);
  assert.equal(merged.loanNumbers[0].sources.length, 2);
}

export function runJointBorrowerNormalizationTest(): void {
  const merged = mergeDocumentExtractions([
    {
      documentName: "joint.pdf",
      borrowers: [
        {
          name: {
            value: "John Homeowner and Mary Homeowner",
            documentName: "joint.pdf",
            snippet: "John Homeowner and Mary Homeowner"
          },
          address: null,
          incomes: [],
          accountNumbers: [],
          loanNumbers: []
        },
        {
          name: {
            value: "Homeowner, John",
            documentName: "joint.pdf",
            snippet: "Homeowner, John"
          },
          address: null,
          incomes: [],
          accountNumbers: [],
          loanNumbers: []
        }
      ]
    }
  ]);

  assert.deepEqual(
    merged.borrowers.map((borrower) => borrower.value),
    ["John Homeowner", "Mary Homeowner"]
  );
  assert.equal(merged.borrowers[0].sources.length >= 1, true);
  assert.equal(merged.decisionLog.some((entry) => entry.decision === "joint_borrowers"), true);
}

export function runAddressNormalizationTest(): void {
  const merged = mergeDocumentExtractions([
    {
      documentName: "doc-1.pdf",
      borrowers: [
        {
          name: {
            value: "John Homeowner",
            documentName: "doc-1.pdf",
            snippet: "John Homeowner"
          },
          address: {
            value: "175 13th Street Washington, DC 20013",
            documentName: "doc-1.pdf",
            snippet: "175 13th Street Washington, DC 20013"
          },
          incomes: [],
          accountNumbers: [],
          loanNumbers: []
        }
      ]
    },
    {
      documentName: "doc-2.pdf",
      borrowers: [
        {
          name: {
            value: "John Homeowner",
            documentName: "doc-2.pdf",
            snippet: "John Homeowner"
          },
          address: {
            value: "175 13th Street, Washington, DC 20013",
            documentName: "doc-2.pdf",
            snippet: "175 13th Street, Washington, DC 20013"
          },
          incomes: [],
          accountNumbers: [],
          loanNumbers: []
        }
      ]
    }
  ]);

  assert.equal(merged.addresses.length, 1);
  assert.equal(merged.addresses[0].value, "175 13th Street, Washington, DC 20013");
  assert.equal(merged.addresses[0].sources.length, 2);
}
