import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { buildAccessPdf } from '../src/features/documents/service';
const directory = '.impeccable/review';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors: string[] = [];
page.on('pageerror', (error) => errors.push(error.message));
async function ready() {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
  });
  await page.addStyleTag({
    content:
      '*,*::before,*::after{animation:none!important;transition:none!important}nextjs-portal{display:none!important}',
  });
  await page.evaluate(() => window.scrollTo(0, 0));
}
try {
  await page.goto('http://127.0.0.1:3010/connexion');
  await page.getByLabel('Numéro de téléphone').fill('0790000001');
  await page.getByLabel('Mot de passe', { exact: true }).fill('Falcons-demo-2026!');
  await page.getByRole('button', { name: 'Me connecter', exact: true }).click();
  await page.getByRole('heading', { name: 'Kiosque', exact: true }).waitFor();
  // Only retire fictitious products created by this QA suite, on the explicit demo.
  await page.getByText('Démonstration', { exact: false }).first().waitFor();
  const snapshot = (await (await page.request.get('http://127.0.0.1:3010/api/state')).json()).data;
  for (const product of snapshot.products.filter(
        (p: { name: string; active: boolean }) =>
          p.active && (p.name.startsWith('Produit QA ') || p.name === 'Coca-Cola Original QA' || /^Libre \d+$/.test(p.name)),
  )) {
    const result = await page.request.post('http://127.0.0.1:3010/api/action', {
      headers: { Origin: 'http://127.0.0.1:3010' },
      data: { action: 'product', data: { ...product, active: false } },
    });
    if (!result.ok()) throw new Error('Nettoyage du produit fictif impossible.');
  }
  await page.goto('http://127.0.0.1:3010/admin');
  await page.getByRole('heading', { name: 'Règlements', exact: true }).waitFor();
  await ready();
  await page.screenshot({ path: `${directory}/desktop.png`, fullPage: true });
  const catalogue = await page.request.get('http://127.0.0.1:3010/api/admin/documents/catalogue');
  if (catalogue.status() !== 200) throw new Error('Catalogue PDF indisponible.');
  await writeFile(`${directory}/catalogue-test.pdf`, await catalogue.body());
  await writeFile(
    `${directory}/qr-test.pdf`,
    await buildAccessPdf('https://example.org/falcons-qa/'),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:3010/');
  await page.getByRole('heading', { name: 'Kiosque', exact: true }).waitFor();
  await ready();
  await page.screenshot({ path: `${directory}/mobile.png`, fullPage: true });
  const mobileOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  await page.getByRole('button', { name: 'Ajouter Chips paprika', exact: true }).click();
  await page.getByRole('button', { name: 'Ajouter à mon ardoise', exact: false }).click();
  await page.getByRole('heading', { name: 'Achat enregistré' }).waitFor();
  await ready();
  await page.screenshot({ path: `${directory}/mobile-receipt.png`, fullPage: true });
  await page.setViewportSize({ width: 320, height: 780 });
  await page.goto('http://127.0.0.1:3010/');
  await page.getByRole('heading', { name: 'Kiosque', exact: true }).waitFor();
  await ready();
  await page.screenshot({ path: `${directory}/mobile-320.png`, fullPage: true });
  const narrowOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  const result = {
    viewports: [1440, 390, 320],
    mobileOverflow,
    narrowOverflow,
    pageErrors: errors,
  };
  await writeFile(`${directory}/browser-checks.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  if (mobileOverflow || narrowOverflow || errors.length)
    throw new Error('Défaut de rendu navigateur détecté.');
} finally {
  await browser.close();
}
