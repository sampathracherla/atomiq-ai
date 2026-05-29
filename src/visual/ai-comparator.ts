/**
 * AI visual comparator — uses LLM to analyze visual differences semantically.
 */

import * as fs from "fs";
import { Logger } from "../core/logger";
import type { VisualComparisonResult } from "../core/types";
import { aiEngine } from "../ai/ai-engine";

const log = new Logger("AIComparator");

export class AIVisualComparator {
  /**
   * Analyze a visual diff using AI to determine if the change is meaningful.
   */
  async analyzeVisualDiff(result: VisualComparisonResult): Promise<string> {
    if (result.match) return "No visual differences detected.";

    log.info("Analyzing visual diff with AI");

    const prompt = `Analyze this visual regression test result:
- Diff percentage: ${(result.diffPercentage * 100).toFixed(2)}%
- Baseline: ${result.baselinePath}
- Actual: ${result.actualPath}
${result.diffImagePath ? `- Diff image generated at: ${result.diffImagePath}` : ""}

Based on the diff percentage and context, provide:
1. Severity assessment (critical / warning / cosmetic)
2. Likely cause of the visual change
3. Recommendation (accept, investigate, or reject)

Note: Without seeing the actual images, base your analysis on the diff percentage and common patterns.`;

    try {
      const analysis = await aiEngine.diagnoseFailure({
        testName: "Visual Regression",
        errorMessage: `Visual diff: ${(result.diffPercentage * 100).toFixed(2)}% difference`,
      });
      return `Severity: ${analysis.category}\nRoot Cause: ${analysis.rootCause}\nRecommendation: ${analysis.suggestedFix}`;
    } catch (err) {
      log.warn("AI visual analysis failed, using heuristic");
      return this.heuristicAnalysis(result);
    }
  }

  private heuristicAnalysis(result: VisualComparisonResult): string {
    const pct = result.diffPercentage * 100;
    if (pct < 1)
      return `Cosmetic: ${pct.toFixed(2)}% change — likely anti-aliasing or font rendering. Recommendation: Accept.`;
    if (pct < 5)
      return `Warning: ${pct.toFixed(2)}% change — minor layout shift detected. Recommendation: Investigate.`;
    if (pct < 15)
      return `Significant: ${pct.toFixed(2)}% change — likely a meaningful UI change. Recommendation: Review carefully.`;
    return `Critical: ${pct.toFixed(2)}% change — major visual regression. Recommendation: Reject and investigate.`;
  }
}
