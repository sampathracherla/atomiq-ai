/**
 * Report generator — produces HTML, JSON, and Markdown test reports
 * with AI analysis, healing logs, and visual regression results.
 */

import * as fs from "fs";
import * as path from "path";
import type { TestRunSummary, ReportOptions } from "../core/types";
import { Logger } from "../core/logger";
import { AIAnalyzer } from "./ai-analyzer";

const log = new Logger("ReportGenerator");

export class ReportGenerator {
  private options: ReportOptions;
  private analyzer: AIAnalyzer;

  constructor(options: ReportOptions) {
    this.options = options;
    this.analyzer = new AIAnalyzer();
  }

  async generate(summary: TestRunSummary): Promise<string> {
    // Add AI analysis if enabled
    if (this.options.includeAIAnalysis) {
      summary.aiAnalysis = await this.analyzer.analyze(summary);
    }

    const outputDir = path.resolve(this.options.outputDir);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    let reportPath: string;
    switch (this.options.format) {
      case "html":
        reportPath = await this.generateHTML(summary, outputDir);
        break;
      case "json":
        reportPath = await this.generateJSON(summary, outputDir);
        break;
      case "markdown":
        reportPath = await this.generateMarkdown(summary, outputDir);
        break;
      default:
        reportPath = await this.generateHTML(summary, outputDir);
    }

    log.info(`Report generated: ${reportPath}`);
    return reportPath;
  }

