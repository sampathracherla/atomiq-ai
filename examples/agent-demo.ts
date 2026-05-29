/**
 * Atomiq AI — Agent Demo (Phase 5)
 *
 * Demonstrates full multi-agent orchestration:
 * 1. Create message bus & registry
 * 2. Register supervisor + all specialist agents (Web, API, Mobile, SAP, Planner, Healer, Report)
 * 3. Run individual agent tasks
 * 4. AI Planner generates test plans
 * 5. Healer diagnoses failures
 * 6. Report Agent generates HTML/Markdown dashboards
 *
 * Usage:
 *   npx tsx examples/agent-demo.ts            # Run all agents
 *   npx tsx examples/agent-demo.ts web        # Run only WebAgent
 *   npx tsx examples/agent-demo.ts api        # Run only ApiAgent
 *   npx tsx examples/agent-demo.ts mobile     # Run only MobileAgent
 *   npx tsx examples/agent-demo.ts sap        # Run only SapAgent
 *   npx tsx examples/agent-demo.ts planner    # Run only PlannerAgent
 *   npx tsx examples/agent-demo.ts healer     # Run only HealerAgent
 *   npx tsx examples/agent-demo.ts report     # Run only ReportAgent
 */

import {
  MessageBus,
  AgentRegistry,
  SupervisorAgent,
  WebAgent,
  ApiAgent,
  MobileAgent,
  SapAgent,
  PlannerAgent,
  HealerAgent,
  ReportAgent,
} from "../src/agents";
import type { Task } from "../src/agents";
import * as path from "path";

function printHeader(title: string) {
  console.log(`\n─── ${title} ───\n`);
}

function printResult(agentName: string, result: any) {
  const status = result.success ? "✅ PASSED" : "❌ FAILED";
  const metrics = result.metrics
    ? `(${result.metrics.testsPassed}/${result.metrics.testsRun} passed in ${(result.metrics.duration / 1000).toFixed(1)}s)`
    : "";
  console.log(`  ${agentName}: ${status} ${metrics}`);
  if (result.error) {
    console.log(`    Error: ${result.error}`);
  }
}

