import {
  runAddressNormalizationTest,
  runJointBorrowerNormalizationTest,
  runMergeTest
} from "./merge.test";
import { runParserFailureTest, runParserSuccessTest } from "./parser.test";

function run(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

run("mergeDocumentExtractions deduplicates and preserves sources", runMergeTest);
run("mergeDocumentExtractions normalizes joint borrower names", runJointBorrowerNormalizationTest);
run("mergeDocumentExtractions normalizes equivalent addresses", runAddressNormalizationTest);
run("parseDocumentExtraction accepts valid JSON", runParserSuccessTest);
run("parseDocumentExtraction rejects invalid schema", runParserFailureTest);
