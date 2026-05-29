/**
 * SAP adapter — handles SAP Fiori/UI5 applications.
 * Integrates with dhikraft when available, falls back to Playwright evaluate.
 */

import type {
  AppType,
  AdapterContext,
  ActionOptions,
  ElementInfo,
} from "../core/types";
import { AbstractAdapter } from "./base-adapter";
import * as crypto from "crypto";

export class SAPAdapter extends AbstractAdapter {
  readonly appType: AppType = "sap";
  private useDhikraft: boolean = false;

  async initialize(context: AdapterContext): Promise<void> {
    await super.initialize(context);
    this.useDhikraft = context.config.sap?.useDhikraft ?? false;

    if (this.useDhikraft) {
      this.log.info("SAP adapter using dhikraft fixtures");
    } else {
      this.log.info("SAP adapter using Playwright evaluate for UI5 controls");
    }
  }

  /**
   * Find a UI5 control by control type and properties.
   */
  async findUI5Control(params: {
    controlType?: string;
    id?: string | RegExp;
    properties?: Record<string, unknown>;
  }): Promise<string> {
    const script = this.buildUI5FindScript(params);
    const elementId = await this.page.evaluate(script);
    if (!elementId)
      throw new Error(`UI5 control not found: ${JSON.stringify(params)}`);
    return `#${elementId}`;
  }

  /**
   * Press a UI5 button.
   */
  async pressButton(params: {
    text?: string;
    id?: string;
    controlType?: string;
  }): Promise<void> {
    const selector = await this.findUI5Control({
      controlType: params.controlType ?? "sap.m.Button",
      id: params.id,
      properties: params.text ? { text: params.text } : undefined,
    });
    await this.page.click(selector);
  }

  /**
   * Set value on a UI5 input control.
   */
  async setInputValue(params: {
    id?: string;
    value: string;
    controlType?: string;
  }): Promise<void> {
    const ctrlType = params.controlType ?? "sap.m.Input";
    await this.page.evaluate(
      ({ id, value, controlType }) => {
        const controls = (window as any).sap?.ui?.getCore()?.byId(id);
        if (controls && typeof controls.setValue === "function") {
          controls.setValue(value);
          controls.fireChange({ value });
        }
      },
      { id: params.id, value: params.value, controlType: ctrlType },
    );
  }

  /**
   * Navigate to a Fiori Launchpad tile by title.
   */
  async navigateToTile(title: string): Promise<void> {
    await this.page.evaluate((tileTitle) => {
      const tiles =
        (window as any).sap?.ui?.getCore()?.byFieldGroupId?.("") ?? [];
      // Use shell navigation
      const hash = (window as any).sap?.ushell?.Container?.getServiceAsync?.(
        "CrossApplicationNavigation",
      );
      return hash;
    }, title);

    // Fallback: click tile by text
    const tileSelector = `[title="${title}"], .sapUshellTile:has-text("${title}")`;
    await this.page.click(tileSelector, {
      timeout: this.ctx.config.timeouts.action,
    });
    await this.page.waitForLoadState("networkidle", {
      timeout: this.ctx.config.timeouts.navigation,
    });
  }

  /**
   * Get table data from a UI5 table.
   */
  async getTableData(tableId: string): Promise<Record<string, string>[]> {
    return await this.page.evaluate((id) => {
      const table = (window as any).sap?.ui?.getCore()?.byId(id);
      if (!table || typeof table.getItems !== "function") return [];

      const items = table.getItems();
      const columns = table.getColumns?.() ?? [];
      const headers = columns.map(
        (col: any) => col.getHeader?.()?.getText?.() ?? "",
      );

      return items.map((item: any) => {
        const cells = item.getCells?.() ?? [];
        const row: Record<string, string> = {};
        cells.forEach((cell: any, idx: number) => {
          const key = headers[idx] || `col_${idx}`;
          row[key] = cell.getText?.() ?? cell.getValue?.() ?? "";
        });
        return row;
      });
    }, tableId);
  }

