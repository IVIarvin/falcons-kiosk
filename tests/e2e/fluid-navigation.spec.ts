import { test, expect, type Page, type BrowserContext } from '@playwright/test';
let cookies: Awaited<ReturnType<BrowserContext['cookies']>> = [];
async function login(page: Page) {
  if (cookies.length) {
    await page.context().addCookies(cookies);
    await page.goto('/');
  } else {
    await page.goto('/connexion');
    await page.getByLabel('Numéro de téléphone').fill('0790000001');
    await page.getByLabel('Mot de passe', { exact: true }).fill('Falcons-demo-2026!');
    await page.getByRole('button', { name: 'Me connecter', exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: 'Kiosque', exact: true })).toBeVisible();
  if (!cookies.length) cookies = await page.context().cookies();
  // The development toolbar otherwise sits over the first mobile navigation link.
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  return (await (await page.request.get('/api/state')).json()).data;
}
async function watchShell(page: Page) {
  await page.evaluate(() => {
    const shell = document.querySelector('.app-shell')!;
    Object.assign(window, { originalShell: shell, shellLost: false });
    new MutationObserver(() => {
      if (!shell.isConnected) Object.assign(window, { shellLost: true });
    }).observe(document.body, { childList: true, subtree: true });
  });
}
async function shellIntact(page: Page) {
  return page.evaluate(() => {
    const w = window as unknown as { originalShell: Element; shellLost: boolean };
    return !w.shellLost && w.originalShell === document.querySelector('.app-shell');
  });
}
test('la recherche porte son focus sur le cadre complet avec icône', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await login(page);
  const input = page.getByRole('searchbox', { name: 'Rechercher un produit', exact: true });
  await input.click();
  const styles = await input.evaluate((el) => ({
    inputOutline: getComputedStyle(el).outlineStyle,
    inputBorder: getComputedStyle(el).borderWidth,
    fieldOutline: getComputedStyle(el.closest('.search-field')!).outlineStyle,
    fieldColor: getComputedStyle(el.closest('.search-field')!).outlineColor,
  }));
  expect(styles.inputOutline).toBe('none');
  expect(styles.inputBorder).toBe('0px');
  expect(styles.fieldOutline).toBe('solid');
  expect(styles.fieldColor).toBe('rgb(143, 231, 129)');
});

test('un onglet lent signale son attente en conservant le contenu précédent', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await watchShell(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/falcons?*', async (route) => {
    await gate;
    await route.continue();
  });
  const request = page.waitForRequest(
    (r) => new URL(r.url()).pathname === '/falcons' && r.headers().rsc === '1',
  );
  const link = page
    .getByRole('navigation', { name: 'Navigation mobile' })
    .getByRole('link', { name: 'Falcons', exact: true });
  const click = link.click();
  await request;
  await expect(link.locator('.nav-pending')).toHaveAttribute('data-pending', 'true');
  expect(await shellIntact(page)).toBe(true);
  await expect(page.getByRole('heading', { name: 'Kiosque', exact: true })).toBeVisible();
  release();
  await click;
  await expect(page.getByRole('heading', { name: 'Famille Falcons', exact: true })).toBeVisible();
  await expect(link.locator('.nav-pending')).not.toHaveAttribute('data-pending');
});

