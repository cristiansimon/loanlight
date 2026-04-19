import { ZodError } from "zod";
import { documentExtractionSchema, type LlmDocumentExtraction } from "./schema";

function extractJsonCandidate(raw: string): string {
  const trimmed = raw.trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("No JSON object found in LLM response.");
  }

  return trimmed.slice(firstBrace, lastBrace + 1);
}

export function parseDocumentExtraction(raw: string): LlmDocumentExtraction {
  try {
    const candidate = extractJsonCandidate(raw);
    const parsed = JSON.parse(candidate);
    return documentExtractionSchema.parse(parsed);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON returned by LLM: ${error.message}`);
    }

    if (error instanceof ZodError) {
      throw new Error(`LLM JSON did not match schema: ${error.message}`);
    }

    throw error;
  }
}
