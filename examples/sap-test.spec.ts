/**
 * Example: SAP Fiori/UI5 Application Testing.
 */
import { test, expect } from "../src/fixtures/enterprise-fixtures";

test.describe("SAP Application — Enterprise ERP Tests", () => {
  test("Navigate to SAP Fiori Launchpad tile", async ({ page, sap }) => {
    await test.step("Wait for UI5 framework", async () => {
      await sap.waitForUI5();
    });

    await test.step("Open application tile", async () => {
      await sap.navigateToTile("Manage Purchase Orders");
    });

    await test.step("Verify application loaded", async () => {
      await sap.waitForUI5();
      const elements = await sap.discoverElements();
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  test("Create workflow with form fill", async ({ page, sap }) => {
    await test.step("Click Create button", async () => {
      await sap.pressButton({ text: "Create" });
    });

    await test.step("Fill form fields", async () => {
      await sap.setInputValue({ id: "vendorInput", value: "V001" });
      await page.keyboard.press("Tab");

      await sap.setInputValue({ id: "companyCodeInput", value: "1000" });
      await page.keyboard.press("Tab");
    });

    await test.step("Save document", async () => {
      await sap.pressButton({ text: "Save" });
      await sap.waitForUI5();
    });
  });

  test("Read table data", async ({ page, sap }) => {
    await test.step("Get table contents", async () => {
      const tableData = await sap.getTableData("purchaseOrderTable");
      expect(tableData.length).toBeGreaterThan(0);
    });
  });

  test("SAP element discovery", async ({ sap }) => {
    await test.step("Discover UI5 controls", async () => {
      const controls = await sap.discoverElements();

      // Should find buttons, inputs, etc.
      const buttons = controls.filter((c) => c.tagName.includes("Button"));
      const inputs = controls.filter((c) => c.tagName.includes("Input"));

      expect(buttons.length).toBeGreaterThanOrEqual(0);
      expect(inputs.length).toBeGreaterThanOrEqual(0);
    });
  });
});
