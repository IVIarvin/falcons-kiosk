import { expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { buildCatalogPdf, buildAccessPdf, toCsv } from '@/features/documents/service';
it('produit un catalogue A4 paginé avec caractères français', async () => {
  const pdf = await buildCatalogPdf(
    Array.from({ length: 100 }, (_, i) => ({
      name: `Thé pêche ${i}`,
      unit: '50 cl',
      category: 'Boissons',
      priceCents: 250,
      available: i % 2 === 0,
    })),
  );
  const doc = await PDFDocument.load(pdf);
  expect(doc.getPageCount()).toBeGreaterThan(1);
  expect(doc.getPage(0).getSize().width).toBeCloseTo(595.28, 0);
});
it('refuse une fausse URL et crée une affiche QR à partir de l’adresse HTTPS', async () => {
  await expect(buildAccessPdf('')).rejects.toThrow(/adresse|URL/);
  await expect(buildAccessPdf('http://localhost:3000')).rejects.toThrow(/HTTPS/);
  expect(
    (await PDFDocument.load(await buildAccessPdf('https://falcons.example.org/'))).getPageCount(),
  ).toBe(1);
});
it('neutralise les formules dans un export CSV', () => {
  expect(toCsv(['nom'], [['=SUM(A1:A2)']])).toContain("'=SUM(A1:A2)");
  expect(toCsv(['nom'], [['Martin; Dubois']])).toContain('"Martin; Dubois"');
});
