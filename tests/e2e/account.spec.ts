import { expect, test } from "@playwright/test";

// Real accounts against the Firebase Emulator Suite. Run with:
//   npm run emulators            (terminal 1)
//   npm run dev:emulators        (terminal 2)
//   E2E_LIVE=1 E2E_PORT=3000 npx playwright test account --project desktop
test.skip(!process.env.E2E_LIVE, "Needs the Firebase emulators (set E2E_LIVE=1)");

test("sign up, onboard, save data, sign out, sign in, delete account", async ({ page }) => {
  test.setTimeout(120_000);
  const email = `e2e${Date.now()}@example.com`;
  const password = "correct-horse-9";

  await page.goto("/signup");
  await page.fill("#name", "Nicole");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("heading", { name: "Welcome to LifeOS" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.fill("#ob-ws", "08:30");
  await page.getByRole("button", { name: "Finish setup" }).click();

  await expect(page).toHaveURL(/\/app$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Nicole");
  const box = page.getByPlaceholder(/Add a task for today/).first();
  await box.fill("Call the dentist 15m !");
  await box.press("Enter");
  await expect(page.getByText("Call the dentist")).toBeVisible();
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.getByText("Call the dentist")).toBeVisible({ timeout: 20_000 });

  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login/);

  await page.fill("#email", email);
  await page.fill("#password", "not-my-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("That email and password don't match an account.")).toBeVisible();
  await page.fill("#password", password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Call the dentist")).toBeVisible({ timeout: 20_000 });

  await page.goto("/app/settings");
  await page.getByRole("button", { name: "Delete account" }).click();
  await page.fill("#del-pass", password);
  await page.fill("#del-confirm", "delete");
  await page.getByRole("button", { name: "Delete everything" }).click();
  await expect(page).toHaveURL(/\?deleted=1/, { timeout: 20_000 });

  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("That email and password don't match an account.")).toBeVisible();
});
