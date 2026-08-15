import { test, expect } from "@playwright/test";

const MANAGER = { email: "rachid@almanar.test", password: "test1234" };
const PASSWORD = "test1234";

const newTrainerEmail = () => `trainer-${Date.now()}@almanar.test`;

async function signIn(page, email, password) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/mot de passe|password/i).fill(password);
  await page
    .getByRole("button", { name: /connecter|connexion|sign in/i })
    .click();
}

async function signOut(page) {
  await page.getByRole("button", { name: /déconnecter|sign out/i }).click();
  await expect(page).toHaveURL(/sign-in/);
}

test("a manager creates a trainer who can then sign in", async ({ page }) => {
  const email = newTrainerEmail();

  await signIn(page, MANAGER.email, MANAGER.password);
  await expect(page).toHaveURL(/manager/);

  // Form locators updated with flexible regex matching
  await page.getByLabel(/nom|trainer name/i).fill("Yassine Test");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/mot de passe|password/i).fill(PASSWORD);
  await page
    .getByRole("button", { name: /créer|ajouter|create account/i })
    .click();

  await expect(page.getByText(/succès|created successfully/i)).toBeVisible();

  await signOut(page);

  await signIn(page, email, PASSWORD);
  await expect(page).toHaveURL(/trainer/);
});

test("the form reports a duplicate email instead of failing silently", async ({
  page,
}) => {
  const email = newTrainerEmail();

  await signIn(page, MANAGER.email, MANAGER.password);

  for (const attempt of ["first", "second"]) {
    await page.getByLabel(/nom|trainer name/i).fill(`Yassine ${attempt}`);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel(/mot de passe|password/i).fill(PASSWORD);
    await page
      .getByRole("button", { name: /créer|ajouter|create account/i })
      .click();

    if (attempt === "first") {
      await expect(
        page.getByText(/succès|created successfully/i)
      ).toBeVisible();
    }
  }

  await expect(page.getByText(/déjà|already registered/i)).toBeVisible();
});
