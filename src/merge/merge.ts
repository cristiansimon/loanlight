import type {
  DocumentExtraction,
  FieldValue,
  LoanRecord,
  MergedFieldValue
} from "../types";

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function normalizeAddress(value: string): string {
  const cleaned = value.trim().replace(/\s+/g, " ");

  return cleaned
    .replace(/\s*,\s*/g, ", ")
    .replace(
      /^(.+?\b(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Court|Ct|Place|Pl|Way)\b)\s+([A-Z][a-z]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?)$/i,
      "$1, $2"
    );
}

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function mergeFieldValue<T>(
  items: MergedFieldValue<T>[],
  next: FieldValue<T>,
  getKey: (value: T) => string
): MergedFieldValue<T>[] {
  const nextKey = getKey(next.value);
  const existing = items.find((item) => getKey(item.value) === nextKey);

  if (!existing) {
    return [
      ...items,
      {
        value: next.value,
        sources: [
          {
            documentName: next.documentName,
            snippet: next.snippet
          }
        ]
      }
    ];
  }

  const sourceExists = existing.sources.some(
    (source) =>
      source.documentName === next.documentName && source.snippet === next.snippet
  );

  if (!sourceExists) {
    existing.sources.push({
      documentName: next.documentName,
      snippet: next.snippet
    });
  }

  return items;
}

function normalizeSingleBorrowerName(value: string): string | null {
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (!cleaned) {
    return null;
  }

  if (cleaned.includes(",")) {
    const [lastName, firstName] = cleaned.split(",").map((part) => part.trim());
    if (lastName && firstName) {
      return toTitleCase(`${firstName} ${lastName}`);
    }
  }

  return toTitleCase(cleaned);
}

function splitBorrowerNames(value: string): string[] {
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (!cleaned) {
    return [];
  }

  if (cleaned.includes(",") && /\s(?:and|&)\s/i.test(cleaned)) {
    const [lastName, firstNames] = cleaned.split(",").map((part) => part.trim());
    if (lastName && firstNames) {
      return firstNames
        .split(/\s+(?:and|&)\s+/i)
        .map((firstName) => normalizeSingleBorrowerName(`${firstName} ${lastName}`))
        .filter((name): name is string => Boolean(name));
    }
  }

  const jointParts = cleaned.split(/\s+(?:and|&)\s+/i);
  if (jointParts.length > 1) {
    const lastPartTokens = jointParts[jointParts.length - 1]
      .split(" ")
      .filter(Boolean);
    const inferredSurname =
      lastPartTokens.length > 1 ? lastPartTokens.slice(1).join(" ") : "";

    return jointParts
      .map((part, index) => {
        const tokens = part.split(" ").filter(Boolean);
        if (index < jointParts.length - 1 && tokens.length === 1 && inferredSurname) {
          return normalizeSingleBorrowerName(`${part} ${inferredSurname}`);
        }

        return normalizeSingleBorrowerName(part);
      })
      .filter((name): name is string => Boolean(name));
  }

  const normalized = normalizeSingleBorrowerName(cleaned);
  return normalized ? [normalized] : [];
}

function buildDecisionLog(
  extractions: DocumentExtraction[],
  borrowers: MergedFieldValue<string>[]
): LoanRecord["decisionLog"] {
  const decisionLog: LoanRecord["decisionLog"] = [
    {
      decision: "single_loan_application",
      reason: "All processed documents were merged into one loan-level record for this run."
    }
  ];

  if (borrowers.length > 1) {
    decisionLog.push({
      decision: "joint_borrowers",
      reason: "Documents contain borrower names together and separately, so they were normalized into one joint borrower list."
    });
  }

  if (extractions.length > 1) {
    decisionLog.push({
      decision: "multi_document_merge",
      reason: `Merged ${extractions.length} document extractions into one result.`
    });
  }

  return decisionLog;
}

export function mergeDocumentExtractions(extractions: DocumentExtraction[]): LoanRecord {
  const loanRecord: LoanRecord = {
    loanId: "loan-1",
    borrowers: [],
    addresses: [],
    incomes: [],
    accountNumbers: [],
    loanNumbers: [],
    decisionLog: []
  };

  for (const extraction of extractions) {
    for (const borrower of extraction.borrowers) {
      for (const name of splitBorrowerNames(borrower.name.value)) {
        loanRecord.borrowers = mergeFieldValue(
          loanRecord.borrowers,
          {
            value: name,
            documentName: borrower.name.documentName,
            snippet: borrower.name.snippet
          },
          normalizeText
        );
      }

      if (borrower.address) {
        const normalizedAddress = {
          ...borrower.address,
          value: normalizeAddress(borrower.address.value)
        };

        loanRecord.addresses = mergeFieldValue(
          loanRecord.addresses,
          normalizedAddress,
          (value) => normalizeText(normalizeAddress(value))
        );
      }

      for (const income of borrower.incomes) {
        loanRecord.incomes = mergeFieldValue(
          loanRecord.incomes,
          income,
          (value) =>
            `${value.year ?? "null"}|${value.amount ?? "null"}|${normalizeText(value.source ?? "null")}`
        );
      }

      for (const accountNumber of borrower.accountNumbers) {
        loanRecord.accountNumbers = mergeFieldValue(
          loanRecord.accountNumbers,
          accountNumber,
          normalizeDigits
        );
      }

      for (const loanNumber of borrower.loanNumbers) {
        loanRecord.loanNumbers = mergeFieldValue(
          loanRecord.loanNumbers,
          loanNumber,
          normalizeDigits
        );
      }
    }
  }

  loanRecord.decisionLog = buildDecisionLog(extractions, loanRecord.borrowers);

  return loanRecord;
}
