import { test, expect } from "@playwright/test";

const PASSWORD = "test1234";
const TRAINER = "amina@almanar.test";
const MANAGER = "rachid@almanar.test";

async function signIn(page, email) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: /connecter/i }).click();
}

async function signOut(page) {
  await page.getByRole("button", { name: /déconnecter/i }).click();
  await expect(page).toHaveURL(/sign-in/);
}

test("a trainer books, a manager approves, the trainer sees it approved", async ({
  page,
}) => {
  // ---- trainer books -------------------------------------------------------

  await signIn(page, TRAINER);
  await expect(page).toHaveURL(/\/trainer$/);

  await page.getByRole("link", { name: /matériel/i }).click();
  await expect(page).toHaveURL(/\/trainer\/equipment/);

  const projector = page.locator("li", { hasText: /projecteur/i });
  await expect(projector).toContainText(/disponible/i);
  await projector.getByRole("link", { name: /réserver/i }).click();

  await expect(page).toHaveURL(/type=projector/);

  // A date far enough ahead that the seeded bookings cannot collide with it. The
  // seed dates its bookings relative to when it runs, so a fixed near date would
  // sometimes clash and this test would fail for the wrong reason.
  const day = new Date();
  day.setDate(day.getDate() + 30);
  const iso = day.toISOString().slice(0, 10);

  await page.getByLabel("Date").fill(iso);
  await page.getByLabel("Durée").selectOption("1");
  await page.getByLabel("Heure de début").selectOption("10");
  await page.getByRole("button", { name: /demander/i }).click();

  // The form redirects here on success.
  await expect(page).toHaveURL(/my-bookings/);

  const booking = page.locator("li", { hasText: /projector-/ }).first();
  await expect(booking).toContainText(/en attente/i);

  await signOut(page);

  // ---- manager approves ----------------------------------------------------

  await signIn(page, MANAGER);
  await expect(page).toHaveURL(/\/manager$/);

  await page.getByRole("link", { name: /attente/i }).click();
  await expect(page).toHaveURL(/\/manager\/bookings/);

  // Amina by email rather than name, because two trainers could share a name and
  // the row shows both for exactly that reason.
  const request = page.locator("li", { hasText: TRAINER }).last();
  await expect(request).toBeVisible();
  await request.getByRole("button", { name: /accepter/i }).click();

  // The list reloads after a decision, so the approved row leaves it.
  await expect(page.locator("li", { hasText: TRAINER })).toHaveCount(1);

  await signOut(page);

  // ---- the trainer sees it -------------------------------------------------
  //
  // This assertion is the whole reason the test exists. A rules test can prove a
  // manager is permitted to write the status. Only this can prove the trainer's
  // screen then shows it.

  await signIn(page, TRAINER);
  await page.getByRole("link", { name: /mes réservations/i }).click();
  await expect(page.locator("li").first()).toContainText(/acceptée/i);
});
