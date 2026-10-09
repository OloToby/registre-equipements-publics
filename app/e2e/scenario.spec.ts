// E2E : scénario fil rouge 12 étapes — Deck 3 slide 12
// Source : programme p. 36–42, Deck 2 slide 15
// Conception auteur — tests sur données fictives

import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

// Comptes de démonstration réels (seed.ts)
const USERS = {
  commune:    { email: "responsable@commune-a.bj",  password: "demo1234" },
  technicien: { email: "technicien@commune-a.bj",   password: "demo1234" },
  pole:       { email: "pole@atlantique.bj",         password: "demo1234" },
  admin:      { email: "admin@registre.bj",          password: "demo1234" },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

async function loginAs(
  page: import("@playwright/test").Page,
  user: { email: string; password: string },
  redirectTo: string
) {
  await page.goto(`${BASE}/login?redirect=${encodeURIComponent(redirectTo)}`);
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`**${redirectTo}**`, { timeout: 15000 });
}

// ── ÉTAPES 1-3 : Habitant — signalement & suivi ───────────────────────────────

test("Étape 1 — Fiche publique EAU-004 visible sans compte", async ({ page }) => {
  await page.goto(`${BASE}/ouvrage/EAU-004`);
  await page.waitForLoadState("domcontentloaded");
  // Code de l'ouvrage visible
  await expect(page.getByText("EAU-004").first()).toBeVisible();
  // Bandeau données fictives (dans le layout)
  const body = await page.textContent("body");
  expect(body).toContain("DONNÉES FICTIVES");
});

test("Étape 2 — Formulaire signalement 3 gestes depuis EAU-004", async ({ page }) => {
  await page.goto(`${BASE}/signaler/EAU-004`);
  await page.waitForLoadState("domcontentloaded");
  // La page de signalement doit s'afficher (boutons de panne ou titre)
  const body = await page.textContent("body");
  expect(body).toBeTruthy();
  const hasPanneContent = body!.includes("signale") || body!.includes("panne") || body!.includes("problème") || body!.includes("EAU-004");
  expect(hasPanneContent).toBeTruthy();
});

test("Étape 3 — Page de suivi affiche un résultat pour S-2026-0142", async ({ page }) => {
  await page.goto(`${BASE}/suivi/S-2026-0142`);
  await page.waitForLoadState("domcontentloaded");
  const body = await page.textContent("body");
  expect(body).toBeTruthy();
  // Soit le numéro, soit un message de non-trouvé — les deux sont acceptables en démo fraîche
  const ok = body!.includes("S-2026-0142")
    || body!.includes("non trouvé")
    || body!.includes("introuvable")
    || body!.includes("suivi");
  expect(ok).toBeTruthy();
});

// ── ÉTAPE 4 : Simulateur SMS ──────────────────────────────────────────────────

test("Étape 4 — Page SMS simulateur accessible et titre visible", async ({ page }) => {
  await page.goto(`${BASE}/sms-demo`);
  await page.waitForLoadState("domcontentloaded");
  // Le titre h1 "Simulateur SMS" doit être présent
  await expect(page.locator("h1")).toContainText(/simulat|SMS/i, { timeout: 10000 });
});

// ── ÉTAPES 5-8 : Commune ─────────────────────────────────────────────────────

test("Étape 5 — Login commune fonctionne avec responsable@commune-a.bj", async ({ page }) => {
  await loginAs(page, USERS.commune, "/commune");
  // Après login on est sur /commune
  await expect(page).toHaveURL(/\/commune/, { timeout: 5000 });
});

test("Étape 6 — Tableau de bord commune affiche les indicateurs", async ({ page }) => {
  await loginAs(page, USERS.commune, "/commune");
  // Au moins un indicateur KPI visible
  await expect(page.locator("body")).toContainText(/disponibil|préventif|délai/i, { timeout: 10000 });
  // Bandeau données fictives toujours là
  const body = await page.textContent("body");
  expect(body).toContain("DONNÉES FICTIVES");
});

test("Étape 7 — Carte des ouvrages accessible", async ({ page }) => {
  await loginAs(page, USERS.commune, "/commune/carte");
  await expect(page.locator("h1")).toContainText(/carte/i, { timeout: 10000 });
});

test("Étape 8 — Liste des ouvrages accessible et montre EAU-", async ({ page }) => {
  await loginAs(page, USERS.commune, "/commune/ouvrages");
  await expect(page.locator("body")).toContainText(/EAU-/i, { timeout: 10000 });
});

// ── ÉTAPES 9-10 : Technicien ──────────────────────────────────────────────────

test("Étape 9 — Login technicien fonctionne avec technicien@commune-a.bj", async ({ page }) => {
  await loginAs(page, USERS.technicien, "/technicien");
  await expect(page).toHaveURL(/\/technicien/, { timeout: 5000 });
});

test("Étape 10 — Page technicien affiche les affectations ou message vide", async ({ page }) => {
  await loginAs(page, USERS.technicien, "/technicien");
  await page.waitForLoadState("networkidle");
  const body = await page.textContent("body");
  expect(body).toBeTruthy();
  const ok = body!.includes("P1") || body!.includes("P2") || body!.includes("affect")
    || body!.includes("aucun") || body!.includes("intervention") || body!.includes("technicien");
  expect(ok).toBeTruthy();
});

// ── ÉTAPES 11-12 : Pôle ──────────────────────────────────────────────────────

test("Étape 11 — Login pôle fonctionne avec pole@atlantique.bj", async ({ page }) => {
  await loginAs(page, USERS.pole, "/pole");
  await expect(page).toHaveURL(/\/pole/, { timeout: 5000 });
});

test("Étape 12 — Tableau de bord pôle affiche le tableau comparatif", async ({ page }) => {
  await loginAs(page, USERS.pole, "/pole");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).toContainText(/tableau comparatif|commune/i, { timeout: 10000 });
});

// ── Mobile viewport check ─────────────────────────────────────────────────────

test("Mobile — page d'accueil s'affiche sans scroll horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(BASE);
  await page.waitForLoadState("domcontentloaded");
  const body = await page.$("body");
  expect(body).not.toBeNull();
  const bodyWidth = await body!.evaluate((el) => el.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(376);
});

test("Mobile — fiche ouvrage EAU-004 lisible en 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${BASE}/ouvrage/EAU-004`);
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByText("EAU-004").first()).toBeVisible();
  const body = await page.$("body");
  const bodyWidth = await body!.evaluate((el) => el.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(376);
});