  /**
   * Wait for UI5 to be ready.
   */
  async waitForUI5(): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const sap = (window as any).sap;
        if (!sap?.ui?.getCore) return false;
        const core = sap.ui.getCore();
        // Check if UI5 is fully loaded and no pending requests
        return core && !sap.ui.getCore().getUIDirty?.();
      },
      { timeout: this.ctx.config.timeouts.navigation },
    );
  }

  /**
   * Discover UI5 controls on the current page.
   */
  async discoverElements(): Promise<ElementInfo[]> {
    const controls = await this.page.evaluate(() => {
      const sap = (window as any).sap;
      if (!sap?.ui?.getCore) return [];

      const registry = sap.ui.getCore().byFieldGroupId?.("") ?? [];
      const interactiveTypes = [
        "sap.m.Button",
        "sap.m.Input",
        "sap.m.ComboBox",
        "sap.m.Select",
        "sap.m.CheckBox",
        "sap.m.RadioButton",
        "sap.m.Link",
        "sap.m.SearchField",
        "sap.m.GenericTile",
        "sap.m.DatePicker",
        "sap.m.TextArea",
      ];

      const result: Array<{
        id: string;
        controlType: string;
        text: string;
        properties: Record<string, string>;
        visible: boolean;
      }> = [];

      // Use element registry if available
      const elementRegistry = sap.ui.core?.Element?.registry;
      if (elementRegistry) {
        elementRegistry.forEach((control: any) => {
          const metadata = control.getMetadata?.();
          const controlType = metadata?.getName?.() ?? "";
          if (!interactiveTypes.some((t) => controlType.startsWith(t))) return;
          if (!control.getDomRef?.()) return;

          result.push({
            id: control.getId?.() ?? "",
            controlType,
            text: control.getText?.() ?? control.getValue?.() ?? "",
            properties: {
              enabled: String(control.getEnabled?.() ?? true),
              visible: String(control.getVisible?.() ?? true),
            },
            visible: !!control.getDomRef(),
          });
        });
      }
      return result;
    });

    return controls.map((ctrl: any) => {
      const fingerprint = crypto
        .createHash("md5")
        .update(`${ctrl.controlType}|${ctrl.text}|${ctrl.id}`)
        .digest("hex");

      return {
        selector: `#${ctrl.id}`,
        alternativeSelectors: [
          `[data-sap-ui="${ctrl.id}"]`,
          ctrl.text
            ? `${ctrl.controlType.split(".").pop()}:has-text("${ctrl.text}")`
            : "",
        ].filter(Boolean),
        tagName: ctrl.controlType,
        text: ctrl.text || undefined,
        attributes: {
          ...ctrl.properties,
          "data-sap-ui-type": ctrl.controlType,
        },
        visible: ctrl.visible,
        fingerprint,
      };
    });
  }

  private buildUI5FindScript(params: {
    controlType?: string;
    id?: string | RegExp;
    properties?: Record<string, unknown>;
  }): string {
    if (params.id && typeof params.id === "string") {
      return `(() => {
        const ctrl = sap.ui.getCore().byId('${params.id}');
        return ctrl?.getDomRef()?.id ?? null;
      })()`;
    }

    return `(() => {
      const registry = sap.ui.core?.Element?.registry;
      if (!registry) return null;
      let found = null;
      registry.forEach((ctrl) => {
        if (found) return;
        const meta = ctrl.getMetadata?.();
        const type = meta?.getName?.() ?? '';
        if ('${params.controlType ?? ""}' && type !== '${params.controlType}') return;
        ${
          params.properties
            ? Object.entries(params.properties)
                .map(
                  ([key, val]) =>
                    `if (ctrl.get${key.charAt(0).toUpperCase() + key.slice(1)}?.() !== ${JSON.stringify(val)}) return;`,
                )
                .join("\n        ")
            : ""
        }
        if (ctrl.getDomRef()) found = ctrl.getDomRef().id;
      });
      return found;
    })()`;
  }
}
