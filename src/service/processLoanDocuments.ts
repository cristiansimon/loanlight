import path from "node:path";
import { log } from "../logger";
import type { DocumentExtraction } from "../types";
import { readPdfDocuments } from "../ingestion/pdf";
import { mergeDocumentExtractions } from "../merge/merge";
import type { LlmClient } from "../extraction/client";
import { LoanStore } from "../store/loanStore";

const EMPTY_DOC_MESSAGE =
  "Document contains no extractable text (likely scanned/image-based). OCR would be required to process this file.";
const processReadLog = (dataDir: string) => `[PROCESS] reading documents from ${dataDir}`;
const fileLog = (documentName: string) => `[FILE] ${documentName}`;
const okLog = (documentName: string) => `[OK] ${documentName}`;
const aggregationLog = (loanId: string, borrowers: Array<{ value: string }>) =>
  `[PROCESS] aggregation complete loanId=${loanId} borrowers=${borrowers.map((borrower) => borrower.value).join(", ")}`;

const isEmptyDocument = (text?: string): boolean => {
  return !text || !text.trim();
};

const toSkipMessage = (documentName: string, message: string): string => {
  return `[SKIP] ${documentName} - ${message}`;
};

export async function processLoanDocuments(options: {
  dataDir?: string;
  llmClient: LlmClient;
  store: LoanStore;
}): Promise<{
  processedDocuments: number;
  skippedDocuments: number;
  errors: { documentName: string; message: string }[];
}> {
  const dataDir =
    options.dataDir ?? path.resolve(process.cwd(), "sample-data");
  log(processReadLog(dataDir));
  const pdfReadResult = await readPdfDocuments(dataDir);
  const parsedDocuments = pdfReadResult.documents;
  const extractions: DocumentExtraction[] = [];
  const errors: { documentName: string; message: string }[] = [...pdfReadResult.errors];

  for (const error of pdfReadResult.errors) {
    log(toSkipMessage(error.documentName, error.message));
  }

  for (const document of parsedDocuments) {
    log(fileLog(document.documentName));

    if (isEmptyDocument(document.text)) {
      // NOTE: In production, this is where OCR processing would be triggered
      // e.g., extractWithOCR(buffer)
      log(toSkipMessage(document.documentName, EMPTY_DOC_MESSAGE));
      errors.push({
        documentName: document.documentName,
        message: EMPTY_DOC_MESSAGE
      });
      continue;
    }

    try {
      const extraction = await options.llmClient.extractDocument({
        documentName: document.documentName,
        text: document.text
      });
      extractions.push(extraction);
      log(okLog(document.documentName));
    } catch (error) {
      log(toSkipMessage(document.documentName, error instanceof Error ? error.message : String(error)));
      errors.push({
        documentName: document.documentName,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  const loanRecord = mergeDocumentExtractions(extractions);
  log(aggregationLog(loanRecord.loanId, loanRecord.borrowers));
  options.store.replace(loanRecord);

  return {
    processedDocuments: extractions.length,
    skippedDocuments: errors.length,
    errors
  };
}
