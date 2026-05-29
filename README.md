# Atomiq AI

> AI-powered enterprise test automation framework with **agentic orchestration** — Web, API, SAP, and Mobile.
>
> **Author:** Sampath Racherla

Built on **Playwright** with pluggable **AI/LLM providers** (OpenAI, Azure OpenAI, Google Gemini, Anthropic Claude), **multi-agent orchestration**, **self-healing selectors**, **visual regression testing**, **smart test data generation**, and **intelligent reporting**.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         Atomiq AI                             │
├──────────────────────────────────────────────────────────────┤
│  Agentic Orchestration Layer                                 │
│  ┌────────────┐  ┌──────┐  ┌─────┐  ┌────────┐  ┌─────┐   │
│  │ Supervisor │→ │ Web  │  │ API │  │ Mobile │  │ SAP │   │
│  │   Agent    │  │Agent │  │Agent│  │ Agent  │  │Agent│   │
│  └────────────┘  └──────┘  └─────┘  └────────┘  └─────┘   │
│  MessageBus (pub/sub + request/reply) │ AgentRegistry        │
├──────────────────────────────────────────────────────────────┤
│  Fixtures Layer (test, expect, ai, web, api, sap, mobile)    │
├──────────┬───────────┬──────────────┬────────────────────────┤
│  Web     │  API      │  SAP/UI5     │  Mobile                │
│  Adapter │  Adapter  │  Adapter     │  Adapter               │
├──────────┴───────────┴──────────────┴────────────────────────┤
│  Self-Healing Engine  │  Visual Regression  │  Data Generator │
├───────────────────────┴─────────────────────┴────────────────┤
│  AI Engine (Pluggable Providers: OpenAI / Azure / Gemini / Claude)    │
├──────────────────────────────────────────────────────────────┤
│  Core: Config · Logger · Plugin Manager · Types              │
└──────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Install

```bash
cd "Atomiq AI"
npm install
```

### 2. Run the Agent Demo

```bash
# Run all agents (Web + API + Mobile + SAP)
npx tsx examples/agent-demo.ts

# Run a single agent
npx tsx examples/agent-demo.ts web
npx tsx examples/agent-demo.ts api
npx tsx examples/agent-demo.ts mobile
npx tsx examples/agent-demo.ts sap
```

**Sample output:**

```
═══════════════════════════════════════════════════════════
  ATOMIQ AI — Multi-Agent Orchestration Demo (Phase 3)
  Running: all agents
═══════════════════════════════════════════════════════════

✓ Agents registered and started:
  • supervisor — orchestrate, run-regression, run-suite, system-status
  • web — run-all, run-spec, run-grep, list-specs
  • api — run-all, run-spec, run-grep
  • mobile — run-all, run-spec, run-device
  • sap — run-all, run-spec, run-transaction, check-connection

  WebAgent: ✅ PASSED (5/5 passed in 9.3s)
  ApiAgent: ✅ PASSED (5/5 passed in 8.2s)
  MobileAgent: ✅ PASSED (3/3 passed in 7.1s)
  SapAgent: ⚠️  Not configured

  Total Tests:   13
  Passed:        13
  Pass Rate:     100%
```

### 3. Run Tests Directly

```bash
npx playwright test
```

---

## Agentic Orchestration

The framework uses a **Supervisor pattern** where a central orchestrator delegates work to specialist agents:

| Agent               | Role                      | Capabilities                                                  |
| ------------------- | ------------------------- | ------------------------------------------------------------- |
| **SupervisorAgent** | Orchestrator              | `orchestrate`, `run-regression`, `run-suite`, `system-status` |
| **WebAgent**        | Browser testing           | `run-all`, `run-spec`, `run-grep`, `list-specs`               |
| **ApiAgent**        | REST/GraphQL testing      | `run-all`, `run-spec`, `run-grep`                             |
| **MobileAgent**     | Device/responsive testing | `run-all`, `run-spec`, `run-device`                           |
| **SapAgent**        | SAP Fiori/UI5 testing     | `run-all`, `run-spec`, `run-transaction`, `check-connection`  |

### Agent Communication

Agents communicate via a **MessageBus** with pub/sub and request/reply patterns:

```typescript
import {
  MessageBus,
  AgentRegistry,
  SupervisorAgent,
  WebAgent,
  ApiAgent,
} from "./src/agents";

const bus = new MessageBus();
const registry = new AgentRegistry(bus);

const supervisor = new SupervisorAgent(bus, registry);
const webAgent = new WebAgent(bus, projectRoot);
const apiAgent = new ApiAgent(bus, projectRoot);

registry.register(supervisor);
registry.register(webAgent);
registry.register(apiAgent);
registry.startAll();

// Run tests via an agent
const result = await webAgent.perform({
  id: "task_1",
  type: "run-spec",
  description: "Run e-commerce tests",
  status: "pending",
  input: { command: "run-spec", specFile: "examples/saucedemo-test.spec.ts" },
  createdAt: Date.now(),
});
```

---

## Features

### Pluggable AI Providers

Switch AI providers without changing test code:

| Provider         | Config `type`  | Required Env Vars           |
| ---------------- | -------------- | --------------------------- |
| OpenAI           | `openai`       | `AI_API_KEY`                |
| Azure OpenAI     | `azure-openai` | `AI_API_KEY`, `AI_ENDPOINT` |
| Google Gemini    | `gemini`       | `AI_API_KEY`                |
| Anthropic Claude | `claude`       | `AI_API_KEY`                |
| Custom           | `custom`       | (your implementation)       |

```typescript
// Switch providers at runtime
ai.engine.setActiveProvider("gemini");
```

### Self-Healing Selectors

When a selector breaks (due to UI changes), the framework automatically heals it using 4 strategies:

1. **Attribute Fallback** — tries cached alternatives and attribute variations
2. **Text Content** — finds element by text/aria-label
3. **Structural Similarity** — partial ID matching, DOM position
4. **AI-Assisted** — uses LLM to analyze page and find the element

```typescript
// Enable per-action
await web.click('#my-button', { selfHeal: true });

// Or globally via config
{ "healing": { "enabled": true, "useAI": true } }
```

### Visual Regression Testing

```typescript
test("visual check", async ({ visual }) => {
  const result = await visual.compare("homepage", {
    threshold: 0.05, // 5% diff allowed
    autoBaseline: true, // Create baseline if missing
    ignoreRegions: [
      // Mask dynamic areas
      { x: 0, y: 0, width: 200, height: 50 },
    ],
  });

  expect(result.match).toBe(true);
  if (!result.match) {
    console.log(`Diff: ${(result.diffPercentage * 100).toFixed(2)}%`);
  }
});
```

### AI Test Generation

Generate tests from natural language:

```typescript
test("generate from description", async ({ ai }) => {
  const generated = await ai.generateTest({
    description: "Test adding items to cart, verifying total, and checking out",
    appType: "web",
    targetUrl: "https://shop.example.com",
  });

  console.log(generated.code); // Full Playwright test
  console.log(generated.steps); // Extracted steps
  console.log(generated.confidence); // Confidence score
});
```

### Smart Test Data Generation

```typescript
// Pattern-based (no AI needed)
const { data } = await dataGen.generate({
  schema: {
    name: "firstName",
    email: "email",
    company: "companyName",
    amount: "currency",
    sku: "sku",
    po: "purchaseOrder", // SAP-specific patterns
  },
  count: 10,
});

// AI-powered (complex scenarios)
const { data } = await dataGen.generate({
  schema: "Generate realistic customer orders for a manufacturing company",
  count: 5,
  constraints: ["total > 1000", "include at least 3 line items"],
  useAI: true,
});
```

### Enterprise Adapters

#### Web Adapter

```typescript
test("web test", async ({ web }) => {
  await web.navigate("/dashboard");
  await web.click('[data-testid="create"]');
  await web.fill("#name", "Test");
  await web.selectOption("#category", "Premium");
  const title = await web.getPageTitle();
});
```

#### API Adapter

```typescript
test("api test", async ({ apiClient }) => {
  const users = await apiClient.get("/api/users");
  expect(users.status).toBe(200);

  const created = await apiClient.post("/api/users", { name: "New User" });
  expect(created.status).toBe(201);
});
```

#### SAP Adapter

```typescript
test("sap test", async ({ sap }) => {
  await sap.waitForUI5();
  await sap.navigateToTile("Manage Purchase Orders");
  await sap.pressButton({ text: "Create" });
  await sap.setInputValue({ id: "vendor", value: "V001" });
  const rows = await sap.getTableData("orderTable");
});
```

#### Mobile Adapter

```typescript
test("mobile test", async ({ mobile }) => {
  await mobile.emulateDevice("iphone-14");
  const layout = await mobile.getLayoutMode(); // 'mobile'
  await mobile.tap(".menu-toggle");
  await mobile.swipe("down", 300);
});
```

### AI-Powered Reporting

