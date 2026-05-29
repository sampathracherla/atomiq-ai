/**
 * AI-powered test data generator — creates realistic test data using templates,
 * patterns, and LLM generation for complex scenarios.
 */

import type { DataGenerationRequest, GeneratedData } from "../core/types";
import { Logger } from "../core/logger";
import { aiEngine } from "../ai/ai-engine";

const log = new Logger("DataGenerator");

// ─── Built-in data patterns ─────────────────────────────────────────

const PATTERNS: Record<string, () => string> = {
  firstName: () =>
    pick([
      "James",
      "Mary",
      "Robert",
      "Patricia",
      "John",
      "Jennifer",
      "Michael",
      "Linda",
      "David",
      "Sarah",
    ]),
  lastName: () =>
    pick([
      "Smith",
      "Johnson",
      "Williams",
      "Brown",
      "Jones",
      "Garcia",
      "Miller",
      "Davis",
      "Wilson",
      "Anderson",
    ]),
  email: () =>
    `${rand("user", 8)}@${pick(["example.com", "test.com", "corp.net"])}`,
  phone: () => `+1${randDigits(10)}`,
  address: () =>
    `${randNum(1, 9999)} ${pick(["Main", "Oak", "Elm", "Pine", "Maple"])} ${pick(["St", "Ave", "Blvd", "Dr"])}`,
  city: () =>
    pick([
      "New York",
      "Los Angeles",
      "Chicago",
      "Houston",
      "Phoenix",
      "Philadelphia",
      "San Antonio",
      "San Diego",
    ]),
  state: () =>
    pick(["CA", "TX", "FL", "NY", "PA", "IL", "OH", "GA", "NC", "MI"]),
  zipCode: () => randDigits(5),
  country: () =>
    pick(["US", "UK", "DE", "FR", "JP", "CA", "AU", "IN", "BR", "MX"]),
  date: () => randomDate().toISOString().split("T")[0],
  dateTime: () => randomDate().toISOString(),
  boolean: () => String(Math.random() > 0.5),
  integer: () => String(randNum(1, 10000)),
  decimal: () => (Math.random() * 10000).toFixed(2),
  currency: () => `${(Math.random() * 10000).toFixed(2)}`,
  percentage: () => `${randNum(0, 100)}`,
  uuid: () =>
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    }),
  companyName: () =>
    `${pick(["Acme", "Global", "Tech", "Alpha", "Beta", "Omega", "Summit", "Prime"])} ${pick(["Corp", "Inc", "LLC", "Solutions", "Industries", "Systems"])}`,
  productName: () =>
    `${pick(["Pro", "Ultra", "Max", "Elite", "Premium", "Basic"])} ${pick(["Widget", "Gadget", "Module", "Component", "Device", "Tool"])}`,
  sku: () => `SKU-${randDigits(4)}-${rand("", 2).toUpperCase()}`,
  // SAP-specific
  materialNumber: () => `MAT${randDigits(6)}`,
  purchaseOrder: () => `PO${randDigits(8)}`,
  salesOrder: () => `SO${randDigits(8)}`,
  vendor: () => `V${randDigits(6)}`,
  costCenter: () => `CC${randDigits(4)}`,
  plant: () => randDigits(4),
  storageLocation: () => randDigits(4),
};

export class DataGenerator {
  /**
   * Generate test data from a schema.
   */
  async generate(request: DataGenerationRequest): Promise<GeneratedData> {
    const count = request.count ?? 1;

    if (request.useAI && typeof request.schema === "string") {
      return this.generateWithAI(request);
    }

    const schema =
      typeof request.schema === "string"
        ? this.parseSchemaDescription(request.schema)
        : request.schema;

    const data: Record<string, unknown>[] = [];
    for (let i = 0; i < count; i++) {
      data.push(this.generateRecord(schema));
    }

    return { data, schema };
  }

