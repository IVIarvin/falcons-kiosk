import { test, expect } from '@playwright/test';

test('édite une réplique depuis les réglages, la retrouve après rechargement puis restaure sa valeur', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/connexion');
  await page.getByLabel('Numéro de téléphone').fill('0790000001');
  await page.getByLabel('Mot de passe', { exact: true }).fill('Falcons-demo-2026!');
  await page.getByRole('button', { name: 'Me connecter', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kiosque', exact: true })).toBeVisible();
  const before = (await (await page.request.get('/api/state')).json()).data.admin.pillerQuotes.find(
    (q: { id: string }) => q.id === 'piller-v2-general-1',
  );
  let changed = false;
  try {
    await page.goto('/admin/reglages');
    await page.getByRole('button', { name: 'Voir les 60 répliques' }).click();
    const dialog = page.getByRole('dialog', { name: 'Le répertoire de Piller' });
    await dialog.getByRole('button', { name: 'Modifier la réplique 1', exact: true }).click();
    await dialog
      .getByLabel('Texte de la réplique', { exact: true })
      .fill('Ravitaille. Ferme-la. Dégage.');
    await dialog
      .getByRole('combobox', { name: 'Thème de la réplique', exact: true })
      .selectOption('energy');
    await dialog.getByLabel('Réplique active', { exact: true }).uncheck();
    await expect(
      dialog.getByRole('paragraph').filter({ hasText: 'Ravitaille. Ferme-la. Dégage.' }),
    ).toBeVisible();
    changed = true;
    await dialog.getByRole('button', { name: 'Écouter la réplique', exact: true }).first().click();
    await expect(dialog.getByLabel('Texte de la réplique', { exact: true })).toBeVisible();
    await dialog
      .getByRole('button', { name: /Couper le son|Activer le son/ })
      .first()
      .click();
    await expect(dialog.getByLabel('Texte de la réplique', { exact: true })).toBeVisible();
    const unsaved = (
      await (await page.request.get('/api/state')).json()
    ).data.admin.pillerQuotes.find((q: { id: string }) => q.id === before.id);
    expect(unsaved.revision).toBe(before.revision);
    await dialog.evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.screenshot({ path: '.impeccable/review/piller-editor-desktop.png' });
    await dialog.getByRole('button', { name: 'Enregistrer la réplique', exact: true }).click();
    await expect(dialog.getByText('Désactivée', { exact: true })).toBeVisible();
    changed = true;
    await page.reload();
    await page.getByRole('button', { name: 'Voir les 60 répliques' }).click();
    await page.getByLabel('Thème des répliques').selectOption('energy');
    await page.getByRole('button', { name: 'Modifier la réplique 1', exact: true }).click();
    await expect(page.getByLabel('Texte de la réplique', { exact: true })).toHaveValue(
      'Ravitaille. Ferme-la. Dégage.',
    );
    await expect(
      page.getByRole('combobox', { name: 'Thème de la réplique', exact: true }),
    ).toHaveValue('energy');
    await expect(page.getByLabel('Réplique active', { exact: true })).not.toBeChecked();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.getByRole('dialog').evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(
      false,
    );
    await page.screenshot({ path: '.impeccable/review/piller-editor-mobile.png' });
  } finally {
    if (changed) {
      const current = (
        await (await page.request.get('/api/state')).json()
      ).data.admin.pillerQuotes.find((q: { id: string }) => q.id === before.id);
      const restored = await page.request.post('/api/action', {
        headers: { Origin: 'http://127.0.0.1:3010' },
        data: { action: 'pillerQuote', data: { ...before, revision: current.revision } },
      });
      expect(restored.ok()).toBe(true);
    }
  }
});