  private async generateHTML(
    summary: TestRunSummary,
    outputDir: string,
  ): Promise<string> {
    const passRate = ((summary.passed / summary.totalTests) * 100).toFixed(1);
    const patterns = this.analyzer.detectPatterns(summary);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Atomiq AI Test Report — ${new Date().toLocaleDateString()}</title>
<style>
  :root { --pass: #10b981; --fail: #ef4444; --skip: #f59e0b; --flaky: #8b5cf6; --bg: #0f172a; --card: #1e293b; --text: #e2e8f0; --border: #334155; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, sans-serif; background: var(--bg); color: var(--text); padding: 2rem; }
  .container { max-width: 1200px; margin: 0 auto; }
  h1 { font-size: 1.75rem; margin-bottom: 0.5rem; }
  .subtitle { color: #94a3b8; margin-bottom: 2rem; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
  .stat-card { background: var(--card); border-radius: 12px; padding: 1.5rem; border: 1px solid var(--border); }
  .stat-value { font-size: 2rem; font-weight: 700; }
  .stat-label { color: #94a3b8; font-size: 0.875rem; margin-top: 0.25rem; }
  .stat-pass .stat-value { color: var(--pass); }
  .stat-fail .stat-value { color: var(--fail); }
  .stat-skip .stat-value { color: var(--skip); }
  .stat-flaky .stat-value { color: var(--flaky); }
  .section { background: var(--card); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; border: 1px solid var(--border); }
  .section h2 { font-size: 1.25rem; margin-bottom: 1rem; }
  .test-row { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid var(--border); }
  .test-row:last-child { border-bottom: none; }
  .test-name { flex: 1; }
  .badge { padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
  .badge-pass { background: #064e3b; color: var(--pass); }
  .badge-fail { background: #450a0a; color: var(--fail); }
  .badge-skip { background: #451a03; color: var(--skip); }
  .badge-flaky { background: #2e1065; color: var(--flaky); }
  .duration { color: #94a3b8; font-size: 0.875rem; margin-left: 1rem; }
  .error-msg { color: var(--fail); font-size: 0.8rem; margin-top: 0.5rem; font-family: monospace; background: #1a0a0a; padding: 0.5rem; border-radius: 6px; }
  .ai-analysis { white-space: pre-wrap; line-height: 1.6; }
  .progress-bar { height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; margin-top: 0.5rem; }
  .progress-fill { height: 100%; background: var(--pass); border-radius: 4px; transition: width 0.5s; }
  .healing-badge { background: #1e3a5f; color: #60a5fa; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.7rem; margin-left: 0.5rem; }
</style>
</head>
<body>
<div class="container">
  <h1>🤖 Atomiq AI Test Report</h1>
  <p class="subtitle">Generated ${new Date().toLocaleString()} — Atomiq AI</p>

  <div class="stats">
    <div class="stat-card stat-pass">
      <div class="stat-value">${summary.passed}</div>
      <div class="stat-label">Passed</div>
      <div class="progress-bar"><div class="progress-fill" style="width: ${passRate}%"></div></div>
    </div>
    <div class="stat-card stat-fail">
      <div class="stat-value">${summary.failed}</div>
      <div class="stat-label">Failed</div>
    </div>
    <div class="stat-card stat-skip">
      <div class="stat-value">${summary.skipped}</div>
      <div class="stat-label">Skipped</div>
    </div>
    <div class="stat-card stat-flaky">
      <div class="stat-value">${summary.flaky}</div>
      <div class="stat-label">Flaky</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${(summary.duration / 1000).toFixed(1)}s</div>
      <div class="stat-label">Duration</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${passRate}%</div>
      <div class="stat-label">Pass Rate</div>
    </div>
  </div>

  ${
    summary.aiAnalysis
      ? `
  <div class="section">
    <h2>🧠 AI Analysis</h2>
    <div class="ai-analysis">${summary.aiAnalysis}</div>
  </div>`
      : ""
  }

  ${
    patterns.recommendations.length > 0
      ? `
  <div class="section">
    <h2>💡 Recommendations</h2>
    ${patterns.recommendations.map((r) => `<div class="test-row"><span>• ${r}</span></div>`).join("")}
  </div>`
      : ""
  }

  <div class="section">
    <h2>📋 Test Results</h2>
    ${summary.results
      .map(
        (r) => `
    <div class="test-row">
      <span class="test-name">
        ${r.name}
        ${r.healingEvents?.length ? `<span class="healing-badge">🔧 ${r.healingEvents.length} healed</span>` : ""}
      </span>
      <span class="duration">${(r.duration / 1000).toFixed(1)}s</span>
      <span class="badge badge-${r.status}">${r.status.toUpperCase()}</span>
    </div>
    ${r.error ? `<div class="error-msg">${this.escapeHtml(r.error.message)}</div>` : ""}
    `,
      )
      .join("")}
  </div>

  ${
    summary.healingSummary
      ? `
  <div class="section">
    <h2>🔧 Self-Healing Summary</h2>
    <div class="test-row"><span>Total healed selectors</span><span class="stat-value" style="font-size:1.5rem">${summary.healingSummary.totalHealed}</span></div>
    ${Object.entries(summary.healingSummary.strategies)
      .map(
        ([strategy, count]) =>
          `<div class="test-row"><span>${strategy}</span><span>${count}</span></div>`,
      )
      .join("")}
  </div>`
      : ""
  }

</div>
</body>
</html>`;

    const reportPath = path.join(outputDir, "ai-test-report.html");
    fs.writeFileSync(reportPath, html);
    return reportPath;
  }

  private async generateJSON(
    summary: TestRunSummary,
    outputDir: string,
  ): Promise<string> {
    const reportPath = path.join(outputDir, "ai-test-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
    return reportPath;
  }

  private async generateMarkdown(
    summary: TestRunSummary,
    outputDir: string,
  ): Promise<string> {
    const passRate = ((summary.passed / summary.totalTests) * 100).toFixed(1);

    const md = `# AI Test Automation Report

> Generated ${new Date().toLocaleString()}

## Summary

| Metric | Value |
|--------|-------|
| Total | ${summary.totalTests} |
| Passed | ${summary.passed} |
| Failed | ${summary.failed} |
| Skipped | ${summary.skipped} |
| Flaky | ${summary.flaky} |
| Duration | ${(summary.duration / 1000).toFixed(1)}s |
| Pass Rate | ${passRate}% |

${summary.aiAnalysis ? `## AI Analysis\n\n${summary.aiAnalysis}\n` : ""}

## Test Results

| Test | Status | Duration |
|------|--------|----------|
${summary.results.map((r) => `| ${r.name} | ${r.status} | ${(r.duration / 1000).toFixed(1)}s |`).join("\n")}

${
  summary.failed > 0
    ? `## Failures\n\n${summary.results
        .filter((r) => r.status === "failed")
        .map(
          (r) =>
            `### ${r.name}\n\n\`\`\`\n${r.error?.message ?? "Unknown"}\n\`\`\`\n`,
        )
        .join("\n")}`
    : ""
}
`;

    const reportPath = path.join(outputDir, "ai-test-report.md");
    fs.writeFileSync(reportPath, md);
    return reportPath;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}
