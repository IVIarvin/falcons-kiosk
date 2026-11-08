import { expect, it } from 'vitest';
import { createTestDatabase } from '@/lib/db';
import { register } from '@/features/auth/service';
import { exportPillerVoices, getPillerLibrary, savePillerQuote } from '@/features/piller/service';
it('exporte les répliques actuelles avec leur activation, sans données de membres', async () => {
  const db = await createTestDatabase();
  try {
    const user = await register(db, {
      name: 'Responsable Secret',
      grade: 'Cpl',
      phone: '0795551234',
      password: 'falcons-password',
    });
    await expect(exportPillerVoices(db, user)).rejects.toThrow(/responsable/);
    user.role = 'admin';
    const [quote] = await getPillerLibrary(db, user);
    await savePillerQuote(db, user, {
      ...quote,
      text: 'Texte enregistré pour préparer la voix.',
      enabled: false,
    });
    const exported = await exportPillerVoices(db, user);
    expect(exported.version).toBe(1);
    expect(exported.quotes[0]).toEqual({
      id: quote.id,
      text: 'Texte enregistré pour préparer la voix.',
      enabled: false,
    });
    const body = JSON.stringify(exported);
    for (const secret of [user.phone, user.name, 'password_hash', 'revision', 'actor_id'])
      expect(body).not.toContain(secret);
  } finally {
    await db.close();
  }
});
