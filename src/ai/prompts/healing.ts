/**
 * Prompt templates for self-healing locator resolution.
 */

import type { ElementInfo } from "../../core/types";

export const SYSTEM_PROMPT_HEALING = `You are an expert at web element identification. Given a broken selector and page context, find the correct replacement selector.

Rules:
- Prefer data-testid, role-based, or text-based selectors
- Avoid fragile selectors (nth-child, auto-generated IDs)
- Return a JSON object with: { "selector": "...", "confidence": 0-1, "reasoning": "..." }
- If you cannot find a match, set confidence to 0`;

export function buildHealingPrompt(params: {
  brokenSelector: string;
  elementInfo?: ElementInfo;
  pageSnapshot: string;
  errorMessage: string;
}): string {
  const parts = [
    `A test selector is broken and needs healing.`,
    `\nBroken selector: ${params.brokenSelector}`,
    `Error: ${params.errorMessage}`,
  ];

  if (params.elementInfo) {
    parts.push(`\nOriginal element info:`);
    parts.push(`- Tag: ${params.elementInfo.tagName}`);
    parts.push(`- Text: ${params.elementInfo.text ?? "N/A"}`);
    parts.push(
      `- Attributes: ${JSON.stringify(params.elementInfo.attributes)}`,
    );
    parts.push(`- Fingerprint: ${params.elementInfo.fingerprint}`);
  }

  parts.push(
    `\nCurrent page snapshot (accessibility tree):\n${params.pageSnapshot}`,
  );
  parts.push(
    `\nFind the correct selector for this element. Return JSON with selector, confidence, and reasoning.`,
  );

  return parts.join("\n");
}

export const SYSTEM_PROMPT_ELEMENT_DISCOVERY = `You are an expert at analyzing web page structure. Given a page snapshot, identify all interactive elements and generate stable selectors.

Return a JSON array of objects with:
- selector: best Playwright selector
- type: "button" | "input" | "link" | "select" | "checkbox" | "radio" | "other"
- label: human-readable description
- priority: 1-5 (1 = most important for testing)`;

export function buildElementDiscoveryPrompt(pageSnapshot: string): string {
  return `Analyze this page and identify all testable interactive elements:\n\n${pageSnapshot}`;
}
