/**
 * Prompt templates for AI-powered test generation.
 */

import type { AppType } from "../../core/types";

export const SYSTEM_PROMPT_TEST_GENERATION = `You are an expert test automation engineer. You generate production-quality Playwright TypeScript test scripts.

Rules:
- Use @playwright/test imports (test, expect)
- Use test.describe and test.step for organization
- Use meaningful assertions (not just checking for visibility)
- Include proper waits and error handling
- Follow AAA pattern (Arrange, Act, Assert)
- Generate selectors in order of preference: data-testid > role > text > css
- Add comments explaining complex logic
- Return ONLY the test code, no explanations`;

export function buildTestGenerationPrompt(params: {
  description: string;
  appType: AppType;
  targetUrl?: string;
  pageContext?: string;
  existingCode?: string;
  additionalContext?: string;
}): string {
  const parts: string[] = [
    `Generate a Playwright test for the following scenario:`,
    `\nDescription: ${params.description}`,
    `Application Type: ${params.appType}`,
  ];

  if (params.targetUrl) parts.push(`Target URL: ${params.targetUrl}`);

  if (params.appType === "api") {
    parts.push(
      `\nThis is an API test. Use request fixtures (page.request or test context).`,
    );
    parts.push(`Use proper HTTP methods, headers, and response validation.`);
  }

  if (params.appType === "sap") {
    parts.push(
      `\nThis is an SAP Fiori/UI5 application. Use dhikraft fixtures if available.`,
    );
    parts.push(
      `Use ui5.control() for UI5 elements, navigation fixtures for FLP.`,
    );
  }

  if (params.pageContext) {
    parts.push(`\nCurrent Page Context (DOM snapshot):\n${params.pageContext}`);
  }

  if (params.existingCode) {
    parts.push(
      `\nExisting test code to enhance:\n\`\`\`typescript\n${params.existingCode}\n\`\`\``,
    );
  }

  if (params.additionalContext) {
    parts.push(`\nAdditional Context:\n${params.additionalContext}`);
  }

  return parts.join("\n");
}

export const SYSTEM_PROMPT_TEST_ENHANCEMENT = `You are an expert test automation engineer. You enhance existing Playwright tests with:
- Better assertions and coverage
- Edge case handling
- Data-driven scenarios
- Accessibility checks
- Performance timing
Return ONLY the enhanced test code.`;

export function buildTestEnhancementPrompt(
  code: string,
  instructions: string,
): string {
  return `Enhance this Playwright test based on the following instructions:

Instructions: ${instructions}

Current test code:
\`\`\`typescript
${code}
\`\`\`

Return the complete enhanced test code.`;
}
