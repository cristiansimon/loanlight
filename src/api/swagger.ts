import type { Express } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

export function setupSwagger(app: Express): void {
  const spec = swaggerJsdoc({
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Loan Extractor API",
        version: "1.0.0",
        description:
          "Single loan application inferred from multiple documents. Joint borrower detection based on cross-document evidence. Decision log explains modeling decisions."
      },
      servers: [
        {
          url: "http://localhost:3301",
          description: "Local development server"
        }
      ],
      components: {
        schemas: {
          Loan: {
            type: "object",
            description:
              "Single loan application inferred from multiple documents. Decision log explains modeling decisions.",
            properties: {
              loanId: { type: "string", example: "loan-1" },
              borrowers: {
                type: "array",
                description:
                  "Joint borrower detection based on cross-document evidence.",
                items: { type: "string" },
                example: ["John Homeowner", "Mary Homeowner"]
              },
              addresses: {
                type: "array",
                items: { type: "object" }
              },
              incomes: {
                type: "array",
                items: { type: "object" }
              },
              accountNumbers: {
                type: "array",
                items: { type: "object" }
              },
              loanNumbers: {
                type: "array",
                items: { type: "object" }
              },
              decisionLog: {
                type: "array",
                description: "Decision log explains modeling decisions.",
                items: {
                  type: "object",
                  properties: {
                    decision: { type: "string" },
                    reason: { type: "string" }
                  }
                }
              }
            }
          },
          ProcessResponse: {
            type: "object",
            properties: {
              status: { type: "string", example: "ok" },
              processedDocuments: { type: "integer", example: 9 },
              skippedDocuments: { type: "integer", example: 1 },
              loan: {
                $ref: "#/components/schemas/Loan"
              }
            }
          }
        }
      },
      paths: {
        "/process": {
          post: {
            summary: "Trigger document processing",
            description:
              "Triggers document processing and returns the aggregated loan result.",
            responses: {
              "200": {
                description: "Processing completed successfully.",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/ProcessResponse"
                    }
                  }
                }
              }
            }
          }
        },
        "/loan": {
          get: {
            summary: "Get aggregated loan record",
            description:
              "Returns a single loan-level record including all borrowers inferred from documents.",
            responses: {
              "200": {
                description: "Current in-memory loan record.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        loan: { $ref: "#/components/schemas/Loan" }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "/loan/{id}": {
          get: {
            summary: "Get loan by ID",
            description: "Returns a specific loan-level record by id.",
            parameters: [
              {
                in: "path",
                name: "id",
                required: true,
                schema: {
                  type: "string",
                  example: "loan-1"
                }
              }
            ],
            responses: {
              "200": {
                description: "Loan record found.",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/Loan"
                    }
                  }
                }
              },
              "404": {
                description: "Loan record not found."
              }
            }
          }
        },
        "/borrowers": {
          get: {
            summary: "Get aggregated loan record",
            description:
              "DEPRECATED: Returns loan-level data for backward compatibility. Use /loan instead.",
            deprecated: true,
            responses: {
              "200": {
                description: "Current in-memory loan record.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        loan: { $ref: "#/components/schemas/Loan" }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "/borrower/{id}": {
          get: {
            summary: "Get specific loan record",
            description:
              "DEPRECATED: Returns loan-level data for backward compatibility. Use /loan/{id} instead.",
            deprecated: true,
            parameters: [
              {
                in: "path",
                name: "id",
                required: true,
                schema: {
                  type: "string",
                  example: "loan-1"
                }
              }
            ],
            responses: {
              "200": {
                description: "Loan record found.",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/Loan"
                    }
                  }
                }
              },
              "404": {
                description: "Loan record not found."
              }
            }
          }
        }
      }
    },
    apis: []
  });

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));
}
