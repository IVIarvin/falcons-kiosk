import { test, expect } from '@playwright/test';

test('les photos verticales restent dans leurs cadres sur ordinateur et téléphone', async ({
  page,
}) => {
  const tallPhoto =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="350"><rect width="100" height="350" fill="#8fe781"/></svg>',
    );
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.setContent(
      `<div class="product-preview"><span class="preview-image"><img src="${tallPhoto}" alt="Bouteille verticale"/></span><div>Produit</div></div><span class="lookup-image"><img src="${tallPhoto}" alt="Résultat"/></span><span class="admin-product-image"><img src="${tallPhoto}" alt="Catalogue"/></span>`,
    );
    await page.addStyleTag({ path: 'src/app/globals.css' });
    await page.evaluate(async () =>
      Promise.all([...document.images].map((image) => image.decode())),
    );
    for (const selector of ['.preview-image', '.lookup-image', '.admin-product-image']) {
      const { frame, image } = await page
        .locator(selector)
        .evaluate((el) => ({
          frame: el.getBoundingClientRect().toJSON(),
          image: el.querySelector('img')!.getBoundingClientRect().toJSON(),
        }));
      expect(image.bottom, `${selector} à ${width}px : bas de la photo`).toBeLessThanOrEqual(
        frame.bottom + 1,
      );
      expect(image.top, `${selector} à ${width}px : haut de la photo`).toBeGreaterThanOrEqual(
        frame.top - 1,
      );
      expect(image.right).toBeLessThanOrEqual(frame.right + 1);
      expect(image.left).toBeGreaterThanOrEqual(frame.left - 1);
    }
  }
});
