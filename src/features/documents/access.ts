import QRCode from 'qrcode';
import { assert } from '@/lib/errors';
import { brand, createPrintDocument, drawText, footer, pageSize, palette, wrap } from './layout';

export async function buildAccessPdf(canonicalUrl: string): Promise<Uint8Array> {
  assert(canonicalUrl, 'Configure l’adresse publique du kiosque avant de générer le QR.');
  let url: URL;
  try {
    url = new URL(canonicalUrl);
  } catch {
    throw new Error('URL du kiosque invalide.');
  }
  assert(url.protocol === 'https:', 'L’adresse du kiosque doit utiliser HTTPS.');
  assert(
    !url.username && !url.password && !url.hash && !url.search,
    'Utilise une adresse publique sans identifiant ni paramètre.',
  );
  const { pdf, fonts } = await createPrintDocument('Falcons - Accès au kiosque');
  const page = pdf.addPage([pageSize.width, pageSize.height]);
  page.drawRectangle({ x: 0, y: 602, width: pageSize.width, height: 240, color: palette.dark });
  brand(page, fonts);
  drawText(page, fonts.display, 'Le kiosque,', 40, 722, 45, palette.white);
  drawText(page, fonts.display, 'dans ta poche.', 40, 675, 45, palette.white);
  drawText(page, fonts.body, 'Scanne pour ouvrir.', 40, 643, 14, palette.accent);
  const qr = await QRCode.toBuffer(url.href, {
    type: 'png',
    width: 1400,
    margin: 4,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#ffffff' },
  });
  const image = await pdf.embedPng(qr);
  page.drawRectangle({
    x: 107.64,
    y: 236,
    width: 380,
    height: 380,
    color: palette.white,
    borderColor: palette.line,
    borderWidth: 0.7,
  });
  page.drawImage(image, { x: 119.64, y: 248, width: 356, height: 356 });
  let address = wrap(url.href.replace(/^https:\/\//, '').replace(/\/$/, ''), fonts.strong, 14, 475);
  if (address.length > 3)
    address = [...wrap(url.host, fonts.strong, 14, 475), 'Adresse complète dans le QR.'];
  address.forEach((line, i) =>
    drawText(
      page,
      fonts.strong,
      line,
      (pageSize.width - fonts.strong.widthOfTextAtSize(line, 14)) / 2,
      204 - i * 19,
      14,
    ),
  );
  const instruction = 'Choisis tes produits. Valide ton ardoise.';
  drawText(
    page,
    fonts.body,
    instruction,
    (pageSize.width - fonts.body.widthOfTextAtSize(instruction, 14)) / 2,
    112,
    14,
  );
  footer(page, fonts);
  return pdf.save();
}
