import { expect, test } from "@playwright/test";

test.describe("landing", () => {
  test("shows the hero and both calls to action", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Your life, beautifully organized\./);
    await expect(page.getByRole("link", { name: /Get Started/ }).first()).toBeVisible();
    await page.getByRole("link", { name: "Explore Demo" }).first().click();
    await expect(page).toHaveURL(/\/demo$/);
  });
});

test.describe("demo workspace", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demo");
    await expect(page.getByText("Demo mode.").first()).toBeVisible();
  });

  test("dashboard greets the demo persona with real sections", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Alex");
    await expect(page.getByRole("heading", { name: "Tasks due today" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Today.s schedule/ })).toBeVisible();
  });

  test("adds and completes a task with quick add", async ({ page }) => {
    await page.goto("/demo/tasks");
    const box = page.getByPlaceholder(/Add a task for today/);
    await box.fill("Water the plants 10m");
    await box.press("Enter");
    const row = page.getByRole("listitem").filter({ hasText: "Water the plants" });
    await expect(row).toBeVisible();
    await row.getByRole("checkbox").first().click();
    await page.getByRole("tab", { name: /Completed/ }).click();
    await expect(page.getByText("Water the plants")).toBeVisible();
  });

  test("keeps demo changes after a reload", async ({ page }) => {
    await page.goto("/demo/tasks");
    const box = page.getByPlaceholder(/Add a task for today/);
    await box.fill("Persist me please");
    await box.press("Enter");
    await expect(page.getByText("Persist me please")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Persist me please")).toBeVisible();
  });

  test("Plan My Day builds a plan without changing the calendar", async ({ page }) => {
    await page.getByRole("button", { name: "Plan my day" }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Your suggested plan")).toBeVisible();
    await expect(dialog.getByText("Rule-based").first()).toBeVisible();
    await dialog.getByRole("button", { name: "Not today" }).click();
    await expect(dialog).toBeHidden();
  });

  test("Life Radar explains its insights", async ({ page }) => {
    await page.goto("/demo/radar");
    await expect(page.getByRole("heading", { name: "Life Radar", level: 1 })).toBeVisible();
    await page.getByRole("button", { name: /Why am I seeing this/ }).first().click();
    await expect(page.getByText(/Calculated from what you’ve entered/).first()).toBeVisible();
  });

  test("What-If shows a before and after comparison", async ({ page }) => {
    await page.goto("/demo/what-if");
    await expect(page.getByText("Scheduled hours")).toBeVisible();
    await expect(page.getByText("What changes")).toBeVisible();
    await expect(page.getByText("Hypothetical").first()).toBeVisible();
  });

  test("every page loads without horizontal scrolling", async ({ page }) => {
    for (const path of ["", "/tasks", "/habits", "/goals", "/notes", "/calendar", "/radar", "/what-if", "/insights", "/settings"]) {
      await page.goto(`/demo${path}`);
      await expect(page.locator("main")).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      expect(overflow, path || "/").toBe(false);
    }
  });
});

test("signed-out visitors are sent to sign in", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp/);
});
