/**
 * Prompt templates for AI-powered test result analysis.
 */

import type { TestRunSummary } from "../../core/types";

export const SYSTEM_PROMPT_ANALYSIS = `You are a senior QA engineer analyzing test results. Provide actionable insights.

Your analysis should include:
1. Executive summary (pass/fail rates, trends)
2. Root cause analysis for failures
3. Pattern detection (flaky tests, common failure modes)
4. Recommendations for improvement
5. Risk assessment

Format your response as structured markdown.`;

export function buildAnalysisPrompt(summary: TestRunSummary): string {
  const failedTests = summary.results
    .filter((r) => r.status === "failed")
    .map((r) => ({
      name: r.name,
      suite: r.suite,
      error: r.error?.message,
      duration: r.duration,
      healingAttempts: r.healingEvents?.length ?? 0,
    }));

  const flakyTests = summary.results
    .filter((r) => r.status === "flaky")
    .map((r) => r.name);

  return `Analyze these test results:

Total: ${summary.totalTests} | Passed: ${summary.passed} | Failed: ${summary.failed} | Skipped: ${summary.skipped} | Flaky: ${summary.flaky}
Duration: ${(summary.duration / 1000).toFixed(1)}s

Failed Tests:
${JSON.stringify(failedTests, null, 2)}

Flaky Tests: ${flakyTests.join(", ") || "None"}

Healing Summary: ${summary.healingSummary ? JSON.stringify(summary.healingSummary) : "No healing events"}

Provide actionable analysis and recommendations.`;
}

export const SYSTEM_PROMPT_FAILURE_DIAGNOSIS = `You are an expert at diagnosing test failures. Given a test failure with error details and context, identify the root cause and suggest a fix.

Return JSON:
{
  "rootCause": "description",
  "category": "selector" | "timing" | "data" | "environment" | "application-bug" | "test-logic",
  "suggestedFix": "code or description",
  "confidence": 0-1
}`;

export function buildFailureDiagnosisPrompt(params: {
  testName: string;
  errorMessage: string;
  errorStack?: string;
  testCode?: string;
  pageSnapshot?: string;
}): string {
  const parts = [
    `Diagnose this test failure:`,
    `\nTest: ${params.testName}`,
    `Error: ${params.errorMessage}`,
  ];

  if (params.errorStack) parts.push(`\nStack:\n${params.errorStack}`);
  if (params.testCode)
    parts.push(`\nTest Code:\n\`\`\`typescript\n${params.testCode}\n\`\`\``);
  if (params.pageSnapshot)
    parts.push(`\nPage Snapshot:\n${params.pageSnapshot}`);

  return parts.join("\n");
}
