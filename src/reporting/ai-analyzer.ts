/**
 * AI-powered test result analyzer — provides intelligent insights on test runs.
 */

import type {
  TestRunSummary,
  TestResult,
  HealingStrategy,
} from "../core/types";
import { Logger } from "../core/logger";
import { aiEngine } from "../ai/ai-engine";

const log = new Logger("AIAnalyzer");

export class AIAnalyzer {
  /**
   * Generate AI-powered analysis of test results.
   */
  async analyze(summary: TestRunSummary): Promise<string> {
    log.info("Analyzing test results with AI");

    try {
      return await aiEngine.analyzeResults(summary);
    } catch (err) {
      log.warn("AI analysis failed, using rule-based analysis");
      return this.ruleBasedAnalysis(summary);
    }
  }

  /**
   * Diagnose a specific test failure.
   */
  async diagnoseFailure(
    result: TestResult,
    testCode?: string,
  ): Promise<{
    rootCause: string;
    category: string;
    suggestedFix: string;
    confidence: number;
  }> {
    if (!result.error) {
      return {
        rootCause: "No error",
        category: "none",
        suggestedFix: "N/A",
        confidence: 1,
      };
    }

    try {
      return await aiEngine.diagnoseFailure({
        testName: result.name,
        errorMessage: result.error.message,
        errorStack: result.error.stack,
        testCode,
      });
    } catch {
      return this.ruleBasedDiagnosis(result);
    }
  }

  /**
   * Detect patterns across test results.
   */
  detectPatterns(summary: TestRunSummary): PatternReport {
    const patterns: PatternReport = {
      flakyTests: [],
      commonFailures: [],
      slowTests: [],
      healingHotspots: [],
      recommendations: [],
    };

    // Identify flaky tests
    patterns.flakyTests = summary.results
      .filter((r) => r.status === "flaky")
      .map((r) => r.name);

    // Find common failure patterns
    const failureMessages = summary.results
      .filter((r) => r.status === "failed" && r.error)
      .map((r) => r.error!.message);

    const messageCounts = new Map<string, number>();
    for (const msg of failureMessages) {
      const normalized = msg.replace(/\d+/g, "N").replace(/"[^"]*"/g, '"..."');
      messageCounts.set(normalized, (messageCounts.get(normalized) ?? 0) + 1);
    }
    patterns.commonFailures = Array.from(messageCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([message, count]) => ({ message, count }));

    // Identify slow tests (> 2x average duration)
    const avgDuration = summary.duration / summary.totalTests;
    patterns.slowTests = summary.results
      .filter((r) => r.duration > avgDuration * 2)
      .map((r) => ({
        name: r.name,
        duration: r.duration,
        ratio: r.duration / avgDuration,
      }))
      .sort((a, b) => b.ratio - a.ratio);

    // Healing hotspots
    if (summary.healingSummary) {
      const healingByTest = summary.results
        .filter((r) => r.healingEvents && r.healingEvents.length > 0)
        .map((r) => ({ name: r.name, count: r.healingEvents!.length }))
        .sort((a, b) => b.count - a.count);
      patterns.healingHotspots = healingByTest;
    }

    // Generate recommendations
    if (patterns.flakyTests.length > 0) {
      patterns.recommendations.push(
        `${patterns.flakyTests.length} flaky test(s) detected — add explicit waits or stabilize test data.`,
      );
    }
    if (patterns.commonFailures.length > 0) {
      patterns.recommendations.push(
        `Common failure pattern found (${patterns.commonFailures[0].count} occurrences) — likely a systemic issue.`,
      );
    }
    if (patterns.slowTests.length > 0) {
      patterns.recommendations.push(
        `${patterns.slowTests.length} slow test(s) — consider optimizing or parallelizing.`,
      );
    }
    if (patterns.healingHotspots.length > 0) {
      patterns.recommendations.push(
        `${patterns.healingHotspots.length} test(s) required self-healing — update selectors to prevent future healing.`,
      );
    }

    return patterns;
  }

  private ruleBasedAnalysis(summary: TestRunSummary): string {
    const passRate = ((summary.passed / summary.totalTests) * 100).toFixed(1);
    const lines = [
      `## Test Run Analysis`,
      ``,
      `**Pass Rate:** ${passRate}% (${summary.passed}/${summary.totalTests})`,
      `**Duration:** ${(summary.duration / 1000).toFixed(1)}s`,
      `**Failed:** ${summary.failed} | **Skipped:** ${summary.skipped} | **Flaky:** ${summary.flaky}`,
      ``,
    ];

    if (summary.failed > 0) {
      lines.push(`### Failures`);
      for (const result of summary.results.filter(
        (r) => r.status === "failed",
      )) {
        lines.push(
          `- **${result.name}**: ${result.error?.message ?? "Unknown error"}`,
        );
      }
      lines.push("");
    }

    const patterns = this.detectPatterns(summary);
    if (patterns.recommendations.length > 0) {
      lines.push(`### Recommendations`);
      for (const rec of patterns.recommendations) {
        lines.push(`- ${rec}`);
      }
    }

    return lines.join("\n");
  }

  private ruleBasedDiagnosis(result: TestResult): {
    rootCause: string;
    category: string;
    suggestedFix: string;
    confidence: number;
  } {
    const msg = result.error?.message ?? "";
    if (msg.includes("Timeout") || msg.includes("waiting for")) {
      return {
        rootCause: "Element not found or page load timeout",
        category: "timing",
        suggestedFix: "Increase timeout or add explicit wait",
        confidence: 0.7,
      };
    }
    if (msg.includes("selector") || msg.includes("locator")) {
      return {
        rootCause: "Selector has changed",
        category: "selector",
        suggestedFix: "Update selector or enable self-healing",
        confidence: 0.8,
      };
    }
    if (msg.includes("expect") || msg.includes("assert")) {
      return {
        rootCause: "Assertion mismatch",
        category: "test-logic",
        suggestedFix: "Verify expected value or update assertion",
        confidence: 0.6,
      };
    }
    return {
      rootCause: msg,
      category: "application-bug",
      suggestedFix: "Investigate application behavior",
      confidence: 0.4,
    };
  }
}

export interface PatternReport {
  flakyTests: string[];
  commonFailures: Array<{ message: string; count: number }>;
  slowTests: Array<{ name: string; duration: number; ratio: number }>;
  healingHotspots: Array<{ name: string; count: number }>;
  recommendations: string[];
}
