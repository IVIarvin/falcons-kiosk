import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const directory = '.impeccable/review/catalogue-piller';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const page = await browser.newPage();
const errors: string[] = [];
page.on('pageerror', (error) => errors.push(error.message));
const checks: unknown[] = [];
try {
  await page.goto('http://127.0.0.1:3010/connexion');
  await page.getByLabel('Numéro de téléphone').fill('0790000001');
  await page.getByLabel('Mot de passe', { exact: true }).fill('Falcons-demo-2026!');
  await page.getByRole('button', { name: 'Me connecter', exact: true }).click();
  await page.getByRole('heading', { name: 'Kiosque', exact: true }).waitFor();
  for (const [name, width, height] of [
    ['desktop', 1440, 1000],
    ['mobile', 390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('http://127.0.0.1:3010/admin/produits');
    await page.getByRole('button', { name: 'Ajouter un produit' }).click();
    let dialog = page.getByRole('dialog');
    await dialog.getByLabel('Nom', { exact: true }).fill('coca cola');
    await dialog.getByRole('button', { name: 'Rechercher une référence' }).click();
    await dialog
      .getByRole('button', { name: /Choisir / })
      .first()
      .waitFor({ timeout: 15000 });
    await dialog
      .getByRole('button', { name: /Choisir / })
      .first()
      .click();
    await dialog.getByText('Référence récupérée.', { exact: false }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(async () => {
      await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
    });
    await dialog.evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.screenshot({ path: `${directory}/${name}-product.png` });
    checks.push({
      surface: 'product',
      width,
      overflow: await dialog.evaluate((el) => el.scrollWidth > el.clientWidth),
      imageOverflow: await dialog
        .locator('.preview-image')
        .first()
        .evaluate((el) => {
          const frame = el.getBoundingClientRect();
          const photo = el.querySelector('img')?.getBoundingClientRect();
          return (
            !!photo &&
            (photo.bottom > frame.bottom + 1 ||
              photo.top < frame.top - 1 ||
              photo.right > frame.right + 1 ||
              photo.left < frame.left - 1)
          );
        }),
      name: await dialog.getByLabel('Nom', { exact: true }).inputValue(),
      image: await dialog.getByLabel('Image du produit', { exact: true }).inputValue(),
    });
    await dialog.getByRole('button', { name: 'Fermer', exact: true }).click();
    await page.goto('http://127.0.0.1:3010/admin/reglages');
    await page.getByRole('button', { name: 'Voir les 60 répliques' }).click();
    dialog = page.getByRole('dialog', { name: 'Le répertoire de Piller' });
    await dialog.getByLabel('Thème des répliques').selectOption('energy');
    await page.screenshot({ path: `${directory}/${name}-repertoire.png` });
    checks.push({
      surface: 'repertoire',
      width,
      overflow: await dialog.evaluate((el) => el.scrollWidth > el.clientWidth),
    });
    await dialog.getByRole('button', { name: 'Fermer', exact: true }).click();
  }
  await writeFile(`${directory}/checks.json`, JSON.stringify({ checks, errors }, null, 2));
  console.log(JSON.stringify({ checks, errors }));
  if (
    errors.length ||
    checks.some((item) => {
      const check = item as { overflow: boolean; imageOverflow?: boolean };
      return check.overflow || check.imageOverflow;
    })
  )
    throw new Error('Défaut navigateur détecté.');
} finally {
  await browser.close();
}