```typescript
import { ReportGenerator } from "atomiq-ai";

const reporter = new ReportGenerator({
  format: "html",
  outputDir: "./reports",
  includeAIAnalysis: true,
  includeHealingLog: true,
});

// Generates an interactive HTML report with:
// - Pass/fail dashboard
// - AI root cause analysis for failures
// - Self-healing event log
// - Pattern detection (flaky tests, slow tests)
// - Actionable recommendations
```

### Plugin System

Extend the framework with custom plugins:

```typescript
import { pluginManager } from "atomiq-ai";

pluginManager.register({
  name: "my-logging-plugin",
  version: "1.0.0",
  async onBeforeAction(action, selector) {
    console.log(`Action: ${action} on ${selector}`);
  },
  async onHealing(result) {
    // Send healing alerts to Slack, etc.
  },
});
```

---

## Configuration Reference

| Setting               | Type                                         | Default  | Description                        |
| --------------------- | -------------------------------------------- | -------- | ---------------------------------- |
| `ai.type`             | `openai \| azure-openai \| gemini \| claude` | `openai` | AI provider                        |
| `ai.apiKey`           | `string`                                     | —        | API key (use env var `AI_API_KEY`) |
| `ai.model`            | `string`                                     | `gpt-4o` | Model name                         |
| `appType`             | `web \| api \| sap \| mobile`                | `web`    | Default app type                   |
| `baseUrl`             | `string`                                     | —        | Application URL                    |
| `healing.enabled`     | `boolean`                                    | `true`   | Enable self-healing                |
| `healing.useAI`       | `boolean`                                    | `true`   | Use AI for healing                 |
| `healing.maxAttempts` | `number`                                     | `3`      | Max healing retries                |
| `visual.enabled`      | `boolean`                                    | `false`  | Enable visual testing              |
| `visual.threshold`    | `number`                                     | `0.1`    | Diff threshold (0-1)               |
| `reporting.format`    | `html \| json \| markdown`                   | `html`   | Report format                      |
| `logLevel`            | `debug \| info \| warn \| error`             | `info`   | Log verbosity                      |

---

## Available Fixtures

| Fixture     | Description                                         |
| ----------- | --------------------------------------------------- |
| `config`    | Framework configuration                             |
| `ai`        | AI engine — test generation, enhancement, diagnosis |
| `web`       | Web adapter — navigate, click, fill, discover       |
| `apiClient` | API adapter — GET, POST, PUT, DELETE                |
| `sap`       | SAP adapter — UI5 controls, Fiori navigation        |
| `mobile`    | Mobile adapter — device emulation, gestures         |
| `healing`   | Self-healing — manual heal, statistics              |
| `visual`    | Visual testing — compare, update baselines          |
| `dataGen`   | Data generator — patterns, AI-powered               |

---

## Project Structure

```
Atomiq AI/
├── src/
│   ├── agents/                # Agentic orchestration layer
│   │   ├── types.ts           # Agent roles, messages, task types
│   │   ├── message-bus.ts     # Pub/sub + request/reply communication
│   │   ├── base-agent.ts      # Abstract base class for all agents
│   │   ├── agent-registry.ts  # Agent discovery & lifecycle
│   │   ├── supervisor.ts      # Orchestrator agent
│   │   ├── web-agent.ts       # Browser testing specialist
│   │   ├── api-agent.ts       # REST/GraphQL testing specialist
│   │   ├── mobile-agent.ts    # Device viewport testing specialist
│   │   ├── sap-agent.ts       # SAP Fiori/UI5 testing specialist
│   │   └── index.ts           # Barrel exports
│   ├── core/                  # Config, types, logger, plugins
│   ├── ai/
│   │   ├── providers/         # OpenAI, Azure, Gemini, Claude
│   │   ├── prompts/           # Prompt templates
│   │   └── ai-engine.ts       # AI orchestration
│   ├── adapters/              # Web, API, SAP, Mobile
│   ├── healing/               # Self-healing engine + cache
│   ├── visual/                # Screenshot comparison + AI
│   ├── data/                  # Test data generation
│   ├── reporting/             # Report generation + analysis
│   ├── fixtures/              # Playwright fixtures
│   └── index.ts               # Public API
├── examples/
│   ├── agent-demo.ts          # Multi-agent orchestration demo
│   ├── saucedemo-test.spec.ts # E-commerce tests (5 passing)
│   ├── api-test.spec.ts       # REST API tests (5 passing)
│   ├── mobile-test.spec.ts    # Responsive tests (3 passing)
│   └── pages/                 # Page Object Models
├── package.json
├── tsconfig.json
├── playwright.config.ts
└── README.md
```

## License

MIT