  /**
   * Generate a single record from a schema.
   */
  private generateRecord(
    schema: Record<string, unknown>,
  ): Record<string, unknown> {
    const record: Record<string, unknown> = {};
    for (const [key, type] of Object.entries(schema)) {
      if (typeof type === "string" && PATTERNS[type]) {
        record[key] = PATTERNS[type]();
      } else if (typeof type === "object" && type !== null) {
        record[key] = this.generateRecord(type as Record<string, unknown>);
      } else {
        record[key] = type; // Static value
      }
    }
    return record;
  }

  /**
   * Parse a natural language schema description into a structured schema.
   */
  private parseSchemaDescription(description: string): Record<string, string> {
    const schema: Record<string, string> = {};
    const fieldPatterns: Array<[RegExp, string]> = [
      [/\b(first\s*name)\b/i, "firstName"],
      [/\b(last\s*name|surname)\b/i, "lastName"],
      [/\b(email)\b/i, "email"],
      [/\b(phone|mobile|tel)\b/i, "phone"],
      [/\b(address|street)\b/i, "address"],
      [/\b(city|town)\b/i, "city"],
      [/\b(state|province)\b/i, "state"],
      [/\b(zip|postal)\b/i, "zipCode"],
      [/\b(country)\b/i, "country"],
      [/\b(date)\b/i, "date"],
      [/\b(company|organization)\b/i, "companyName"],
      [/\b(product)\b/i, "productName"],
      [/\b(sku|item.?number)\b/i, "sku"],
      [/\b(price|amount|cost)\b/i, "currency"],
      [/\b(quantity|qty|count)\b/i, "integer"],
      [/\b(material)\b/i, "materialNumber"],
      [/\b(purchase.?order|po)\b/i, "purchaseOrder"],
      [/\b(sales.?order|so)\b/i, "salesOrder"],
      [/\b(vendor|supplier)\b/i, "vendor"],
    ];

    for (const [pattern, fieldType] of fieldPatterns) {
      if (pattern.test(description)) {
        const fieldName = fieldType
          .replace(/([A-Z])/g, "_$1")
          .toLowerCase()
          .replace(/^_/, "");
        schema[fieldName] = fieldType;
      }
    }

    // If no fields matched, use AI or return basic schema
    if (Object.keys(schema).length === 0) {
      schema["id"] = "uuid";
      schema["name"] = "firstName";
      schema["value"] = "integer";
    }

    return schema;
  }

  /**
   * Use AI to generate complex, contextual test data.
   */
  private async generateWithAI(
    request: DataGenerationRequest,
  ): Promise<GeneratedData> {
    log.info("Generating test data with AI");

    const prompt = `Generate ${request.count ?? 1} records of test data based on this description:
${request.schema}

${request.constraints?.length ? `Constraints:\n${request.constraints.join("\n")}` : ""}
${request.locale ? `Locale: ${request.locale}` : ""}

Return a JSON object with:
- "schema": object describing the field types
- "data": array of generated records

Use realistic but fake data. Do not use real personal information.`;

    try {
      const result = await aiEngine.diagnoseFailure({
        testName: "Data Generation",
        errorMessage: prompt,
      });
      // This is a workaround - ideally we'd use promptJSON directly
      return JSON.parse(result.suggestedFix) as GeneratedData;
    } catch {
      log.warn("AI data generation failed, using pattern-based fallback");
      const schema = this.parseSchemaDescription(request.schema as string);
      const data = [];
      for (let i = 0; i < (request.count ?? 1); i++) {
        data.push(this.generateRecord(schema));
      }
      return { data, schema };
    }
  }
}

// ─── Utility helpers ─────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(prefix: string, length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  let result = prefix;
  for (let i = 0; i < length; i++)
    result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

function randDigits(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) result += Math.floor(Math.random() * 10);
  return result;
}

function randNum(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(): Date {
  const start = new Date(2020, 0, 1).getTime();
  const end = new Date(2026, 11, 31).getTime();
  return new Date(start + Math.random() * (end - start));
}
