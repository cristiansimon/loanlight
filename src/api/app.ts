import express from "express";
import { OpenAiLlmClient } from "../extraction/client";
import { log } from "../logger";
import { LoanStore } from "../store/loanStore";
import { processLoanDocuments } from "../service/processLoanDocuments";
import { setupSwagger } from "./swagger";

const OPENAI_KEY_MISSING = "OPENAI_API_KEY is not set.";
const UNKNOWN_ERROR = "Unknown error";
const STATUS_OK = "ok";
const PROCESS_START = "[PROCESS] start";
const BORROWERS_EMPTY = "[BORROWERS] empty state (run POST /process first)";
const BORROWERS_RETURNING = "[BORROWERS] returning loan";
const requestLog = (method: string, url: string) => `[REQ] ${method} ${url}`;
const processSummaryLog = (processed: number, skipped: number) =>
  `[PROCESS] summary processed=${processed} skipped=${skipped}`;
const processBorrowersLog = (borrowers: Array<{ value: string }>) =>
  `[PROCESS] borrowers=${borrowers.length}${borrowers.length ? ` (${borrowers.map((borrower) => borrower.value).join(", ")})` : ""}`;
const loanNotFound = (loanId: string) => `Loan ${loanId} not found.`;

export const app = express();
const store = new LoanStore();

app.use(express.json());
app.use((request, _response, next) => {
  log(requestLog(request.method, request.originalUrl));
  next();
});
setupSwagger(app);

const getLoanHandler: express.RequestHandler = (_request, response) => {
  const loan = store.get();

  if (!loan) {
    log(BORROWERS_EMPTY);
  } else {
    log(`${BORROWERS_RETURNING} ${loan.loanId}`);
  }

  response.json({
    loan,
    meta: store.getMeta()
  });
};

const getLoanByIdHandler: express.RequestHandler = (request, response) => {
  const loanId = Array.isArray(request.params.id)
    ? request.params.id[0]
    : request.params.id;
  const loan = store.getById(loanId);
  if (!loan) {
    response.status(404).json({
      error: loanNotFound(loanId)
    });
    return;
  }

  response.json(loan);
};

app.post("/process", async (_request, response) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    response.status(500).json({
      error: OPENAI_KEY_MISSING
    });
    return;
  }

  try {
    log(PROCESS_START);
    const llmClient = new OpenAiLlmClient(
      apiKey,
      process.env.OPENAI_MODEL ?? "gpt-4.1-mini"
    );
    const result = await processLoanDocuments({ llmClient, store });
    const loan = store.get();

    log(processSummaryLog(result.processedDocuments, result.skippedDocuments));
    log(processBorrowersLog(loan?.borrowers ?? []));

    response.json({
      status: STATUS_OK,
      ...result,
      loan,
      meta: store.getMeta()
    });
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : UNKNOWN_ERROR
    });
  }
});

app.get("/loan", getLoanHandler);
app.get("/loan/:id", getLoanByIdHandler);

app.get("/borrowers", getLoanHandler);
app.get("/borrower/:id", getLoanByIdHandler);
