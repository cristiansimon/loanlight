import type { LoanRecord } from "../types";

export class LoanStore {
  // TODO: Replace in-memory storage with a repository-backed persistence layer (e.g., PostgreSQL)
  private loanRecord: LoanRecord | null = null;
  private processedAt: string | null = null;

  replace(record: LoanRecord): void {
    this.loanRecord = record;
    this.processedAt = new Date().toISOString();
  }

  get(): LoanRecord | null {
    return this.loanRecord;
  }

  getById(id: string): LoanRecord | undefined {
    if (!this.loanRecord) {
      return undefined;
    }

    return this.loanRecord.loanId === id ? this.loanRecord : undefined;
  }

  getMeta(): { count: number; processedAt: string | null } {
    return {
      count: this.loanRecord ? 1 : 0,
      processedAt: this.processedAt
    };
  }
}
