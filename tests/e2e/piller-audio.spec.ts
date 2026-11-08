import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
test('exporte la banque et lit seulement les MP3 exacts, sans appel vocal payant', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = { played: [] as string[], paused: 0, native: [] as string[] };
    (window as unknown as { __voice: typeof state }).__voice = state;
    class TestAudio {
      currentTime = 0;
      onerror: (() => void) | null = null;
      onplay: (() => void) | null = null;
      constructor(public src: string) {}
      async play() {
        state.played.push(this.src);
        this.onplay?.();
      }
      pause() {
        state.paused++;
      }
    }
    Object.defineProperty(window, 'Audio', { value: TestAudio, configurable: true });
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        getVoices: () => [],
        speak: (u: { text: string }) => state.native.push(u.text),
        cancel: () => {},
      },
      configurable: true,
    });
    localStorage.setItem('falcons_muted', '0');
  });
  let voiceCalls = 0;
  page.on('request', (req) => {
    if (req.url().includes('elevenlabs')) voiceCalls++;
  });
  await page.goto('/connexion');
  expect((await page.request.get('/api/admin/documents/piller')).status()).toBe(401);
  await page.getByLabel('Numéro de téléphone').fill('0790000001');
  await page.getByLabel('Mot de passe', { exact: true }).fill('Falcons-demo-2026!');
  await page.getByRole('button', { name: 'Me connecter', exact: true }).click();
  await page.getByRole('heading', { name: 'Kiosque', exact: true }).waitFor();
  const state = (await (await page.request.get('/api/state')).json()).data;
  const exported = await page.request.get('/api/admin/documents/piller');
  expect(exported.status()).toBe(200);
  const bank = await exported.json();
  expect(bank.quotes[0].text).toBe(state.admin.pillerQuotes[0].text);
  expect(JSON.stringify(bank)).not.toContain(state.user.phone);
  expect(exported.headers()['cache-control']).toBe('no-store');
  const text = bank.quotes[0].text;
  const key = createHash('sha256').update(text).digest('hex');
  const profile = 'a'.repeat(64);
  const file = `/audio/piller/${profile}/${key}.mp3`;
  let manifest: unknown = {
    version: 1,
    voice: { id: profile, name: 'Adjudant Piller' },
    entries: { [key]: { file, sha256: 'b'.repeat(64), bytes: 100 } },
  };
  let delay = false;
  let release!: () => void;
  let gate: Promise<void>;
  await page.route('**/audio/piller/manifest.json', async (route) => {
    if (delay) await gate;
    await route.fulfill({ json: manifest });
  });
  await page.goto('/admin/reglages');
  await page.getByRole('button', { name: 'Voir les 60 répliques' }).click();
  const dialog = page.getByRole('dialog');
  const article = dialog.locator('.quote-editor').first();
  await article.getByRole('button', { name: 'Écouter la réplique', exact: true }).click();
  const played = () =>
    page.evaluate(() => (window as unknown as { __voice: { played: string[] } }).__voice.played);
  await expect.poll(played).toEqual([file]);
  await article.getByRole('button', { name: 'Couper le son' }).click();
  expect(await page.evaluate(() => localStorage.getItem('falcons_muted'))).toBe('1');
  expect(
    await page.evaluate(
      () => (window as unknown as { __voice: { paused: number } }).__voice.paused,
    ),
  ).toBeGreaterThan(0);
  await article.getByRole('button', { name: 'Activer le son' }).click();
  await article.getByRole('button', { name: 'Modifier la réplique 1', exact: true }).click();
  await article
    .getByLabel('Texte de la réplique', { exact: true })
    .fill('Un texte nouveau, sans ancien son.');
  await article.getByRole('button', { name: 'Écouter la réplique', exact: true }).click();
  await expect(article.getByText('Audio dédié non préparé', { exact: false })).toBeVisible();
  expect(await played()).toEqual([file]);
  const draft = 'Un texte nouveau, sans ancien son.';
  const draftKey = createHash('sha256').update(draft).digest('hex');
  manifest = {
    version: 1,
    voice: { id: profile, name: 'Adjudant Piller' },
    entries: {
      [draftKey]: {
        file: `/audio/piller/${profile}/${draftKey}.mp3`,
        sha256: 'b'.repeat(64),
        bytes: 100,
      },
    },
  };
  delay = true;
  gate = new Promise<void>((r) => (release = r));
  const request = page.waitForRequest('**/audio/piller/manifest.json');
  await article.getByRole('button', { name: 'Écouter la réplique', exact: true }).click();
  await request;
  await dialog.getByRole('button', { name: 'Fermer', exact: true }).click();
  const response = page.waitForResponse('**/audio/piller/manifest.json');
  release();
  await response;
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  expect(await played()).toEqual([file]);
  expect(
    await page.evaluate(
      () => (window as unknown as { __voice: { native: string[] } }).__voice.native,
    ),
  ).toEqual([]);
  expect(voiceCalls).toBe(0);
  if(process.env.PILLER_CAPTURE==='1')await mkdir('.impeccable/review/piller-voice', { recursive: true });
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => document.fonts.ready);
    if(process.env.PILLER_CAPTURE==='1')await page.screenshot({
      path: `.impeccable/review/piller-voice/${width === 1440 ? 'desktop' : width === 320 ? 'mobile-320' : 'mobile'}.png`,
      fullPage: true,
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
  }
});
