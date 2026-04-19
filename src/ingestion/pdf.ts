import { promises as fs } from "node:fs";
import path from "node:path";
import pdf from "pdf-parse";

export type ParsedDocument = {
  documentName: string;
  filePath: string;
  text: string;
};

export type PdfReadResult = {
  documents: ParsedDocument[];
  errors: { documentName: string; message: string }[];
};

const extractWithOCR = async (_buffer: Buffer): Promise<string> => {
  // Placeholder for future OCR integration
  // Potential options: Tesseract (local), AWS Textract (cloud)

  // Not implemented in MVP to keep system simple
  return "";
};

async function findPdfFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const pdfs: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      pdfs.push(...(await findPdfFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
      pdfs.push(fullPath);
    }
  }

  return pdfs;
}

export async function readPdfDocuments(baseDir: string): Promise<PdfReadResult> {
  const pdfFiles = await findPdfFiles(baseDir);
  const documents: ParsedDocument[] = [];
  const errors: { documentName: string; message: string }[] = [];

  for (const filePath of pdfFiles) {
    try {
      const buffer = await fs.readFile(filePath);
      const parsed = await pdf(buffer);
      documents.push({
        documentName: path.basename(filePath),
        filePath,
        text: parsed.text.trim()
      });
    } catch (error) {
      console.error(`Failed to parse PDF ${filePath}:`, error);
      errors.push({
        documentName: path.basename(filePath),
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return { documents, errors };
}
