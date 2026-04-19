import { z } from "zod";

const sourceTraceSchema = z.object({
  documentName: z.string().min(1),
  snippet: z.string().min(1)
});

const stringFieldSchema = sourceTraceSchema.extend({
  value: z.string().min(1)
});

const incomeValueSchema = z.object({
  year: z.number().int().nullable(),
  amount: z.number().nonnegative().nullable(),
  source: z.string().min(1).nullable()
});

const incomeFieldSchema = sourceTraceSchema.extend({
  value: incomeValueSchema
});

const borrowerSchema = z.object({
  name: stringFieldSchema,
  address: stringFieldSchema.nullable(),
  incomes: z.array(incomeFieldSchema),
  accountNumbers: z.array(stringFieldSchema),
  loanNumbers: z.array(stringFieldSchema)
});

export const documentExtractionSchema = z.object({
  documentName: z.string().min(1),
  borrowers: z.array(borrowerSchema)
});

export type LlmDocumentExtraction = z.infer<typeof documentExtractionSchema>;
