/**
 * Atomiq AI — Report Agent
 *
 * Generates comprehensive test execution reports in multiple formats.
 * Aggregates results from all agents, produces summary dashboards,
 * trend analysis, and exportable reports (JSON, HTML, Markdown).
 */

import { BaseAgent } from "./base-agent";
import type { AgentCapability, Task, TaskResult } from "./types";
import type { MessageBus } from "./message-bus";
import * as fs from "fs";
import * as path from "path";

export interface TestRunSummary {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  passRate: string;
  duration: string;
  agents: AgentSummary[];
}

export interface AgentSummary {
  agent: string;
  tests: number;
  passed: number;
  failed: number;
  duration: string;
  status: "pass" | "fail" | "partial";
}

export interface TrendData {
  runs: Array<{
    date: string;
    passRate: number;
    totalTests: number;
    duration: number;
  }>;
  trend: "improving" | "declining" | "stable";
  avgPassRate: number;
}

export class ReportAgent extends BaseAgent {
  private projectRoot: string;
  private reportDir: string;

  constructor(bus: MessageBus, projectRoot?: string) {
    super("report", bus);
    this.projectRoot = projectRoot || process.cwd();
    this.reportDir = path.join(this.projectRoot, "reports");
  }

  getCapabilities(): AgentCapability[] {
    return [
      {
        name: "generate-summary",
        description: "Generate a test execution summary from agent results",
        inputSchema: { results: "AgentResult[]" },
      },
      {
        name: "export-html",
        description: "Export report as styled HTML dashboard",
        inputSchema: { results: "AgentResult[]" },
      },
      {
        name: "export-markdown",
        description: "Export report as Markdown document",
        inputSchema: { results: "AgentResult[]" },
      },
      {
        name: "trend-analysis",
        description: "Analyze test pass rate trends over recent runs",
      },
    ];
  }

  async perform(task: Task): Promise<TaskResult> {
    const startTime = Date.now();
    const { command, results } = task.input as {
      command: string;
      results?: Array<{ agent: string; success: boolean; metrics?: any }>;
    };

    switch (command) {
      case "generate-summary":
        return this.generateSummary(results || [], startTime);
      case "export-html":
        return this.exportHtml(results || [], startTime);
      case "export-markdown":
        return this.exportMarkdown(results || [], startTime);
      case "trend-analysis":
        return this.trendAnalysis(startTime);
      default:
        return { success: false, error: `Unknown command: ${command}` };
    }
  }

  /**
   * Generate a structured summary of test execution results.
   */
  private async generateSummary(
    results: Array<{ agent: string; success: boolean; metrics?: any }>,
    startTime: number,
  ): Promise<TaskResult> {
    const agentSummaries: AgentSummary[] = results.map((r) => ({
      agent: r.agent,
      tests: r.metrics?.testsRun || (r.success ? 1 : 0),
      passed: r.metrics?.testsPassed || (r.success ? 1 : 0),
      failed: r.metrics?.testsFailed || (r.success ? 0 : 1),
      duration: `${((r.metrics?.duration || 0) / 1000).toFixed(1)}s`,
      status: r.metrics?.testsFailed > 0 ? "fail" : r.success ? "pass" : "fail",
    }));

    const totalTests = agentSummaries.reduce((sum, a) => sum + a.tests, 0);
    const totalPassed = agentSummaries.reduce((sum, a) => sum + a.passed, 0);
    const totalFailed = agentSummaries.reduce((sum, a) => sum + a.failed, 0);
    const totalDuration = results.reduce(
      (sum, r) => sum + (r.metrics?.duration || 0),
      0,
    );

    const summary: TestRunSummary = {
      timestamp: new Date().toISOString(),
      totalTests,
      passed: totalPassed,
      failed: totalFailed,
      skipped: 0,
      passRate:
        totalTests > 0
          ? `${((totalPassed / totalTests) * 100).toFixed(1)}%`
          : "N/A",
      duration: `${(totalDuration / 1000).toFixed(1)}s`,
      agents: agentSummaries,
    };

    // Persist summary for trend analysis
    this.persistRun(summary);

    return {
      success: true,
      data: summary,
      metrics: { duration: Date.now() - startTime },
    };
  }

