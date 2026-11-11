import { test, expect, type Page } from '@playwright/test';
async function login(page: Page, phone: string) {
  await page.goto('/connexion');
  await page.getByLabel('Numéro de téléphone').fill(phone);
  await page.getByLabel('Mot de passe', { exact: true }).fill('Falcons-demo-2026!');
  await page.getByRole('button', { name: 'Me connecter', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kiosque', exact: true })).toBeVisible();
}
const post = async (page: Page, action: string, data: unknown) => {
  const response = await page.request.post('/api/action', {
    data: { action, data },
    headers: { origin: 'http://127.0.0.1:3010' },
  });
  return { response, body: await response.json() };
};

test('un membre ne voit pas Servir et ne peut pas lire ou créer des tickets', async ({ page }) => {
  await login(page, '0790000002');
  await expect(page.getByRole('button', { name: /^Servir / })).toHaveCount(0);
  const { response } = await post(page, 'servicePeople', {});
  expect(response.status()).toBe(403);
  await page.goto('/admin/service');
  await expect(page.getByRole('heading', { name: 'Accès réservé au responsable.' })).toBeVisible();
});

test('sert depuis le produit, conserve le panier, crée un visiteur et le rattache sans facturer', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, '0790000001');
  const before = (await (await page.request.get('/api/state')).json()).data;
  const people = (await post(page, 'servicePeople', {})).body.data;
  const martin = people.members.find((p: { name: string }) => p.name === 'Martin Démo');
  const visitorName = `Visiteur service ${Date.now()}`;
  await page.getByRole('button', { name: 'Ajouter Eau minérale', exact: true }).click();
  await page.getByRole('button', { name: 'Servir Eau minérale', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Servir · Eau minérale' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Servir à Martin Démo', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText('Martin Démo');
  await expect(dialog).toBeVisible();
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 390);
  await dialog.getByText('Créer un visiteur', { exact: true }).click();
  await dialog.getByLabel('Nom du visiteur', { exact: true }).fill(visitorName);
  await dialog.getByRole('button', { name: 'Créer le visiteur', exact: true }).click();
  await dialog.getByRole('button', { name: `Servir à ${visitorName}`, exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText(visitorName);
  await page.screenshot({ path: '.superpowers/service-mobile.png', fullPage: true });
  await dialog.getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(page.locator('.basket-bar')).toContainText('1 article');
  await page.getByRole('link', { name: 'Contrôle du service', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Contrôle du service', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: visitorName }).first()).toContainText(
    'Visiteur',
  );
  await page.getByRole('button', { name: `Rattacher ${visitorName}`, exact: true }).click();
  const merge = page.getByRole('dialog', { name: 'Rattacher un visiteur' });
  await merge.getByLabel('Compte inscrit', { exact: true }).selectOption(martin.id);
  await merge.getByRole('button', { name: 'Confirmer le rattachement', exact: true }).click();
  await expect(merge).toHaveCount(0);
  const row = page
    .getByRole('row')
    .filter({ hasText: 'Martin Démo' })
    .filter({ hasText: 'Eau minérale' })
    .first();
  await expect(row).toBeVisible();
  await expect(row).toContainText(/à vérifier/i);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: '.superpowers/service-control-desktop.png', fullPage: true });
  const history = page.getByRole('region', { name: 'Historique du service' });
  await history
    .getByRole('button', { name: /^Annuler le ticket/ })
    .first()
    .click();
  const cancel = page.getByRole('dialog', { name: 'Annuler un ticket' });
  await cancel.getByLabel('Motif', { exact: true }).fill('Erreur de test');
  await cancel.getByRole('button', { name: 'Confirmer l’annulation', exact: true }).click();
  await expect(cancel).toHaveCount(0);
  await expect(history).toContainText('Erreur de test');
  const after = (await (await page.request.get('/api/state')).json()).data;
  expect(after.ledger.balanceCents).toBe(before.ledger.balanceCents);
  expect(after.admin.financial.salesCents).toBe(before.admin.financial.salesCents);
});

test('retrouve une réponse perdue après fermeture du produit sans doubler le ticket', async ({
  page,
}) => {
  await login(page, '0790000001');
  const before = (await post(page, 'serviceBoard', { from: '2000-01-01', to: '2000-01-01' })).body;
  expect(before.ok).toBe(true);
  let ticketId = '';
  await page.getByRole('button', { name: 'Servir Rivella rouge', exact: true }).click();
  await page.route('**/api/action', async (route) => {
    if (route.request().postDataJSON().action === 'recordServiceTicket') {
      const result = await route.fetch();
      ticketId = (await result.json()).data.id;
      await route.abort('failed');
    } else await route.continue();
  });
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Servir à Martin Démo', exact: true }).click();
  await expect(
    dialog.getByRole('button', { name: 'Retrouver le ticket', exact: true }),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Fermer', exact: true }).click();
  await page.unroute('**/api/action');
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Retrouver le ticket', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Retrouver le ticket', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retrouver le ticket', exact: true })).toHaveCount(
    0,
  );
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich' }).format(new Date());
  const board = (await post(page, 'serviceBoard', { from: day, to: day })).body.data;
  expect(board.tickets.filter((t: { id: string }) => t.id === ticketId)).toHaveLength(1);
});