async function main() {
  const filter = process.argv[2]?.toLowerCase();
  const validFilters = [
    "web",
    "api",
    "mobile",
    "sap",
    "planner",
    "healer",
    "report",
  ];
  if (filter && !validFilters.includes(filter)) {
    console.error(
      `Usage: npx tsx examples/agent-demo.ts [${validFilters.join("|")}]`,
    );
    process.exit(1);
  }

  const runAgent = (name: string) => !filter || filter === name;

  console.log("═══════════════════════════════════════════════════════════");
  console.log("  ATOMIQ AI — Multi-Agent Orchestration Demo (Phase 5)");
  console.log(
    `  ${filter ? `Running: ${filter} agent only` : "Running: all agents"}`,
  );
  console.log("═══════════════════════════════════════════════════════════\n");

  // 1. Create infrastructure
  const bus = new MessageBus();
  const registry = new AgentRegistry(bus);

  // 2. Create and register ALL agents
  const projectRoot = path.resolve(__dirname, "..");
  const supervisor = new SupervisorAgent(bus, registry);
  const webAgent = new WebAgent(bus, projectRoot);
  const apiAgent = new ApiAgent(bus, projectRoot);
  const mobileAgent = new MobileAgent(bus, projectRoot);
  const sapAgent = new SapAgent(bus, projectRoot);
  const plannerAgent = new PlannerAgent(bus);
  const healerAgent = new HealerAgent(bus, projectRoot);
  const reportAgent = new ReportAgent(bus, projectRoot);

  registry.register(supervisor);
  registry.register(webAgent);
  registry.register(apiAgent);
  registry.register(mobileAgent);
  registry.register(sapAgent);
  registry.register(plannerAgent);
  registry.register(healerAgent);
  registry.register(reportAgent);

  // 3. Start all agents
  registry.startAll();

  console.log("✓ Agents registered and started:");
  for (const agent of registry.listAgents()) {
    console.log(
      `  • ${agent.role} — ${agent.capabilities.map((c) => c.name).join(", ")}`,
    );
  }

  // ──── Individual Agent Tasks ────

  const results: { name: string; result: any }[] = [];

  if (runAgent("web")) {
    printHeader("Task: Web Tests (SauceDemo)");
    const webResult = await webAgent.perform({
      id: `web_${Date.now()}`,
      type: "run-spec",
      description: "Run SauceDemo e-commerce tests",
      status: "pending",
      input: {
        command: "run-spec",
        specFile: "examples/saucedemo-test.spec.ts",
      },
      createdAt: Date.now(),
    });
    printResult("WebAgent", webResult);
    results.push({ name: "Web", result: webResult });
  }

  if (runAgent("api")) {
    printHeader("Task: API Tests (REST endpoints)");
    const apiResult = await apiAgent.perform({
      id: `api_${Date.now()}`,
      type: "run-all",
      description: "Run all API tests",
      status: "pending",
      input: { command: "run-all" },
      createdAt: Date.now(),
    });
    printResult("ApiAgent", apiResult);
    results.push({ name: "API", result: apiResult });
  }

  if (runAgent("mobile")) {
    printHeader("Task: Mobile Tests (Device viewports)");
    const mobileResult = await mobileAgent.perform({
      id: `mobile_${Date.now()}`,
      type: "run-all",
      description: "Run all mobile/responsive tests",
      status: "pending",
      input: { command: "run-all" },
      createdAt: Date.now(),
    });
    printResult("MobileAgent", mobileResult);
    results.push({ name: "Mobile", result: mobileResult });
  }

  if (runAgent("sap")) {
    printHeader("Task: SAP Connectivity Check");
    const sapResult = await sapAgent.perform({
      id: `sap_${Date.now()}`,
      type: "check-connection",
      description: "Check SAP system connectivity",
      status: "pending",
      input: { command: "check-connection" },
      createdAt: Date.now(),
    });
    const sapStatus = sapResult.success ? "✅ Connected" : "⚠️  Not configured";
    console.log(`  SapAgent: ${sapStatus}`);
    if (sapResult.data) {
      console.log(`    ${JSON.stringify(sapResult.data)}`);
    }
  }

  if (runAgent("planner")) {
    printHeader("Task: AI Test Planning (E-Commerce Checkout)");
    const planResult = await plannerAgent.perform({
      id: `plan_${Date.now()}`,
      type: "generate-plan",
      description: "Generate test plan for checkout flow",
      status: "pending",
      input: {
        command: "generate-plan",
        feature: "E-Commerce Checkout",
        description:
          "User adds items to cart, proceeds to checkout, fills shipping and payment, completes order",
        appType: "web",
      },
      createdAt: Date.now(),
    });
    const plan = planResult.data as any;
    console.log(
      `  PlannerAgent: ✅ Generated ${plan?.items?.length || 0} test cases`,
    );
    if (plan?.items) {
      for (const item of plan.items.slice(0, 5)) {
        console.log(`    • [${item.priority}] ${item.title}`);
      }
      if (plan.items.length > 5) {
        console.log(`    ... and ${plan.items.length - 5} more`);
      }
    }
    console.log(`    Estimated duration: ${plan?.estimatedDuration}`);
  }

  if (runAgent("healer")) {
    printHeader("Task: Failure Diagnosis");
    const healResult = await healerAgent.perform({
      id: `heal_${Date.now()}`,
      type: "diagnose",
      description: "Diagnose a timeout failure",
      status: "pending",
      input: {
        command: "diagnose",
        errorMessage:
          "locator.click: Timeout 30000ms exceeded. Waiting for locator('#submit-btn').click()",
        testFile: "examples/checkout.spec.ts",
      },
      createdAt: Date.now(),
    });
    const diagnosis = healResult.data as any;
    console.log(`  HealerAgent: ✅ Diagnosis complete`);
    console.log(`    Error Type:   ${diagnosis?.errorType}`);
    console.log(`    Root Cause:   ${diagnosis?.rootCause}`);
    console.log(`    Suggestion:   ${diagnosis?.suggestion}`);
    console.log(`    Auto-fixable: ${diagnosis?.autoFixable ? "Yes" : "No"}`);
    console.log(
      `    Confidence:   ${((diagnosis?.confidence || 0) * 100).toFixed(0)}%`,
    );
  }

  // ──── Report Agent: Generate Reports ────

  if (runAgent("report") || (!filter && results.length > 0)) {
    printHeader("Task: Report Generation");

    // Build agent results for report
    const reportInput = results.map(({ name, result }) => ({
      agent: name,
      success: result.success,
      metrics: result.metrics,
    }));

    // Generate summary
    const summaryResult = await reportAgent.perform({
      id: `report_summary_${Date.now()}`,
      type: "generate-summary",
      description: "Generate test execution summary",
      status: "pending",
      input: { command: "generate-summary", results: reportInput },
      createdAt: Date.now(),
    });
    const summary = summaryResult.data as any;
    console.log(`  ReportAgent: ✅ Summary generated`);
    console.log(
      `    Total: ${summary?.totalTests} | Passed: ${summary?.passed} | Failed: ${summary?.failed} | Rate: ${summary?.passRate}`,
    );

    // Export HTML
    const htmlResult = await reportAgent.perform({
      id: `report_html_${Date.now()}`,
      type: "export-html",
      description: "Export HTML report dashboard",
      status: "pending",
      input: { command: "export-html", results: reportInput },
      createdAt: Date.now(),
    });
    const htmlData = htmlResult.data as any;
    console.log(`    HTML Report: ${htmlData?.file}`);

    // Export Markdown
    const mdResult = await reportAgent.perform({
      id: `report_md_${Date.now()}`,
      type: "export-markdown",
      description: "Export Markdown report",
      status: "pending",
      input: { command: "export-markdown", results: reportInput },
      createdAt: Date.now(),
    });
    const mdData = mdResult.data as any;
    console.log(`    Markdown Report: ${mdData?.file}`);

    // Trend analysis
    const trendResult = await reportAgent.perform({
      id: `report_trend_${Date.now()}`,
      type: "trend-analysis",
      description: "Analyze pass rate trends",
      status: "pending",
      input: { command: "trend-analysis" },
      createdAt: Date.now(),
    });
    const trend = trendResult.data as any;
    console.log(
      `    Trend: ${trend?.trend} (avg pass rate: ${trend?.avgPassRate?.toFixed(1) || 0}%)`,
    );
  }

  // ──── Summary ────

  printHeader("Regression Summary");

  let totalPassed = 0;
  let totalFailed = 0;
  let totalDuration = 0;

  for (const { name, result } of results) {
    if (result.metrics) {
      totalPassed += result.metrics.testsPassed;
      totalFailed += result.metrics.testsFailed;
      totalDuration += result.metrics.duration;
    }
  }

  console.log(`  Total Tests:   ${totalPassed + totalFailed}`);
  console.log(`  Passed:        ${totalPassed}`);
  console.log(`  Failed:        ${totalFailed}`);
  console.log(`  Duration:      ${(totalDuration / 1000).toFixed(1)}s`);
  console.log(
    `  Pass Rate:     ${totalPassed + totalFailed > 0 ? ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(0) : 0}%`,
  );

  // ──── System Status ────

  printHeader("System Status");
  for (const agent of registry.listAgents()) {
    console.log(
      `  ${agent.role}: state=${agent.status.state}, completed=${agent.status.completedTasks}, failed=${agent.status.failedTasks}`,
    );
  }

  printHeader("Message Bus (last 10 messages)");
  const history = bus.getHistory(10);
  for (const msg of history) {
    console.log(`  [${msg.type}] ${msg.from} → ${msg.to}`);
  }

  // Cleanup
  registry.stopAll();
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  Demo complete — all agents stopped");
  console.log("═══════════════════════════════════════════════════════════");
}

main().catch(console.error);