  /**
   * Export results as a styled HTML report dashboard.
   */
  private async exportHtml(
    results: Array<{ agent: string; success: boolean; metrics?: any }>,
    startTime: number,
  ): Promise<TaskResult> {
    const summaryResult = await this.generateSummary(results, startTime);
    const summary = summaryResult.data as TestRunSummary;

    const agentRows = summary.agents
      .map(
        (a) =>
          `<tr class="${a.status}">
        <td>${a.agent}</td>
        <td>${a.tests}</td>
        <td>${a.passed}</td>
        <td>${a.failed}</td>
        <td>${a.duration}</td>
        <td>${a.status === "pass" ? "✅" : a.status === "fail" ? "❌" : "⚠️"}</td>
      </tr>`,
      )
      .join("\n");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Atomiq AI — Test Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 2rem; background: #0d1117; color: #c9d1d9; }
    h1 { color: #58a6ff; border-bottom: 1px solid #30363d; padding-bottom: 0.5rem; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin: 1.5rem 0; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 1.2rem; text-align: center; }
    .card .value { font-size: 2rem; font-weight: 700; color: #58a6ff; }
    .card .label { font-size: 0.85rem; color: #8b949e; margin-top: 0.3rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
    th { background: #161b22; padding: 0.75rem; text-align: left; border-bottom: 1px solid #30363d; }
    td { padding: 0.75rem; border-bottom: 1px solid #21262d; }
    tr.pass td:first-child { border-left: 3px solid #3fb950; }
    tr.fail td:first-child { border-left: 3px solid #f85149; }
    tr.partial td:first-child { border-left: 3px solid #d29922; }
    .footer { margin-top: 2rem; font-size: 0.8rem; color: #484f58; }
  </style>
</head>
<body>
  <h1>🧪 Atomiq AI — Test Execution Report</h1>
  <p style="color:#8b949e">${summary.timestamp}</p>

  <div class="summary">
    <div class="card"><div class="value">${summary.totalTests}</div><div class="label">Total Tests</div></div>
    <div class="card"><div class="value" style="color:#3fb950">${summary.passed}</div><div class="label">Passed</div></div>
    <div class="card"><div class="value" style="color:#f85149">${summary.failed}</div><div class="label">Failed</div></div>
    <div class="card"><div class="value">${summary.passRate}</div><div class="label">Pass Rate</div></div>
  </div>

  <h2>Agent Results</h2>
  <table>
    <thead><tr><th>Agent</th><th>Tests</th><th>Passed</th><th>Failed</th><th>Duration</th><th>Status</th></tr></thead>
    <tbody>${agentRows}</tbody>
  </table>

  <p class="footer">Generated by Atomiq AI Report Agent • Duration: ${summary.duration}</p>
</body>
</html>`;

    this.ensureReportDir();
    const filePath = path.join(this.reportDir, "report.html");
    fs.writeFileSync(filePath, html, "utf-8");

    return {
      success: true,
      data: { file: filePath, format: "html", summary },
      metrics: { duration: Date.now() - startTime },
    };
  }

  /**
   * Export results as a Markdown report.
   */
  private async exportMarkdown(
    results: Array<{ agent: string; success: boolean; metrics?: any }>,
    startTime: number,
  ): Promise<TaskResult> {
    const summaryResult = await this.generateSummary(results, startTime);
    const summary = summaryResult.data as TestRunSummary;

    const agentTable = summary.agents
      .map(
        (a) =>
          `| ${a.agent} | ${a.tests} | ${a.passed} | ${a.failed} | ${a.duration} | ${a.status === "pass" ? "✅" : "❌"} |`,
      )
      .join("\n");

    const md = `# Atomiq AI — Test Execution Report

**Generated:** ${summary.timestamp}  
**Duration:** ${summary.duration}

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | ${summary.totalTests} |
| Passed | ${summary.passed} |
| Failed | ${summary.failed} |
| Pass Rate | ${summary.passRate} |

## Agent Results

| Agent | Tests | Passed | Failed | Duration | Status |
|-------|-------|--------|--------|----------|--------|
${agentTable}

---
*Generated by Atomiq AI Report Agent*
`;

    this.ensureReportDir();
    const filePath = path.join(this.reportDir, "report.md");
    fs.writeFileSync(filePath, md, "utf-8");

    return {
      success: true,
      data: { file: filePath, format: "markdown", summary },
      metrics: { duration: Date.now() - startTime },
    };
  }

  /**
   * Analyze trends from previously stored run summaries.
   */
  private async trendAnalysis(startTime: number): Promise<TaskResult> {
    const historyFile = path.join(this.reportDir, "history.json");

    let runs: Array<{
      date: string;
      passRate: number;
      totalTests: number;
      duration: number;
    }> = [];

    if (fs.existsSync(historyFile)) {
      try {
        runs = JSON.parse(fs.readFileSync(historyFile, "utf-8"));
      } catch {
        runs = [];
      }
    }

    if (runs.length === 0) {
      return {
        success: true,
        data: {
          runs: [],
          trend: "stable",
          avgPassRate: 0,
          note: "No historical data yet — run generate-summary to collect data",
        },
        metrics: { duration: Date.now() - startTime },
      };
    }

    const avgPassRate =
      runs.reduce((sum, r) => sum + r.passRate, 0) / runs.length;

    // Determine trend from last 5 runs
    const recent = runs.slice(-5);
    let trend: "improving" | "declining" | "stable" = "stable";
    if (recent.length >= 2) {
      const first = recent[0].passRate;
      const last = recent[recent.length - 1].passRate;
      if (last - first > 5) trend = "improving";
      else if (first - last > 5) trend = "declining";
    }

    const trendData: TrendData = { runs: recent, trend, avgPassRate };

    return {
      success: true,
      data: trendData,
      metrics: { duration: Date.now() - startTime },
    };
  }

  /**
   * Persist a run summary for trend tracking.
   */
  private persistRun(summary: TestRunSummary): void {
    this.ensureReportDir();
    const historyFile = path.join(this.reportDir, "history.json");

    let history: Array<{
      date: string;
      passRate: number;
      totalTests: number;
      duration: number;
    }> = [];

    if (fs.existsSync(historyFile)) {
      try {
        history = JSON.parse(fs.readFileSync(historyFile, "utf-8"));
      } catch {
        history = [];
      }
    }

    const passRate =
      summary.totalTests > 0 ? (summary.passed / summary.totalTests) * 100 : 0;

    history.push({
      date: summary.timestamp,
      passRate,
      totalTests: summary.totalTests,
      duration: parseFloat(summary.duration),
    });

    // Keep last 50 runs
    if (history.length > 50) {
      history = history.slice(-50);
    }

    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2), "utf-8");
  }

  private ensureReportDir(): void {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  protected onStart(): void {
    console.log(
      "[ReportAgent] Specialist started — ready for report generation",
    );
  }
}
