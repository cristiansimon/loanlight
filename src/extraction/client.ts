import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { EXTRACTION_PROMPT } from "./prompt";
import { parseDocumentExtraction } from "./parser";
import { documentExtractionSchema } from "./schema";
import type { DocumentExtraction } from "../types";

export type LlmClient = {
  extractDocument(input: { documentName: string; text: string }): Promise<DocumentExtraction>;
};

export class OpenAiLlmClient implements LlmClient {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(apiKey: string, model = "gpt-4.1-mini") {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async extractDocument(input: { documentName: string; text: string }): Promise<DocumentExtraction> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const response = await this.client.responses.parse({
          model: this.model,
          temperature: 0,
          text: {
            format: zodTextFormat(
              documentExtractionSchema,
              "loan_document_extraction",
              {
                description: "Structured borrower extraction for a single loan document."
              }
            )
          },
          input: [
            {
              role: "system",
              content: [{ type: "input_text", text: EXTRACTION_PROMPT }]
            },
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: `Document name: ${input.documentName}\n\nDocument text:\n${input.text}`
                }
              ]
            }
          ]
        });

        return response.output_parsed ?? parseDocumentExtraction(response.output_text);
      } catch (error) {
        lastError = error;
      }
    }

    throw new Error(`LLM extraction failed after retry: ${String(lastError)}`);
  }
}