test('les transitions de vue restent visibles, douces en mouvement réduit et immédiates au clavier', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const original = Element.prototype.animate;
    Object.assign(window, { viewAnimations: [] });
    Element.prototype.animate = function (frames, options) {
      const animation = original.call(this, frames, options);
      if (this.matches('.route-view, .route-view .page-title')) {
        (window as unknown as { viewAnimations: unknown[] }).viewAnimations.push({
          target: this.className,
          frames: (animation.effect as KeyframeEffect).getKeyframes(),
          duration: animation.effect!.getTiming().duration,
        });
        animation.playbackRate = 0.1;
      }
      return animation;
    };
  });
  await login(page);
  const nav = page.getByRole('navigation', { name: 'Navigation mobile' });
  await page.evaluate(() => Object.assign(window, { viewAnimations: [] }));
  await nav.getByRole('link', { name: 'Ardoise', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Mon ardoise', exact: true })).toBeVisible();
  const frames = await page.evaluate(
    () =>
      (
        window as unknown as {
          viewAnimations: { target: string; frames: Keyframe[]; duration: number }[];
        }
      ).viewAnimations,
  );
  expect(frames.some((a) => a.target === 'route-view')).toBe(true);
  expect(frames.every((a) => a.duration >= 100 && a.duration <= 220)).toBe(true);
  expect(
    frames.find((a) => a.target === 'route-view')!.frames.every((f) => Number(f.opacity) >= 0.85),
  ).toBe(true);
  expect(frames.some((a) => a.frames.some((f) => String(f.transform).includes('translateY')))).toBe(
    true,
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => Object.assign(window, { viewAnimations: [] }));
  await nav.getByRole('link', { name: 'Falcons', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Famille Falcons', exact: true })).toBeVisible();
  const reduced = await page.evaluate(
    () => (window as unknown as { viewAnimations: { frames: Keyframe[] }[] }).viewAnimations,
  );
  expect(reduced.length).toBeGreaterThan(0);
  expect(reduced.every((a) => a.frames.every((f) => !f.transform || f.transform === 'none'))).toBe(
    true,
  );
  await nav.getByRole('link', { name: 'Kiosque', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.locator('.product-card .add-button').first().focus();
  await page.keyboard.press('Enter');
  expect(
    await page.locator('.basket-bar').evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe('0s');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => Object.assign(window, { viewAnimations: [] }));
  await nav.getByRole('link', { name: 'Profil', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Mon profil', exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { viewAnimations: unknown[] }).viewAnimations.length,
    ),
  ).toBe(0);
});

test('les onglets conservent le shell, le panier et le snapshot récent sous réseau lent', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const snapshot = await login(page);
  await page.locator('.product-card .add-button').first().click();
  await watchShell(page);
  let reads = 0;
  await page.route('**/api/state', async (route) => {
    reads++;
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.fulfill({ json: { ok: true, data: snapshot } });
  });
  const nav = page.getByRole('navigation', { name: 'Navigation mobile' });
  await nav.getByRole('link', { name: 'Ardoise', exact: true }).click();
  await expect(page).toHaveURL(/\/ardoise$/);
  expect(await shellIntact(page)).toBe(true);
  await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'instant' }));
  await nav.getByRole('link', { name: 'Kiosque', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kiosque', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.locator('.basket-bar')).toContainText('1 article');
  expect(reads).toBe(0);
  expect(await shellIntact(page)).toBe(true);
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Mon ardoise', exact: true })).toBeVisible();
  expect(await shellIntact(page)).toBe(true);
  await page.goForward();
  await expect(page.getByRole('heading', { name: 'Kiosque', exact: true })).toBeVisible();
});

test('une mutation obtient un nouvel état même si une ancienne lecture attend encore', async ({
  page,
}) => {
  const snapshot = await login(page);
  await page.goto('/profil');
  await expect(page.getByRole('heading', { name: 'Mon profil', exact: true })).toBeVisible();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let reads = 0;
  await page.route('**/api/state', async (route) => {
    const current = ++reads;
    if (current === 1) await gate;
    await route.fulfill({
      json: {
        ok: true,
        data:
          current === 1
            ? snapshot
            : {
                ...snapshot,
                user: { ...snapshot.user, name: 'Profil actualisé' },
              },
      },
    });
  });
  await page.route('**/api/action', async (route) => {
    if (route.request().postDataJSON().action === 'profile')
      return route.fulfill({ json: { ok: true, data: {} } });
    return route.continue();
  });
  const request = page.waitForRequest('**/api/state');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await request;
  await page.getByLabel('Nom', { exact: true }).fill('Profil actualisé');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.locator('.page-title')).toContainText('Profil actualisé');
  expect(reads).toBe(2);
  const staleFinished = page.waitForResponse((response) => response.url().endsWith('/api/state'));
  release();
  await (await staleFinished).finished();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(page.locator('.page-title')).toContainText('Profil actualisé');
});

test('les retours de focus simultanés ne multiplient pas les lectures et une panne conserve la vue', async ({
  page,
}) => {
  await login(page);
  await watchShell(page);
  let reads = 0;
  await page.route('**/api/state', async (route) => {
    reads++;
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.abort();
  });
  await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('focus'));
  });
  await expect(page.locator('.notice-box[role="alert"]')).toBeVisible();
  expect(reads).toBe(1);
  expect(await shellIntact(page)).toBe(true);
  await expect(page.getByRole('heading', { name: 'Kiosque', exact: true })).toBeVisible();
});

test('le retour au navigateur revalide sans écran vide et une401 retire les données privées', async ({
  page,
}) => {
  await login(page);
  await watchShell(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/state', async (route) => {
    await gate;
    await route.fulfill({
      status: 401,
      json: { ok: false, code: 'AUTH', message: 'Connexion requise.' },
    });
  });
  const request = page.waitForRequest('**/api/state');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await request;
  expect(await shellIntact(page)).toBe(true);
  await expect(page.getByRole('heading', { name: 'Kiosque', exact: true })).toBeVisible();
  release();
  await expect(page.getByRole('button', { name: 'Me connecter', exact: true })).toBeVisible();
  await expect(page.locator('.app-shell')).toHaveCount(0);
});
