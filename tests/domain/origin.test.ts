import { expect, it } from 'vitest';
import { sameOrigin } from '@/lib/origin';
it('utilise l’hôte HTTP réel si Next normalise la requête en localhost', () => {
  expect(
    sameOrigin('http://127.0.0.1:3010', 'http://localhost:3010/api/action', '127.0.0.1:3010'),
  ).toBe(true);
});
it('refuse origine manquante, autre domaine et autre protocole', () => {
  expect(sameOrigin(null, 'https://falcons.test/api/action', 'falcons.test')).toBe(false);
  expect(sameOrigin('https://evil.test', 'https://falcons.test/api/action', 'falcons.test')).toBe(
    false,
  );
  expect(sameOrigin('http://falcons.test', 'https://falcons.test/api/action', 'falcons.test')).toBe(
    false,
  );
});
