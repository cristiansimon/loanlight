export type SourceTrace = {
  documentName: string;
  snippet: string;
};

export type FieldValue<T> = SourceTrace & {
  value: T;
};

export type MergedFieldValue<T> = {
  value: T;
  sources: SourceTrace[];
};

export type BorrowerExtraction = {
  name: FieldValue<string>;
  address: FieldValue<string> | null;
  incomes: FieldValue<{
    year: number | null;
    amount: number | null;
    source: string | null;
  }>[];
  accountNumbers: FieldValue<string>[];
  loanNumbers: FieldValue<string>[];
};

export type DocumentExtraction = {
  documentName: string;
  borrowers: BorrowerExtraction[];
};

export type DecisionLogEntry = {
  decision: string;
  reason: string;
};

export type LoanRecord = {
  loanId: string;
  borrowers: MergedFieldValue<string>[];
  addresses: MergedFieldValue<string>[];
  incomes: MergedFieldValue<{
    year: number | null;
    amount: number | null;
    source: string | null;
  }>[];
  accountNumbers: MergedFieldValue<string>[];
  loanNumbers: MergedFieldValue<string>[];
  decisionLog: DecisionLogEntry[];
};
